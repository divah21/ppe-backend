const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Short fingerprint of the stored password hash. v1 tokens carry it as `pv`, so any
 * password change or admin reset (v1 or v2) invalidates every v1 token already issued.
 */
const passwordVersion = (passwordHash) =>
  crypto.createHash('sha256').update(String(passwordHash || '')).digest('hex').slice(0, 16);

/**
 * Generate JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    { ...payload, typ: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(
    { ...payload, typ: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

/**
 * Verify JWT token. The `typ` claim keeps the two kinds apart even when both are
 * signed with the same secret (JWT_REFRESH_SECRET unset).
 */
const verifyToken = (token, isRefresh = false) => {
  try {
    const secret = isRefresh 
      ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
      : process.env.JWT_SECRET;
    
    const decoded = jwt.verify(token, secret);
    if (decoded.typ !== (isRefresh ? 'refresh' : 'access')) return null;
    return decoded;
  } catch (error) {
    return null;
  }
};

/** True when the token was issued for the user's current password. */
const matchesPasswordVersion = (decoded, passwordHash) =>
  typeof decoded?.pv === 'string' && decoded.pv === passwordVersion(passwordHash);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  passwordVersion,
  matchesPasswordVersion
};
