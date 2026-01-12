import prisma from '../db/prisma.js';
import { User } from '@prisma/client';

export interface CreateUserData {
  userName: string;
  email?: string;
  hash: string;
  salt: string;
}

export interface UpdateUserData {
  userName?: string;
  email?: string;
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
    include: {
      auditLogs: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    }
  });
}

/**
 * Get user by username
 */
export async function getUserByUsername(userName: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { userName }
  });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email }
  });
}

/**
 * Get all users (paginated)
 */
export async function getUsers(skip: number = 0, take: number = 50) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userName: true,
        email: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.user.count()
  ]);

  return {
    users,
    total,
    skip,
    take
  };
}

/**
 * Update user
 */
export async function updateUser(id: number, data: UpdateUserData): Promise<User | null> {
  return prisma.user.update({
    where: { id },
    data
  });
}

/**
 * Delete user
 */
export async function deleteUser(id: number): Promise<User> {
  return prisma.user.delete({
    where: { id }
  });
}

/**
 * Get user audit logs
 */
export async function getUserAuditLogs(userId: number, limit: number = 50) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}
