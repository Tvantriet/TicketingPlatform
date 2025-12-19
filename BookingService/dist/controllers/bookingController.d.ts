import { Request, Response } from 'express';
export declare function createBooking(req: Request, res: Response): Promise<void>;
export declare function submitPayment(req: Request, res: Response): Promise<void>;
export declare function getBookingStatus(req: Request, res: Response): Promise<void>;
export declare function handlePaymentResult(bookingId: string, status: 'confirmed' | 'failed'): Promise<void>;
//# sourceMappingURL=bookingController.d.ts.map