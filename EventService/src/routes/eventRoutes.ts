import express from 'express';
import { 
  createEvent, 
  getEvent, 
  getAllEvents, 
  updateEvent,
  deleteEvent,
} from '../controllers/eventController.js';
import { upload } from '../middleware/upload.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Organizer or Admin only routes
router.post('/', authorize('organizer', 'admin'), upload.single('image'), createEvent);
router.put('/:id', authorize('organizer', 'admin'), upload.single('image'), updateEvent);
router.delete('/:id', authorize('organizer', 'admin'), deleteEvent);

// Public routes 
router.get('/', getAllEvents);
router.get('/:id', getEvent);

export default router;
