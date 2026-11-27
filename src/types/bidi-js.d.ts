declare module 'bidi-js' {
  export interface EmbeddingLevelsResult {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }

  export interface BidiInstance {
    getEmbeddingLevels(
      string: string,
      dir?: 'ltr' | 'rtl' | 'auto',
    ): EmbeddingLevelsResult;
    getReorderedString(
      string: string,
      embeddingLevelsResult: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): string;
    getReorderSegments(
      string: string,
      embeddingLevelsResult: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): [number, number][];
    getMirroredCharactersMap(
      string: string,
      embeddingLevels: Uint8Array,
      start?: number,
      end?: number,
    ): Map<number, string>;
  }

  export default function bidiFactory(): BidiInstance;
}
