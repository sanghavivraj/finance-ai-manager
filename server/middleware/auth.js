import jwt from 'jsonwebtoken';

// Read JWT_SECRET at request time (after dotenv has loaded), not at module evaluation time.
// Module-level throws fire before dotenv.config() runs in ES modules.
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set in environment variables.');
  return secret;
};

export const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authenticateToken = auth;
export default auth;