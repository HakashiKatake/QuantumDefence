import jwt from 'jsonwebtoken';

export function authenticateToken(roles = []) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'AuthError', message: 'Token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, error: 'AuthError', message: 'Token is invalid or expired' });
      }

      req.user = decoded;

      // Role authorization
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ success: false, error: 'AuthError', message: `Required role(s): ${roles.join(', ')}` });
      }

      next();
    });
  };
}
