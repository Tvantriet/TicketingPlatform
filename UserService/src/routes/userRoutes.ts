import { Router } from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  getUserById,
  getUsers,
  updateUser,
  getUserAuditLogs,
  requestAccountDeletion
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);
router.put('/me', authenticateToken, updateUser);
router.get('/:id', authenticateToken, getUserById);
router.get('/', authenticateToken, getUsers);
router.get('/:id/audit-logs', authenticateToken, getUserAuditLogs);

// GDPR route
router.delete('/me/gdpr', authenticateToken, requestAccountDeletion);

export default router;
