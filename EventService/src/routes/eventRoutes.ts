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

// Admin-only routes
router.post('/', authorize('admin'), upload.single('image'), createEvent);
router.put('/:id', authorize('admin'), upload.single('image'), updateEvent);
router.delete('/:id', authorize('admin'), deleteEvent);

// Public routes (no auth required)
router.get('/', getAllEvents);
router.get('/:id', getEvent);

export default router;
