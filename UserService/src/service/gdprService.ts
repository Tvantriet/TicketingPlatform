import prisma from '../db/prisma.js';
import { sendMessage } from '../messaging/sender.js';
import { ROUTING_KEYS } from '../messaging/messagingConfig.js';

export interface GdprDeletionResult {
    success: boolean;
    userId: number;
    deletedData: {
        userDeleted: boolean;
        auditLogsAnonymized: number;
    };
    error?: string;
}

/**
 * GDPR "Right to be Forgotten" deletion
 * Broadcasts deletion to other services via RabbitMQ, then deletes locally
 */
export async function deleteUserData(userId: number): Promise<GdprDeletionResult> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
        return {
            success: false,
            userId,
            deletedData: { userDeleted: false, auditLogsAnonymized: 0 },
            error: 'User not found'
        };
    }

    // Broadcast deletion request to other services
    try {
        await sendMessage({
            userId: userId.toString(),
            requestedAt: new Date().toISOString(),
        }, ROUTING_KEYS.USER_DELETION_REQUEST);
    } catch (err) {
        console.error('Failed to broadcast deletion request:', err);
        // Continue with local deletion anyway
    }

    // Execute local deletion immediately
    try {
        // Anonymize audit logs (keep for security but remove PII)
        const auditLogResult = await prisma.auditLog.updateMany({
            where: { userId },
            data: {
                userId: null,
                attemptedUsername: null,
                attemptedEmail: null,
                ipAddress: null,
                userAgent: null,
            }
        });

        // Delete the user record
        await prisma.user.delete({
            where: { id: userId }
        });

        console.log(`GDPR deletion completed for user ${userId}`);

        return {
            success: true,
            userId,
            deletedData: {
                userDeleted: true,
                auditLogsAnonymized: auditLogResult.count
            }
        };
    } catch (error: any) {
        console.error(`Error during GDPR deletion for user ${userId}:`, error);
        return {
            success: false,
            userId,
            deletedData: { userDeleted: false, auditLogsAnonymized: 0 },
            error: error.message
        };
    }
}
