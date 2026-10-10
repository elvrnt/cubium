export interface Session {
  id: string;
  name: string;
  event: '333';
  createdAt: string;
  archivedAt: string | null;
}

export const MAX_SESSION_NAME_LENGTH = 80;
export function normalizeSessionName(name: string): string {
  const normalized = name.trim();
  if (!normalized || normalized.length > MAX_SESSION_NAME_LENGTH)
    throw new RangeError('Session name must contain 1–80 characters');
  return normalized;
}

export function orderSessions(sessions: readonly Session[]): Session[] {
  return [...sessions].sort(
    (a, b) =>
      Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
