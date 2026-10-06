export interface Scramble {
  readonly event: '333';
  readonly notation: string;
}

export interface ScrambleGenerator {
  generate333(): Promise<Scramble>;
}
