import prisma from '../db/prisma.js';
import { AuditEventType } from '@prisma/client';

export interface CreateAuditLogData {
  userId?: number;
  eventType: AuditEventType;
  attemptedUsername?: string;
  attemptedEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: CreateAuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        eventType: data.eventType,
        attemptedUsername: data.attemptedUsername ?? null,
        attemptedEmail: data.attemptedEmail ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        reason: data.reason ?? null
      }
    });
  } catch (error) {
    // Log error but don't throw - audit logging shouldn't break the main flow
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Log failed login attempt
 */
export async function logLoginFailure(
  data: {
    userId?: number;
    attemptedUsername?: string;
    attemptedEmail?: string;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  await createAuditLog({
    userId: data.userId,
    eventType: AuditEventType.LOGIN_FAILED,
    attemptedUsername: data.attemptedUsername,
    attemptedEmail: data.attemptedEmail,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    reason: data.reason
  });
}
