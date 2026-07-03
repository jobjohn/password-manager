export interface GeneratorOptions {
  length: number;
  useLowercase: boolean;
  useUppercase: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean;
}

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";
const AMBIGUOUS = new Set(["l", "I", "1", "O", "0"]);

function buildCharset(options: GeneratorOptions): string {
  let charset = "";
  if (options.useLowercase) charset += LOWERCASE;
  if (options.useUppercase) charset += UPPERCASE;
  if (options.useDigits) charset += DIGITS;
  if (options.useSymbols) charset += SYMBOLS;
  if (options.excludeAmbiguous) {
    charset = [...charset].filter((c) => !AMBIGUOUS.has(c)).join("");
  }
  return charset;
}

/**
 * Draws a uniformly distributed index in [0, max) using rejection sampling
 * over crypto.getRandomValues — avoids the modulo-bias that `byte % max`
 * would introduce (some remainders would be very slightly more likely).
 */
function randomIndex(max: number): number {
  const rejectionThreshold = 256 - (256 % max);
  const bytes = new Uint8Array(1);
  let value: number;
  do {
    crypto.getRandomValues(bytes);
    value = bytes[0];
  } while (value >= rejectionThreshold);
  return value % max;
}

export function generatePassword(options: GeneratorOptions): string {
  const charset = buildCharset(options);
  if (charset.length === 0) {
    return "";
  }
  let result = "";
  for (let i = 0; i < options.length; i++) {
    result += charset[randomIndex(charset.length)];
  }
  return result;
}
