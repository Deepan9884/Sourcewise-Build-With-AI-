/**
 * Encryption utils — AES-256-GCM for OAuth tokens and secrets.
 * Uses ENCRYPTION_KEY (32-byte base64). Falls back to no-op with warning
 * if not configured so local dev keeps working.
 */
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length !== 32) {
      console.warn('[Encryption] ENCRYPTION_KEY must decode to 32 bytes; ignoring.');
      return null;
    }
    return buf;
  } catch (e) {
    console.warn('[Encryption] Invalid ENCRYPTION_KEY:', e.message);
    return null;
  }
}

/** Encrypt UTF-8 string → "iv:ciphertext:authTag" (all base64). */
function encrypt(text) {
  if (text == null) return null;
  const key = getKey();
  if (!key) return `plain:${text}`; // dev fallback, flagged by prefix
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${enc.toString('base64')}:${tag.toString('base64')}`;
}

/** Decrypt value produced by encrypt(). */
function decrypt(payload) {
  if (payload == null) return null;
  if (String(payload).startsWith('plain:')) return String(payload).slice(6);
  const key = getKey();
  if (!key) throw new Error('ENCRYPTION_KEY not configured — cannot decrypt');
  const [ivB64, encB64, tagB64] = String(payload).split(':');
  if (!ivB64 || !encB64 || !tagB64) throw new Error('Malformed encrypted payload');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}

function isConfigured() {
  return !!getKey();
}

module.exports = { encrypt, decrypt, isConfigured };
