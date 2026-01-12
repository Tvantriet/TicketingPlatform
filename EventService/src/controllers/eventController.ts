import { Request, Response } from 'express';
import * as eventService from '../services/eventService.js';
import * as r2Storage from '../services/r2Storage.js';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const multerReq = req as MulterRequest;
    let imageUrl: string | undefined;
    
    // Upload image if provided
    if (multerReq.file) {
      const result = await r2Storage.uploadImage(multerReq.file);
      imageUrl = result.url;
    }
    
    const event = await eventService.createEvent({
      ...req.body,
      imageUrl,
    });
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

export const getAllEvents = async (_req: Request, res: Response): Promise<void> => {
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
    const multerReq = req as MulterRequest;
    const existingEvent = await eventService.getEventById(req.params.id);
    let imageUrl: string | undefined;
    
    // Upload new image if provided
    if (multerReq.file) {
      const result = await r2Storage.uploadImage(multerReq.file);
      imageUrl = result.url;
      
      // Delete old image if exists
      if (existingEvent.imageUrl) {
        const oldKey = r2Storage.extractKeyFromUrl(existingEvent.imageUrl);
        if (oldKey) {
          await r2Storage.deleteImage(oldKey).catch(err => 
            console.error('Failed to delete old image:', err)
          );
        }
      }
    }
    
    const event = await eventService.updateEvent(req.params.id, {
      ...req.body,
      ...(imageUrl !== undefined && { imageUrl }),
    });
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
    const event = await eventService.getEventById(req.params.id);
    
    // Delete image from R2 if exists
    if (event.imageUrl) {
      const key = r2Storage.extractKeyFromUrl(event.imageUrl);
      if (key) {
        await r2Storage.deleteImage(key).catch(err => 
          console.error('Failed to delete image:', err)
        );
      }
    }
    
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

