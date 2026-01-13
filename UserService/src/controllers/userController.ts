import { Request, Response } from 'express';
import { register, login } from '../service/authService.js';
import * as userService from '../service/userService.js';
import { registerSchema, loginSchema, updateUserSchema } from '../utils/validation.js';

/**
 * Register a new user
 */
export async function registerUser(req: Request, res: Response) {
  try {
    const validated = registerSchema.parse(req.body);
    const result = await register(validated);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({
      message: 'User registered successfully',
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Login user
 */
export async function loginUser(req: Request, res: Response) {
  try {
    const validated = loginSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await login(validated, ipAddress, userAgent);

    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    return res.json({
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = (req as any).userId; // Set by auth middleware
    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      userName: user.userName,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user by ID
 */
export async function getUserById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      userName: user.userName,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get all users (paginated)
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = Math.min(parseInt(req.query.take as string) || 50, 100);

    const result = await userService.getUsers(skip, take);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update user
 */
export async function updateUser(req: Request, res: Response) {
  try {
    const userId = (req as any).userId; // Set by auth middleware
    const validated = updateUserSchema.parse(req.body);

    const user = await userService.updateUser(userId, validated);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      userName: user.userName,
      email: user.email,
      updatedAt: user.updatedAt
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user audit logs
 */
export async function getUserAuditLogs(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const logs = await userService.getUserAuditLogs(userId, limit);
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
