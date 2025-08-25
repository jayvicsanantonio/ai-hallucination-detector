import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): string {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

export function verifyJWT(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.verify(token, secret) as JWTPayload;
}

export function decodeJWT(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
