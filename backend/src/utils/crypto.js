const crypto = require('crypto');
const { env } = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a string using AES-256-GCM
 */
function encrypt(text) {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'utf-8').subarray(0, 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 */
function decrypt(encryptedText) {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'utf-8').subarray(0, 32);
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a random API key (pure cryptographically secure random string, no fixed format)
 */
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash an API key using SHA256
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Get the prefix of an API key (first 8 chars)
 */
function getApiKeyPrefix(apiKey) {
  return apiKey.substring(0, 8);
}

module.exports = {
  encrypt,
  decrypt,
  generateApiKey,
  hashApiKey,
  getApiKeyPrefix,
};
