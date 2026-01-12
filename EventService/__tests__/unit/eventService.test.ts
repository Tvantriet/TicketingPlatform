import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as eventService from '../../src/services/eventService.js';
import prisma from '../../src/db/prisma.js';

// Mock Prisma
jest.mock('../../src/db/prisma.js', () => ({
  default: {
    event: {
      create: jest.fn<any>(),
      findMany: jest.fn<any>(),
      findUnique: jest.fn<any>(),
      update: jest.fn<any>(),
      delete: jest.fn<any>()
    },
  },
}));

describe('EventService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create an event with all required fields', async () => {
      const mockEvent = {
        id: 1,
        name: 'Test Event',
        description: 'Test Description',
        venue: 'Test Venue',
        date: new Date('2025-12-31'),
        capacity: 100,
        price: 50.0,
        imageUrl: 'https://example.com/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.event.create as jest.Mock<any>).mockResolvedValue(mockEvent);

      const result = await eventService.createEvent({
        name: 'Test Event',
        description: 'Test Description',
        venue: 'Test Venue',
        date: '2025-12-31',
        capacity: 100,
        price: 50.0,
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result).toEqual(mockEvent);
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Event',
          description: 'Test Description',
          venue: 'Test Venue',
          date: new Date('2025-12-31'),
          capacity: 100,
          price: 50.0,
          imageUrl: 'https://example.com/image.jpg',
        },
      });
    });

    it('should throw error when required fields are missing', async () => {
      await expect(
        eventService.createEvent({
          name: '',
          venue: 'Test Venue',
          date: '2025-12-31',
          capacity: 100,
        })
      ).rejects.toThrow('Missing required fields: name, venue, date, capacity');
    });

    it('should create event with default values for optional fields', async () => {
      const mockEvent = {
        id: 1,
        name: 'Test Event',
        description: '',
        venue: 'Test Venue',
        date: new Date('2025-12-31'),
        capacity: 100,
        price: 0,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.event.create as jest.Mock<any>).mockResolvedValue(mockEvent);

      const result = await eventService.createEvent({
        name: 'Test Event',
        venue: 'Test Venue',
        date: '2025-12-31',
        capacity: 100,
      });

      expect(result.price).toBe(0);
      expect(result.description).toBe('');
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Event',
          description: '',
          venue: 'Test Venue',
          date: new Date('2025-12-31'),
          capacity: 100,
          price: 0,
          imageUrl: null,
        },
      });
    });
  });

  describe('getEventById', () => {
    it('should return event when found', async () => {
      const mockEvent = {
        id: 1,
        name: 'Test Event',
        description: 'Test Description',
        venue: 'Test Venue',
        date: new Date('2025-12-31'),
        capacity: 100,
        price: 50.0,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue(mockEvent);

      const result = await eventService.getEventById(1);

      expect(result).toEqual(mockEvent);
      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw error when event not found', async () => {
      (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue(null);

      await expect(eventService.getEventById(999)).rejects.toThrow('Event not found');
    });
  });

  describe('updateEvent', () => {
    it('should update event with provided fields', async () => {
      const existingEvent = {
        id: 1,
        name: 'Old Event',
        description: 'Old Description',
        venue: 'Old Venue',
        date: new Date('2025-12-31'),
        capacity: 100,
        price: 50.0,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedEvent = { ...existingEvent, name: 'Updated Event', price: 75.0 };

      (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue(existingEvent);
      (prisma.event.update as jest.Mock<any>).mockResolvedValue(updatedEvent);

      const result = await eventService.updateEvent(1, {
        name: 'Updated Event',
        price: 75.0,
      });

      expect(result).toEqual(updatedEvent);
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Updated Event',
          price: 75.0,
        },
      });
    });

    it('should throw error when event not found', async () => {
      (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue(null);

      await expect(
        eventService.updateEvent(999, { name: 'Updated Event' })
      ).rejects.toThrow('Event not found');
    });

    it('should throw error when no fields to update', async () => {
      const existingEvent = {
        id: 1,
        name: 'Test Event',
        description: 'Test Description',
        venue: 'Test Venue',
        date: new Date('2025-12-31'),
        capacity: 100,
        price: 50.0,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.event.findUnique as jest.Mock<any>).mockResolvedValue(existingEvent);

      await expect(eventService.updateEvent(1, {})).rejects.toThrow(
        'No fields to update'
      );
    });
  });
});

