import prisma from '../db/prisma.js';
import { Booking, BookingStatus } from '@prisma/client';
import { sendMessage } from '../messaging/sender.js';
import { ROUTING_KEYS } from '../messaging/messagingConfig.js';

export interface CreateBookingData {
  ticketId: number;
  userId: string;
  amount: number;
}

async function releaseTicketViaMessage(ticketId: number, reason: string) {
  try {
    await sendMessage({
      ticketId,
      reason,
      timestamp: new Date().toISOString(),
    }, ROUTING_KEYS.TICKET_RELEASE);
    console.log(`Sent ticket release message for ticket ${ticketId}`);
  } catch (error) {
    console.error(`Error sending ticket release message for ${ticketId}:`, error);
  }
}

// Step 1: Reserve ticket and create booking (no payment yet)
export const createBooking = async (data: CreateBookingData): Promise<Booking> => {
  const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Send message to reserve ticket in EventService
  await sendMessage({
    ticketId: data.ticketId,
    bookingId,
    timestamp: new Date().toISOString(),
  }, ROUTING_KEYS.TICKET_RESERVE);
  
  // Create booking in database (no paymentDetails yet)
  const booking = await prisma.booking.create({
    data: {
      bookingId,
      ticketId: data.ticketId,
      userId: data.userId,
      amount: data.amount,
      status: BookingStatus.PENDING,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });
  
  // Expiration handled by cron job every minute
  
  return booking;
};

// Step 2: Submit payment details and send to PaymentService
export const submitPayment = async (bookingId: string, paymentDetails: any): Promise<Booking> => {
  const booking = await getBookingByBookingId(bookingId);
  
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.EXPIRED) {
    throw new Error(`Cannot submit payment for booking with status: ${booking.status}`);
  }
  
  const now = new Date();
  if (booking.expiresAt < now) {
    await updateBookingStatus(bookingId, BookingStatus.EXPIRED);
    await releaseTicketViaMessage(booking.ticketId, 'booking_expired');
    throw new Error('Booking has expired');
  }
  
  // Update booking with payment details
  const updatedBooking = await prisma.booking.update({
    where: { bookingId },
    data: { paymentDetails },
  });
  
  // Send payment request to PaymentService
  await sendMessage({
    bookingId,
    ticketId: booking.ticketId,
    userId: booking.userId,
    amount: booking.amount.toString(),
    paymentDetails,
  }, ROUTING_KEYS.PAYMENT_REQUEST);
  
  console.log(`Payment request sent for booking ${bookingId}`);
  
  return updatedBooking;
};

export const getBookingByBookingId = async (bookingId: string): Promise<Booking | null> => {
  return await prisma.booking.findUnique({
    where: { bookingId },
  });
};

export const updateBookingStatus = async (
  bookingId: string,
  status: BookingStatus
): Promise<Booking> => {
  const updateData: any = {
    status,
  };

  if (status === BookingStatus.CONFIRMED || status === BookingStatus.FAILED) {
    updateData.completedAt = new Date();
  }

  return await prisma.booking.update({
    where: { bookingId },
    data: updateData,
  });
};

export const completeBooking = async (bookingId: string, success: boolean): Promise<void> => {
  const booking = await getBookingByBookingId(bookingId);
  if (!booking) {
    console.error(`Booking ${bookingId} not found`);
    return;
  }
  
  const status = success ? BookingStatus.CONFIRMED : BookingStatus.FAILED;
  await updateBookingStatus(bookingId, status);
  
  // If payment failed, release the ticket
  if (!success) {
    await releaseTicketViaMessage(booking.ticketId, 'payment_failed');
  }
  
  console.log(`Booking ${bookingId} updated to ${status}`);
};

export const getBookingsByUser = async (userId: string): Promise<Booking[]> => {
  return await prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

export const expireOldBookings = async (): Promise<number> => {
  const now = new Date();

  const result = await prisma.booking.updateMany({
    where: {
      status: BookingStatus.PENDING,
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: BookingStatus.EXPIRED,
    },
  });

  return result.count;
};

export const getPendingExpiredBookings = async (): Promise<Booking[]> => {
  const now = new Date();

  return await prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING,
      expiresAt: {
        lt: now,
      },
    },
  });
};

