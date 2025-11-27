import { Request, Response } from 'express';

export const testFunction = async (req: Request, res: Response): Promise<void> => {
    try {
        res.json({ message: 'Payment processed successfully' });
    } catch (error) {
        console.error('Error in testFunction:', error);
        res.status(500).json({ error: 'Failed to process test function' });
    }
};