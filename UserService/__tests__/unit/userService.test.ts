import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Define mocks BEFORE jest.mock
const mockFindFirst = jest.fn<any>();
const mockFindUnique = jest.fn<any>();
const mockCreate = jest.fn<any>();
const mockHash = jest.fn<any>();
const mockCompare = jest.fn<any>();
const mockSign = jest.fn<any>();
const mockVerify = jest.fn<any>();
const mockLogLoginFailure = jest.fn<any>();

jest.mock('../../src/db/prisma.js', () => ({
  default: {
    user: {
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

jest.mock('bcrypt', () => ({
  hash: mockHash,
  compare: mockCompare,
}));

jest.mock('jsonwebtoken', () => ({
  sign: mockSign,
  verify: mockVerify,
}));

jest.mock('../../src/service/auditLogService.js', () => ({
  logLoginFailure: mockLogLoginFailure,
}));

import { register, login } from '../../src/service/authService.js';
import { getUserById } from '../../src/service/userService.js';
import prisma from '../../src/db/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as auditLogService from '../../src/service/auditLogService.js';

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

    mockFindFirst.mockResolvedValueOnce(existingUser);

    const result = await register({
      userName: 'testuser',
      email: 'new@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Username already exists');
    expect(prisma.user.create).not.toHaveBeenCalled();
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

    mockFindFirst.mockResolvedValueOnce(user);
    mockCompare.mockResolvedValueOnce(false);
    mockLogLoginFailure.mockResolvedValueOnce(undefined);

    const result = await login(
      { userName: 'testuser', password: 'wrongpassword' },
      '127.0.0.1',
      'test-agent'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
    expect(auditLogService.logLoginFailure).toHaveBeenCalledWith({
      userId: 1,
      attemptedUsername: 'testuser',
      attemptedEmail: 'test@example.com',
      reason: 'Invalid password',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });
    expect(jwt.sign).not.toHaveBeenCalled();
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

    mockFindUnique.mockResolvedValueOnce(mockUser);

    const result = await getUserById(1);

    expect(result).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
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
