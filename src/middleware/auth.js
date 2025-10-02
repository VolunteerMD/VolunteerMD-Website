import jwt from 'jsonwebtoken';
import config from '../config.js';

const COOKIE_NAME = 'vm_token';

export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure
  });
}

export function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const userId = Number(decoded.sub);
    if (!Number.isFinite(userId)) {
      throw new Error('Invalid token payload');
    }
    req.user = { id: userId, email: decoded.email };
  } catch (err) {
    req.user = null;
  }
  return next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
}

export const authHelpers = {
  COOKIE_NAME,
  signToken,
  setAuthCookie,
  clearAuthCookie
};
