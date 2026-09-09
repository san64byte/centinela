export interface PasswordGeneratorOptions {
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

/**
 * Menghasilkan kata sandi acak yang aman secara kriptografi
 * menggunakan Web Crypto API (crypto.getRandomValues).
 */
export function generateSecurePassword(
  length = 16,
  options: PasswordGeneratorOptions = {
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  },
): string {
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charSet = '';
  const mandatoryChars: string[] = [];

  if (options.lowercase ?? true) {
    charSet += lowercaseChars;
    const randomByte = globalThis.crypto.getRandomValues(new Uint8Array(1))[0];
    mandatoryChars.push(lowercaseChars[randomByte % lowercaseChars.length]);
  }
  if (options.uppercase ?? true) {
    charSet += uppercaseChars;
    const randomByte = globalThis.crypto.getRandomValues(new Uint8Array(1))[0];
    mandatoryChars.push(uppercaseChars[randomByte % uppercaseChars.length]);
  }
  if (options.numbers ?? true) {
    charSet += numberChars;
    const randomByte = globalThis.crypto.getRandomValues(new Uint8Array(1))[0];
    mandatoryChars.push(numberChars[randomByte % numberChars.length]);
  }
  if (options.symbols ?? true) {
    charSet += symbolChars;
    const randomByte = globalThis.crypto.getRandomValues(new Uint8Array(1))[0];
    mandatoryChars.push(symbolChars[randomByte % symbolChars.length]);
  }

  if (!charSet) charSet = lowercaseChars + uppercaseChars + numberChars + symbolChars;

  const result: string[] = [...mandatoryChars];
  const remainingLength = Math.max(0, length - mandatoryChars.length);
  const randomBytes = globalThis.crypto.getRandomValues(new Uint8Array(remainingLength));

  for (let i = 0; i < remainingLength; i++) {
    result.push(charSet[randomBytes[i] % charSet.length]);
  }

  // Shuffle securely menggunakan Fisher-Yates
  for (let i = result.length - 1; i > 0; i--) {
    const j = globalThis.crypto.getRandomValues(new Uint8Array(1))[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}
