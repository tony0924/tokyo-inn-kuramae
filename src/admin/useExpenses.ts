import { useCallback, useEffect, useState } from "react";
import { watchExpenses } from "@/lib/expenses";
import type { Expense } from "@/types";
export function useExpenses(year: string | null) {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const [state, setState] = useState<{
    key: string | null;
    items: Expense[];
    loading: boolean;
    error: string | null;
  }>({ key: year, items: [], loading: true, error: null });
  useEffect(() => {
    setState({ key: year, items: [], loading: true, error: null });
    return watchExpenses(
      year,
      (items) => setState({ key: year, items, loading: false, error: null }),
      (message) =>
        setState({
          key: year,
          items: [],
          loading: false,
          error: message ?? "支出載入失敗，請重新整理後再試。",
        }),
    );
  }, [year, attempt]);
  return {
    ...(state.key === year ? state : { items: [], loading: true, error: null }),
    retry,
  };
}
