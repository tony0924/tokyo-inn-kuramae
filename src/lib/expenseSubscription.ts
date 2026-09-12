/** Keep an authenticated fallback alive when a mobile realtime stream cannot reconnect. */
export function resilientExpenseSubscription<T>(options: {
  listen: (
    next: (items: T[]) => void,
    failed: (error: unknown) => void,
  ) => () => void;
  fetch: () => Promise<T[]>;
  next: (items: T[]) => void;
  failed: (error: unknown) => void;
  timeoutMs?: number;
  pollMs?: number;
}) {
  let stopped = false;
  let fallback = false;
  let inFlight = false;
  let generation = 0;
  let poll: ReturnType<typeof setTimeout> | undefined;
  const timeout = setTimeout(() => {
    fallback = true;
    void fetchNow();
  }, options.timeoutMs ?? 12000);
  async function fetchNow() {
    if (stopped || !fallback || inFlight) return;
    inFlight = true;
    const startedGeneration = generation;
    try {
      const items = await options.fetch();
      if (!stopped && fallback && generation === startedGeneration)
        options.next(items);
    } catch (error) {
      if (!stopped && fallback && generation === startedGeneration)
        options.failed(error);
    } finally {
      inFlight = false;
      if (!stopped && fallback) {
        clearTimeout(poll);
        poll = setTimeout(() => void fetchNow(), options.pollMs ?? 30000);
      }
    }
  }
  const unsub = options.listen(
    (items) => {
      if (stopped) return;
      generation++;
      fallback = false;
      clearTimeout(timeout);
      clearTimeout(poll);
      options.next(items);
    },
    () => {
      if (stopped) return;
      clearTimeout(timeout);
      fallback = true;
      void fetchNow();
    },
  );
  return {
    refresh: () => {
      if (!stopped) {
        fallback = true;
        clearTimeout(poll);
        void fetchNow();
      }
    },
    stop: () => {
      stopped = true;
      clearTimeout(timeout);
      clearTimeout(poll);
      unsub();
    },
  };
}
