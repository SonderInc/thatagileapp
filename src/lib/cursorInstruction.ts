/**
 * Cursor instruction block: stored in WorkItem.description (and optionally metadata.cursorInstruction).
 * Canonical format: header "CURSOR INSTRUCTION", next line "==================", content, closing "==================".
 */

const HEADER_LINE = 'CURSOR INSTRUCTION';
const DELIMITER_LINE = '==================';

/**
 * Extract the Cursor instruction block from description.
 * Returns the entire block from "CURSOR INSTRUCTION" line through the closing delimiter line (inclusive), or null.
 */
export function extractCursorInstruction(description: string | undefined | null): string | null {
  if (description == null || typeof description !== 'string') return null;
  const lines = description.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === HEADER_LINE) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === DELIMITER_LINE) {
      end = i;
      break;
    }
  }
  if (end < 0) return null;
  return lines.slice(start, end + 1).join('\n');
}

/**
 * Return description with exactly one Cursor instruction block.
 * If block is empty/null, returns desc unchanged (does not remove existing block).
 * If block is present: if desc already contains the block, return desc; otherwise append block with blank line.
 */
export function ensureCursorInstruction(
  desc: string | undefined | null,
  block: string | undefined | null
): string {
  const d = desc ?? '';
  if (!block || typeof block !== 'string' || !block.trim()) return d;
  const trimmed = block.trim();
  if (extractCursorInstruction(d) !== null) return d;
  return d ? `${d}\n\n${trimmed}` : trimmed;
}
