import { Booking, BookingStatus } from '@prisma/client';
export interface CreateBookingData {
    ticketId: number;
    userId: string;
    amount: number;
}
export declare const createBooking: (data: CreateBookingData) => Promise<Booking>;
export declare const submitPayment: (bookingId: string, paymentDetails: any) => Promise<Booking>;
export declare const getBookingByBookingId: (bookingId: string) => Promise<Booking | null>;
export declare const updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<Booking>;
export declare const completeBooking: (bookingId: string, success: boolean) => Promise<void>;
export declare const getBookingsByUser: (userId: string) => Promise<Booking[]>;
export declare const expireOldBookings: () => Promise<number>;
export declare const getPendingExpiredBookings: () => Promise<Booking[]>;
//# sourceMappingURL=bookingService.d.ts.map