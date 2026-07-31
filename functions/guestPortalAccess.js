export function normalizeGuestAccessCode(value) {
  return typeof value === "string"
    ? value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 32)
    : "";
}

export function isGuestAccessCurrentlyValid(access, nowMillis = Date.now()) {
  return Boolean(
    access
    && access.active === true
    && access.startsAt?.toMillis
    && access.expiresAt?.toMillis
    && access.startsAt.toMillis() <= nowMillis
    && access.expiresAt.toMillis() > nowMillis
  );
}
