export const VALID_LAWD_PREFIXES = new Set([
  "11", "26", "27", "28", "29", "30", "31", "36", "41", "42", "43", "44", "45", "46", "47", "48", "50", "51", "52",
]);

export function normalizeLawdCode(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 5 || !VALID_LAWD_PREFIXES.has(digits.slice(0, 2))) return null;
  return digits;
}

export function lawdCodeFromBcode(bcode: string): string | null {
  return normalizeLawdCode(bcode.slice(0, 5));
}
