import { SERVICE_URLS } from '../config/services.js';

export interface TokenVerificationResult {
  valid: boolean;
  userId?: number;
  userName?: string;
  role?: string;
  error?: string;
}

/**
 * Verify token with UserService
 */
export async function verifyTokenWithUserService(token: string): Promise<TokenVerificationResult> {
  try {
    const response = await fetch(`${SERVICE_URLS.USER_SERVICE}/api/users/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return {
        valid: false,
        error: response.status === 401 ? 'Invalid token' : 'Token verification failed'
      };
    }

    const data = await response.json();
    return {
      valid: true,
      userId: data.userId,
      userName: data.userName,
      role: data.role || 'user'
    };
  } catch (error) {
    console.error('Error verifying token with UserService:', error);
    return {
      valid: false,
      error: 'UserService unavailable'
    };
  }
}
