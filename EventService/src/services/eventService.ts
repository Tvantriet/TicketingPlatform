import prisma from '../db/prisma.js';
import { Event, Prisma } from '@prisma/client';

export interface CreateEventData {
  name: string;
  description?: string;
  venue: string;
  date: string | Date;
  capacity: number | string;
  price?: number | string;
  imageUrl?: string;
}

export interface UpdateEventData {
  name?: string;
  description?: string;
  venue?: string;
  date?: string | Date;
  capacity?: number | string;
  price?: number | string;
  imageUrl?: string;
}

export const createEvent = async (data: CreateEventData): Promise<Event> => {
  const { name, description, venue, date, capacity, price, imageUrl } = data;

  if (!name || !venue || !date || !capacity) {
    throw new Error('Missing required fields: name, venue, date, capacity');
  }

  return await prisma.event.create({
    data: {
      name,
      description: description || '',
      venue,
      date: new Date(date),
      capacity: parseInt(String(capacity)),
      price: price ? parseFloat(String(price)) : 0,
      imageUrl: imageUrl || null,
    },
  });
};

export const getAllEvents = async (): Promise<Event[]> => {
  return await prisma.event.findMany({
    orderBy: {
      date: 'asc',
    },
  });
};

export const getEventById = async (id: number | string): Promise<Event> => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(String(id)) },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  return event;
};

export const updateEvent = async (
  id: number | string,
  data: UpdateEventData
): Promise<Event> => {
  const { name, description, venue, date, capacity, price, imageUrl } = data;

  // Check if event exists
  const existingEvent = await prisma.event.findUnique({
    where: { id: parseInt(String(id)) },
  });

  if (!existingEvent) {
    throw new Error('Event not found');
  }

  // Build update object with only provided fields
  const updateData: Prisma.EventUpdateInput = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (venue !== undefined) updateData.venue = venue;
  if (date !== undefined) updateData.date = new Date(date);
  if (capacity !== undefined) updateData.capacity = parseInt(String(capacity));
  if (price !== undefined) updateData.price = parseFloat(String(price));
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

  if (Object.keys(updateData).length === 0) {
    throw new Error('No fields to update');
  }

  return await prisma.event.update({
    where: { id: parseInt(String(id)) },
    data: updateData,
  });
};

export const deleteEvent = async (id: number | string): Promise<boolean> => {
  const event = await prisma.event.findUnique({
    where: { id: parseInt(String(id)) },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  await prisma.event.delete({
    where: { id: parseInt(String(id)) },
  });

  return true;
};

