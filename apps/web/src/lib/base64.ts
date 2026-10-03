/**
 * Base64URL encoding (RFC 4648 §5) - URL-safe base64 encoding
 * Replaces + with -, / with _, and removes padding =
 */
export function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64URL decoding - converts URL-safe base64 back to Buffer
 */
export function base64URLDecode(str: string): Buffer {
  // Add padding if needed
  let padded = str.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) {
    padded += '=';
  }
  return Buffer.from(padded, 'base64');
}
