/**
 * Polyfills for browser compatibility (specifically mobile Safari, older Chrome Android, and WebViews)
 * Addresses ECMAScript 2024 proposals such as Uint8Array.prototype.toHex()
 */

// 1. Polyfill Uint8Array.prototype.toHex if missing
if (typeof Uint8Array !== "undefined" && typeof (Uint8Array.prototype as any).toHex !== "function") {
  Object.defineProperty(Uint8Array.prototype, "toHex", {
    value: function toHex(): string {
      const hexChars = "0123456789abcdef";
      let hex = "";
      for (let i = 0; i < this.length; i++) {
        const byte = this[i];
        hex += hexChars[(byte >> 4) & 0x0f] + hexChars[byte & 0x0f];
      }
      return hex;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// 2. Helper utility for safe byte-to-hex conversion in application code
export function bytesToHex(bytes: Uint8Array): string {
  if (typeof (bytes as any).toHex === "function") {
    return (bytes as any).toHex();
  }
  const hexChars = "0123456789abcdef";
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    hex += hexChars[(byte >> 4) & 0x0f] + hexChars[byte & 0x0f];
  }
  return hex;
}
