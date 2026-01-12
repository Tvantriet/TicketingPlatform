import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as bookingService from '../../src/services/bookingService.js';
import prisma from '../../src/db/prisma.js';
import { BookingStatus } from '@prisma/client';
import * as sender from '../../src/messaging/sender.js';

// Mock dependencies
jest.mock('../../src/db/prisma.js', () => ({
  default: {
    booking: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../src/messaging/sender.js', () => ({
  sendMessage: jest.fn(),
}));

describe('BookingService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('should create booking with PENDING status and 10-min expiration', async () => {
      const mockBooking = {
        id: 1,
        bookingId: 'booking-123',
        ticketId: 1,
        userId: 'user-123',
        amount: 50.0,
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
        completedAt: null,
        paymentDetails: null,
      };

      (prisma.booking.create as jest.Mock).mockReturnValueOnce(mockBooking);
      (sender.sendMessage as jest.Mock).mockReturnValueOnce(undefined);

      const result = await bookingService.createBooking({
        ticketId: 1,
        userId: 'user-123',
        amount: 50.0,
      });

      expect(result.status).toBe(BookingStatus.PENDING);
      expect(result.ticketId).toBe(1);
      expect(result.userId).toBe('user-123');
      expect(result.amount).toBe(50.0);
      expect(sender.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should send ticket reserve message via RabbitMQ', async () => {
      const mockBooking = {
        id: 1,
        bookingId: 'booking-123',
        ticketId: 1,
        userId: 'user-123',
        amount: 50.0,
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
        completedAt: null,
        paymentDetails: null,
      };

      (prisma.booking.create as jest.Mock).mockReturnValueOnce(mockBooking);
      (sender.sendMessage as jest.Mock).mockReturnValueOnce(undefined);

      await bookingService.createBooking({
        ticketId: 1,
        userId: 'user-123',
        amount: 50.0,
      });

      expect(sender.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 1,
          bookingId: expect.stringContaining('booking-'),
        }),
        expect.any(String)
      );
    });
  });

  describe('getBookingByBookingId', () => {
    it('should return booking when found', async () => {
      const mockBooking = {
        id: 1,
        bookingId: 'booking-123',
        ticketId: 1,
        userId: 'user-123',
        amount: 50.0,
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
        completedAt: null,
        paymentDetails: null,
      };

      (prisma.booking.findUnique as jest.Mock).mockReturnValueOnce(mockBooking as  never);

      const result = await bookingService.getBookingByBookingId('booking-123');

      expect(result).toEqual(mockBooking);
      expect(prisma.booking.findUnique).toHaveBeenCalledWith({
        where: { bookingId: 'booking-123' },
      });
    });

    it('should return null when booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockReturnValueOnce(null);

      const result = await bookingService.getBookingByBookingId('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('submitPayment', () => {
    it('should update booking and send payment request', async () => {
      const mockBooking = {
        id: 1,
        bookingId: 'booking-123',
        ticketId: 1,
        userId: 'user-123',
        amount: 50.0,
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
        completedAt: null,
        paymentDetails: null,
      };

      const updatedBooking = {
        ...mockBooking,
        paymentDetails: { cardNumber: '4111111111111111' },
      };

      (prisma.booking.findUnique as jest.Mock).mockReturnValueOnce(mockBooking);
      (prisma.booking.update as jest.Mock).mockReturnValueOnce(updatedBooking);
      (sender.sendMessage as jest.Mock).mockReturnValueOnce(undefined);

      const result = await bookingService.submitPayment('booking-123', {
        cardNumber: '4111111111111111',
      });

      expect(result.paymentDetails).toEqual({ cardNumber: '4111111111111111' });
      expect(sender.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should throw error if booking has expired', async () => {
      const mockBooking = {
        id: 1,
        bookingId: 'booking-123',
        ticketId: 1,
        userId: 'user-123',
        amount: 50.0,
        status: BookingStatus.PENDING,
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(),
        completedAt: null,
        paymentDetails: null,
      };

      (prisma.booking.findUnique as jest.Mock).mockReturnValueOnce(mockBooking);
      (prisma.booking.update as jest.Mock).mockReturnValueOnce({
        ...mockBooking,
        status: BookingStatus.EXPIRED,
      });

      await expect(
        bookingService.submitPayment('booking-123', { cardNumber: '4111111111111111' })
      ).rejects.toThrow('Booking has expired');
    });

    it('should throw error if booking not in valid state', async () => {
      const mockBooking = {
        id: 1,
        bookingId: 'booking-123',
        ticketId: 1,
        userId: 'user-123',
        amount: 50.0,
        status: BookingStatus.CONFIRMED,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
        completedAt: new Date(),
        paymentDetails: null,
      };

      (prisma.booking.findUnique as jest.Mock).mockReturnValueOnce(mockBooking);

      await expect(
        bookingService.submitPayment('booking-123', { cardNumber: '4111111111111111' })
      ).rejects.toThrow('Cannot submit payment for booking with status: CONFIRMED');
    });
  });

  describe('updateBookingStatus', () => {
    it('should update booking status to CONFIRMED with completedAt', async () => {
      const mockBooking = {
        id: 1,
        bookingId: 'booking-123',
        ticketId: 1,
        userId: 'user-123',
        amount: 50.0,
        status: BookingStatus.CONFIRMED,
        expiresAt: new Date(),
        createdAt: new Date(),
        completedAt: new Date(),
        paymentDetails: null,
      };

      (prisma.booking.update as jest.Mock).mockReturnValueOnce(mockBooking);

      const result = await bookingService.updateBookingStatus(
        'booking-123',
        BookingStatus.CONFIRMED
      );

      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { bookingId: 'booking-123' },
        data: {
          status: BookingStatus.CONFIRMED,
          completedAt: expect.any(Date),
        },
      });
    });

    it('should update to EXPIRED without completedAt', async () => {
      const mockBooking = {
        id: 1,
        bookingId: 'booking-123',
        ticketId: 1,
        userId: 'user-123',
        amount: 50.0,
        status: BookingStatus.EXPIRED,
        expiresAt: new Date(),
        createdAt: new Date(),
        completedAt: null,
        paymentDetails: null,
      };

      (prisma.booking.update as jest.Mock).mockReturnValueOnce(mockBooking);

      await bookingService.updateBookingStatus('booking-123', BookingStatus.EXPIRED);

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { bookingId: 'booking-123' },
        data: {
          status: BookingStatus.EXPIRED,
        },
      });
    });
  });

  describe('expireOldBookings', () => {
    it('should expire pending bookings past their expiration time', async () => {
      (prisma.booking.updateMany as jest.Mock).mockReturnValueOnce({ count: 3 });

      const count = await bookingService.expireOldBookings();

      expect(count).toBe(3);
      expect(prisma.booking.updateMany).toHaveBeenCalledWith({
        where: {
          status: BookingStatus.PENDING,
          expiresAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: BookingStatus.EXPIRED,
        },
      });
    });
  });
});

