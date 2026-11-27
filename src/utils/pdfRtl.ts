import bidiFactory from 'bidi-js';
import type { jsPDF } from 'jspdf';
import { DEJAVU_SANS_BOLD_B64, DEJAVU_SANS_NORMAL_B64 } from '../assets/fonts/dejavuFonts';

const bidi = bidiFactory();

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const BIDI_CONTROL_REGEX = /[\u202A-\u202E\u2066-\u2069]/g;

/**
 * Prevents jsPDF's internal bidiEngineFunction from running a second UBA pass
 * or symmetric bracket swapping on strings already shaped and visually ordered
 * for DejaVuSans rendering.
 */
export const PDF_RAW_TEXT_OPTIONS = {
  isInputVisual: true,
  isOutputVisual: true,
  isInputRtl: false,
  isOutputRtl: false,
  isSymmetricSwapping: false,
} as const;

/**
 * In DejaVuSans metrics, \u2066/\u2069 (LRI/PDI) have non-zero glyph advance (~2.12mm),
 * whereas \u202A/\u202C (LRE/PDF) have zero advance. Convert isolates to LRE/PDF before
 * shaping and splitTextToSize/AutoTable wrapping so line breaks are measured accurately.
 */
function toLreForMeasurement(text: string): string {
  return String(text ?? '')
    .replace(/\u2066/g, '\u202A')
    .replace(/\u2069/g, '\u202C');
}

export function registerArabicFont(doc: jsPDF): void {
  doc.addFileToVFS('DejaVuSans.ttf', DEJAVU_SANS_NORMAL_B64);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'italic');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', DEJAVU_SANS_BOLD_B64);
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
}

export function containsArabic(text: string): boolean {
  return ARABIC_CHAR_REGEX.test(text);
}

function shapeArabicLogical(doc: jsPDF, text: string): string {
  const processArabic = (doc as unknown as { processArabic?: (s: string) => string }).processArabic;
  if (typeof processArabic === 'function') {
    return processArabic.call(doc, text);
  }
  return text;
}

/**
 * Propagates active LRE (\u202A ... \u202C) embeddings across already line-wrapped segments
 * so multi-line technical snippets remain ordered left-to-right on continuation lines.
 */
function propagateLreAcrossLines(lines: string[]): string[] {
  let openCount = 0;
  return lines.map((line) => {
    const prefix = openCount > 0 ? '\u202A'.repeat(openCount) : '';
    let current = openCount;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '\u202A') current++;
      else if (ch === '\u202C' && current > 0) current--;
    }
    const suffix = current > 0 ? '\u202C'.repeat(current) : '';
    openCount = current;
    return `${prefix}${line}${suffix}`;
  });
}

/**
 * Converts a single logical-order line (already Arabic-shaped) into visual LTR order
 * for PDF rendering with doc.setR2L(false) + PDF_RAW_TEXT_OPTIONS.
 */
export function toVisualRtlLine(shapedLogicalLine: string): string {
  if (!shapedLogicalLine) return '';
  // Pure LTR/neutral lines without Arabic characters stay strictly LTR
  const hasArabic = containsArabic(shapedLogicalLine);
  if (!hasArabic) {
    return shapedLogicalLine.replace(BIDI_CONTROL_REGEX, '');
  }
  // Convert LRE/PDF markers to true UBA LRI/PDI isolates for bidi-js ordering so
  // adjacent isolated LTR tokens never merge across Arabic punctuation/spaces.
  const isolated = shapedLogicalLine
    .replace(/\u202A/g, '\u2066')
    .replace(/\u202C/g, '\u2069');
  const levels = bidi.getEmbeddingLevels(isolated, 'rtl');
  const reordered = bidi.getReorderedString(isolated, levels);
  return reordered.replace(BIDI_CONTROL_REGEX, '');
}

/**
 * Shapes Arabic glyphs in logical order, wraps to maxWidthMm using DejaVuSans metrics,
 * propagates open LTR embeddings, and reorders each wrapped line visually for RTL rendering.
 */
export function prepareRtlLines(doc: jsPDF, text: string, maxWidthMm?: number): string[] {
  const normalized = toLreForMeasurement(text);
  const paragraphs = normalized.split('\n');
  const result: string[] = [];

  for (const para of paragraphs) {
    if (!para) {
      result.push('');
      continue;
    }
    const shapedPara = shapeArabicLogical(doc, para);
    const wrapped =
      typeof maxWidthMm === 'number' && maxWidthMm > 0
        ? (doc.splitTextToSize(shapedPara, maxWidthMm) as string[])
        : [shapedPara];
    const balanced = propagateLreAcrossLines(wrapped);
    for (const line of balanced) {
      result.push(toVisualRtlLine(line));
    }
  }
  return result;
}

/**
 * Shapes and visually reorders a single short line (e.g., heading or header metadata) for RTL PDF drawing.
 */
export function prepareRtlSingleLine(doc: jsPDF, text: string): string {
  return prepareRtlLines(doc, text).join(' ');
}

/**
 * Applies Arabic shaping in logical order BEFORE jspdf-autotable wraps cell lines,
 * preserving zero-width \u202A/\u202C markers for post-wrap BiDi reordering.
 */
export function shapeCellTextForAutoTable(doc: jsPDF, rawLines: string[]): string[] {
  return rawLines.map((line) => shapeArabicLogical(doc, toLreForMeasurement(line)));
}

/**
 * Reorders already-wrapped autoTable cell lines into visual LTR order right before drawing.
 */
export function finalizeRtlAutoTableLines(wrappedShapedLines: string[]): string[] {
  const balanced = propagateLreAcrossLines(wrappedShapedLines);
  return balanced.map((line) => toVisualRtlLine(line));
}
