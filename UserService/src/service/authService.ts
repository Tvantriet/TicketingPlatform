import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../db/prisma.js';
import { logLoginFailure } from './auditLogService.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface LoginCredentials {
  userName?: string;
  email?: string;
  password: string;
}

export interface RegisterData {
  userName: string;
  email?: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    userName: string;
    email: string | null;
  };
  error?: string;
}

/**
 * Hash a password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(userId: number, userName: string): string {
  return jwt.sign(
    { userId, userName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as SignOptions
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { userId: number; userName: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; userName: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<AuthResult> {
  try {
    // Check if username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { userName: data.userName },
          ...(data.email ? [{ email: data.email }] : [])
        ]
      }
    });

    if (existingUser) {
      return {
        success: false,
        error: existingUser.userName === data.userName
          ? 'Username already exists'
          : 'Email already exists'
      };
    }

    // Hash password
    const hash = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        userName: data.userName,
        email: data.email || null,
        hash,
        salt: hash.substring(0, 29) // Store first part of hash as salt reference
      }
    });

    // Generate token
    const token = generateToken(user.id, user.userName);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        userName: user.userName,
        email: user.email
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed'
    };
  }
}

/**
 * Login user with username/email and password
 */
export async function login(
  credentials: LoginCredentials,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResult> {
  try {
    const { userName, email, password } = credentials;

    if (!userName && !email) {
      return {
        success: false,
        error: 'Username or email required'
      };
    }

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(userName ? [{ userName }] : []),
          ...(email ? [{ email }] : [])
        ]
      }
    });

    if (!user) {
      // Log failed login attempt
      await logLoginFailure({
        attemptedUsername: userName,
        attemptedEmail: email,
        reason: 'User not found',
        ipAddress,
        userAgent
      });

      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.hash);

    if (!isValidPassword) {
      // Log failed login attempt
      await logLoginFailure({
        userId: user.id,
        attemptedUsername: userName || user.userName,
        attemptedEmail: email || user.email || undefined,
        reason: 'Invalid password',
        ipAddress,
        userAgent
      });

      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Generate token
    const token = generateToken(user.id, user.userName);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        userName: user.userName,
        email: user.email
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    };
  }
}
