import prisma from '../db/prisma.js';
import { TicketStatus, Ticket, Prisma } from '@prisma/client';

export interface CreateTicketData {
  eventId: number;
  price: number | string;
}

export const createTicket = async (data: CreateTicketData): Promise<Ticket> => {
  const { eventId, price } = data;

  if (!eventId || price === undefined) {
    throw new Error('Missing required fields: eventId, price');
  }

  // Verify event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  return await prisma.ticket.create({
    data: {
      eventId: eventId,
      price: parseFloat(String(price)),
      status: TicketStatus.AVAILABLE,
    },
  });
};

export const getTicketById = async (
  id: number | string
): Promise<Ticket & { event: { id: number; name: string } }> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(String(id)) },
    include: {
      event: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  return ticket;
};

export const getTicketsByEvent = async (
  eventId: number | string
): Promise<Ticket[]> => {
  return await prisma.ticket.findMany({
    where: { eventId: parseInt(String(eventId)) },
    orderBy: {
      createdAt: 'asc',
    },
  });
};

export const getTicketsByStatus = async (
  status: TicketStatus
): Promise<Ticket[]> => {
  if (!Object.values(TicketStatus).includes(status)) {
    throw new Error('Invalid status. Must be: AVAILABLE, RESERVED, or BOOKED');
  }

  return await prisma.ticket.findMany({
    where: { status },
    orderBy: {
      createdAt: 'asc',
    },
  });
};

export const updateTicketStatus = async (
  id: number | string,
  status: TicketStatus,
  transactionId: string | null = null
): Promise<Ticket> => {
  if (!Object.values(TicketStatus).includes(status)) {
    throw new Error('Status must be: AVAILABLE, RESERVED, or BOOKED');
  }

  // If booking, transactionId is required
  if (status === TicketStatus.BOOKED && !transactionId) {
    throw new Error('transactionId is required when booking a ticket');
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(String(id)) },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const updateData: Prisma.TicketUpdateInput = {
    status,
    transactionId: status === TicketStatus.BOOKED ? transactionId : null,
  };

  const updatedTicket = await prisma.ticket.update({
    where: { id: parseInt(String(id)) },
    data: updateData,
  });

  // If booking, update event's tickets_sold count
  if (status === TicketStatus.BOOKED && ticket.status !== TicketStatus.BOOKED) {
    await prisma.event.update({
      where: { id: ticket.eventId },
      data: {
        ticketsSold: {
          increment: 1,
        },
      },
    });
  }

  return updatedTicket;
};

export const reserveTicket = async (id: number | string, bookingId?: string): Promise<Ticket> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(String(id)) },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  if (ticket.status !== TicketStatus.AVAILABLE) {
    throw new Error('Ticket is not available for reservation');
  }

  return await prisma.ticket.update({
    where: { id: parseInt(String(id)) },
    data: {
      status: TicketStatus.RESERVED,
      reservedAt: new Date(),
      transactionId: bookingId || null,
    },
  });
};

export const releaseTicket = async (id: number | string): Promise<Ticket> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(String(id)) },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  return await prisma.ticket.update({
    where: { id: parseInt(String(id)) },
    data: {
      status: TicketStatus.AVAILABLE,
      reservedAt: null,
      transactionId: null,
    },
  });
};

export const releaseExpiredReservations = async (): Promise<number> => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  const result = await prisma.ticket.updateMany({
    where: {
      status: TicketStatus.RESERVED,
      reservedAt: {
        lt: tenMinutesAgo,
      },
    },
    data: {
      status: TicketStatus.AVAILABLE,
      reservedAt: null,
      transactionId: null,
    },
  });
  
  return result.count;
};

export const bookTicket = async (
  id: number | string,
  transactionId: string
): Promise<Ticket> => {
  if (!transactionId) {
    throw new Error('transactionId is required');
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(String(id)) },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  if (ticket.status === TicketStatus.BOOKED) {
    throw new Error('Ticket is already booked');
  }

  if (
    ticket.status !== TicketStatus.AVAILABLE &&
    ticket.status !== TicketStatus.RESERVED
  ) {
    throw new Error('Ticket cannot be booked from current status');
  }

  // Update ticket to booked
  const updatedTicket = await prisma.ticket.update({
    where: { id: parseInt(String(id)) },
    data: {
      status: TicketStatus.BOOKED,
      transactionId,
    },
  });

  // Update event's tickets_sold count if transitioning to booked
  if (ticket.status === TicketStatus.AVAILABLE || ticket.status === TicketStatus.RESERVED) {
    await prisma.event.update({
      where: { id: ticket.eventId },
      data: {
        ticketsSold: {
          increment: 1,
        },
      },
    });
  }

  return updatedTicket;
};

export const deleteTicket = async (id: number | string): Promise<boolean> => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: parseInt(String(id)) },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  if (ticket.status !== TicketStatus.AVAILABLE) {
    throw new Error('Only available tickets can be deleted');
  }

  await prisma.ticket.delete({
    where: { id: parseInt(String(id)) },
  });

  return true;
};

