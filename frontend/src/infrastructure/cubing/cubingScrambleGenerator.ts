import { randomScrambleForEvent } from 'cubing/scramble';
import type { ScrambleGenerator } from '../../domain/scramble';

export const cubingScrambleGenerator: ScrambleGenerator = {
  async generate333() {
    const alg = await randomScrambleForEvent('333');
    const notation = alg.toString();
    if (notation.trim().length === 0) {
      throw new Error('cubing.js returned an empty 3x3 scramble');
    }
    return { event: '333', notation };
  },
};
