import { Request, Response } from 'express';
import * as eventService from '../services/eventService.js';

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await eventService.createEvent(req.body);
    res.status(201).json(event);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing required fields')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const getAllEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await eventService.getAllEvents();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const getEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.json(event);
  } catch (error) {
    if (error instanceof Error && error.message === 'Event not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body);
    res.json(event);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Event not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'No fields to update') {
        res.status(400).json({ error: error.message });
        return;
      }
    }
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    await eventService.deleteEvent(req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Event not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

