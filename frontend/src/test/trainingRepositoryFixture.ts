import { vi } from 'vitest';
import {
  normalizeSessionName,
  orderSessions,
  type Session,
} from '../domain/sessions';
import type { SolveRepository } from '../infrastructure/persistence/solveRepository';
import type { SessionMutation } from '../infrastructure/persistence/trainingRepository';

export function withSessions<T extends SolveRepository>(base: T) {
  let sessions: Session[] = [
    {
      id: 'test-main-session',
      name: 'Основная',
      event: '333',
      createdAt: '2026-10-01T00:00:00Z',
      archivedAt: null,
    },
  ];
  let activeSessionId = 'test-main-session';
  const loadSnapshot = vi.fn(async () => ({
    sessions: [...sessions],
    solves: await base.getAll(),
    activeSessionId,
  }));
  const mutateSession = vi.fn(async (mutation: SessionMutation) => {
    if (mutation.type === 'create') {
      sessions = [...sessions, mutation.session];
      activeSessionId = mutation.session.id;
    } else {
      const target = sessions.find((s) => s.id === mutation.id);
      if (!target) throw new Error('missing session');
      const remaining = orderSessions(sessions).filter(
        (s) => s.id !== target.id && s.archivedAt === null,
      );
      if (
        (mutation.type === 'archive' || mutation.type === 'delete') &&
        target.archivedAt === null &&
        !remaining.length
      )
        throw new Error('last session');
      switch (mutation.type) {
        case 'select':
          if (target.archivedAt !== null) throw new Error('archived');
          activeSessionId = target.id;
          break;
        case 'rename':
          sessions = sessions.map((s) =>
            s.id === target.id
              ? { ...s, name: normalizeSessionName(mutation.name) }
              : s,
          );
          break;
        case 'archive':
          sessions = sessions.map((s) =>
            s.id === target.id ? { ...s, archivedAt: mutation.archivedAt } : s,
          );
          if (activeSessionId === target.id) activeSessionId = remaining[0]!.id;
          break;
        case 'restore':
          sessions = sessions.map((s) =>
            s.id === target.id ? { ...s, archivedAt: null } : s,
          );
          break;
        case 'delete':
          for (const solve of await base.getAll())
            if (solve.sessionId === target.id) await base.delete(solve.id);
          sessions = sessions.filter((s) => s.id !== target.id);
          if (activeSessionId === target.id) activeSessionId = remaining[0]!.id;
      }
    }
    return loadSnapshot();
  });
  return Object.assign(base, { loadSnapshot, mutateSession });
}
