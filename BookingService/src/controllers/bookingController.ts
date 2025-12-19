import { Request, Response } from 'express';
import * as bookingService from '../services/bookingService.js';

export async function createBooking(req: Request, res: Response): Promise<void> {
    try {
        const { ticketId, userId, amount } = req.body;
        
        if (!ticketId || !userId || !amount) {
            res.status(400).json({ error: 'Missing required fields: ticketId, userId, amount' });
            return;
        }
        
        const booking = await bookingService.createBooking({
            ticketId: parseInt(String(ticketId)),
            userId,
            amount: parseFloat(String(amount)),
        });
        
        res.status(201).json({
            bookingId: booking.bookingId,
            status: booking.status,
            expiresAt: booking.expiresAt,
            message: 'Booking created. Submit payment within 10 minutes.',
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        const message = error instanceof Error ? error.message : 'Failed to create booking';
        res.status(500).json({ error: message });
    }
}

export async function submitPayment(req: Request, res: Response): Promise<void> {
    try {
        const { bookingId } = req.params;
        const { paymentDetails } = req.body;
        
        if (!paymentDetails) {
            res.status(400).json({ error: 'Missing required field: paymentDetails' });
            return;
        }
        
        const booking = await bookingService.submitPayment(bookingId, paymentDetails);
        
        res.status(200).json({
            bookingId: booking.bookingId,
            status: booking.status,
            message: 'Payment submitted. Poll /bookings/:bookingId for payment status',
        });
    } catch (error) {
        console.error('Error submitting payment:', error);
        const message = error instanceof Error ? error.message : 'Failed to submit payment';
        res.status(500).json({ error: message });
    }
}

export async function getBookingStatus(req: Request, res: Response): Promise<void> {
    try {
        const { bookingId } = req.params;
        const booking = await bookingService.getBookingByBookingId(bookingId);
        
        if (!booking) {
            res.status(404).json({ error: 'Booking not found' });
            return;
        }
        
        res.json(booking);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
}

// Called by message handlers when payment completes/fails
export async function handlePaymentResult(bookingId: string, status: 'confirmed' | 'failed') {
    try {
        const success = status === 'confirmed';
        await bookingService.completeBooking(bookingId, success);
    } catch (error) {
        console.error(`Error handling payment result for ${bookingId}:`, error);
    }
}

