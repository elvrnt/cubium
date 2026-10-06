// @vitest-environment node
import { Alg } from 'cubing/alg';
import { randomScrambleForEvent } from 'cubing/scramble';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cubingScrambleGenerator } from './index';

vi.mock('cubing/scramble', () => ({ randomScrambleForEvent: vi.fn() }));
const generate = vi.mocked(randomScrambleForEvent);
beforeEach(() => {
  generate.mockReset();
});

describe('cubingScrambleGenerator', () => {
  it('requests 333 and converts the algorithm to application data', async () => {
    generate.mockResolvedValue(new Alg("R U R' U'"));
    const result = await cubingScrambleGenerator.generate333();
    expect(generate).toHaveBeenCalledExactlyOnceWith('333');
    expect(result).toEqual({ event: '333', notation: "R U R' U'" });
    expect(Object.keys(result).sort()).toEqual(['event', 'notation']);
  });

  it('preserves the non-empty notation supplied by the library exactly', async () => {
    const alg = new Alg('R U2');
    vi.spyOn(alg, 'toString').mockReturnValue(' R  U2 ');
    generate.mockResolvedValue(alg);
    expect((await cubingScrambleGenerator.generate333()).notation).toBe(
      ' R  U2 ',
    );
  });

  it.each(['', ' ', '\n\t'])('rejects empty output %j', async (notation) => {
    const alg = new Alg();
    vi.spyOn(alg, 'toString').mockReturnValue(notation);
    generate.mockResolvedValue(alg);
    await expect(cubingScrambleGenerator.generate333()).rejects.toThrow(
      'empty 3x3 scramble',
    );
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('propagates a generation error without retrying', async () => {
    const error = new Error('Worker failed');
    generate.mockRejectedValue(error);
    await expect(cubingScrambleGenerator.generate333()).rejects.toBe(error);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('creates independent results and never changes a previous scramble', async () => {
    generate
      .mockResolvedValueOnce(new Alg('R'))
      .mockResolvedValueOnce(new Alg('U2'));
    const first = Object.freeze(await cubingScrambleGenerator.generate333());
    const second = await cubingScrambleGenerator.generate333();
    expect(first).toEqual({ event: '333', notation: 'R' });
    expect(second).toEqual({ event: '333', notation: 'U2' });
    expect(second).not.toBe(first);
  });
});
