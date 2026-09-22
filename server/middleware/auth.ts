import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { User } from '../../src/types';
import { isPrivilegedAccount, isPlatformOwner } from '../utils/privileges';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  // Token is formatted as usr_<id>:<timestamp> or session signature
  const userId = token.split(':')[0];
  const database = db.get();
  const user = database.users.find(u => u.id === userId || (u.firebaseUid && u.firebaseUid === userId));

  if (user) {
    req.user = user;
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (!isPrivilegedAccount(req.user) && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  next();
}

export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !isPlatformOwner(req.user)) {
    return res.status(403).json({ error: 'Platform owner privileges required' });
  }
  next();
}
