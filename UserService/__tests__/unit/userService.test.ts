import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { register, login } from '../../src/service/authService.js';
import { getUserById } from '../../src/service/userService.js';
import prisma from '../../src/db/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as auditLogService from '../../src/service/auditLogService.js';

// Mock dependencies
jest.mock('../../src/db/prisma.js', () => ({
  default: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('../../src/service/auditLogService.js', () => ({
  logLoginFailure: jest.fn(),
}));

// Type assertions for mocks
const mockPrisma = prisma as unknown as {
  user: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};
const mockBcrypt = bcrypt as unknown as {
  hash: jest.Mock;
  compare: jest.Mock;
};
const mockJwt = jwt as unknown as {
  sign: jest.Mock;
  verify: jest.Mock;
};
const mockAuditLogService = auditLogService as unknown as {
  logLoginFailure: jest.Mock;
};

describe('UserService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject registration when username already exists', async () => {
    const existingUser = {
      id: 1,
      userName: 'testuser',
      email: 'test@example.com',
      hash: 'hashedpassword',
      salt: 'salt',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (mockPrisma.user.findFirst as any).mockResolvedValueOnce(existingUser);

    const result = await register({
      userName: 'testuser',
      email: 'new@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Username already exists');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('should reject login with invalid password and log failure', async () => {
    const user = {
      id: 1,
      userName: 'testuser',
      email: 'test@example.com',
      hash: '$2b$10$hashedpassword',
      salt: '$2b$10$hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (mockPrisma.user.findFirst as any).mockResolvedValueOnce(user);
    (mockBcrypt.compare as any).mockResolvedValueOnce(false);
    (mockAuditLogService.logLoginFailure as any).mockResolvedValueOnce(undefined);

    const result = await login(
      { userName: 'testuser', password: 'wrongpassword' },
      '127.0.0.1',
      'test-agent'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
    expect(mockAuditLogService.logLoginFailure).toHaveBeenCalledWith({
      userId: 1,
      attemptedUsername: 'testuser',
      attemptedEmail: 'test@example.com',
      reason: 'Invalid password',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });
    expect(mockJwt.sign).not.toHaveBeenCalled();
  });

  it('should return user with audit logs when found by ID', async () => {
    const mockUser = {
      id: 1,
      userName: 'testuser',
      email: 'test@example.com',
      hash: 'hashedpassword',
      salt: 'salt',
      createdAt: new Date(),
      updatedAt: new Date(),
      auditLogs: [
        {
          id: 1,
          userId: 1,
          eventType: 'LOGIN_FAILED',
          attemptedUsername: 'testuser',
          attemptedEmail: null,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          reason: 'Invalid password',
          createdAt: new Date(),
        },
      ],
    };

    (mockPrisma.user.findUnique as any).mockResolvedValueOnce(mockUser);

    const result = await getUserById(1);

    expect(result).toEqual(mockUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        auditLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  });
});
