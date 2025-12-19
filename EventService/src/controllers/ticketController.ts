import { Request, Response } from 'express';
import * as ticketService from '../services/ticketService.js';
import { TicketStatus } from '@prisma/client';

export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await ticketService.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error.message === 'Event not found') {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

export const getTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    
    // Transform Prisma response to match API contract
    const response = {
      id: ticket.id,
      eventId: ticket.eventId,
      eventName: ticket.event.name,
      price: ticket.price,
      status: ticket.status,
      transactionId: ticket.transactionId,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
    
    res.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === 'Ticket not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
};

export const getTicketsByEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await ticketService.getTicketsByEvent(req.params.eventId);
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

export const getTicketsByStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // Convert URL param to enum value
    const statusMap: Record<string, TicketStatus> = {
      'available': TicketStatus.AVAILABLE,
      'reserved': TicketStatus.RESERVED,
      'booked': TicketStatus.BOOKED,
    };
    
    const status = statusMap[req.params.status.toLowerCase()];
    if (!status) {
      res.status(400).json({ 
        error: 'Invalid status. Must be: available, reserved, or booked' 
      });
      return;
    }

    const tickets = await ticketService.getTicketsByStatus(status);
    res.json(tickets);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid status')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, transactionId } = req.body;
    
    // Convert string status to enum
    const statusMap: Record<string, TicketStatus> = {
      'available': TicketStatus.AVAILABLE,
      'reserved': TicketStatus.RESERVED,
      'booked': TicketStatus.BOOKED,
    };
    
    const enumStatus = statusMap[status?.toLowerCase()];
    if (!enumStatus) {
      res.status(400).json({ 
        error: 'Status is required and must be: available, reserved, or booked' 
      });
      return;
    }

    const ticket = await ticketService.updateTicketStatus(
      req.params.id,
      enumStatus,
      transactionId || null
    );
    
    res.json(ticket);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Ticket not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('transactionId is required') || 
          error.message.includes('Status must be')) {
        res.status(400).json({ error: error.message });
        return;
      }
    }
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
};

export const reserveTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.body;
    const ticket = await ticketService.reserveTicket(req.params.id, bookingId);
    res.json(ticket);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Ticket not found' || 
          error.message.includes('not available')) {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    console.error('Error reserving ticket:', error);
    res.status(500).json({ error: 'Failed to reserve ticket' });
  }
};

export const releaseTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await ticketService.releaseTicket(req.params.id);
    res.json(ticket);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Ticket not found') {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    console.error('Error releasing ticket:', error);
    res.status(500).json({ error: 'Failed to release ticket' });
  }
};

export const bookTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId } = req.body;
    const ticket = await ticketService.bookTicket(req.params.id, transactionId);
    res.json(ticket);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Ticket not found' || 
          error.message.includes('already booked') ||
          error.message.includes('cannot be booked')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('transactionId is required')) {
        res.status(400).json({ error: error.message });
        return;
      }
    }
    console.error('Error booking ticket:', error);
    res.status(500).json({ error: 'Failed to book ticket' });
  }
};

export const deleteTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    await ticketService.deleteTicket(req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Ticket not found' || 
          error.message.includes('Only available tickets')) {
        res.status(404).json({ error: error.message });
        return;
      }
    }
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
};

