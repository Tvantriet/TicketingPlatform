import { Request, Response } from 'express';

// No exposed rest endpoints besides a test and /heath check
export const testFunction = async (_req: Request, res: Response): Promise<void> => {
    try {
        res.json({ message: 'Payment processed successfully' });
    } catch (error) {
        console.error('Error in testFunction:', error);
        res.status(500).json({ error: 'Failed to process test function' });
    }
};