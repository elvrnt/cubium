import type { IdGenerator, DateProvider } from '../../application/timer';

export const cryptoIdGenerator: IdGenerator = {
  generate: () => crypto.randomUUID(),
};

export const systemDateProvider: DateProvider = {
  nowIso: () => new Date().toISOString(),
};
