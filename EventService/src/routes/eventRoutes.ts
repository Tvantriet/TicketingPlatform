import express from 'express';
import { 
  createEvent, 
  getEvent, 
  getAllEvents, 
  updateEvent,
  deleteEvent,
} from '../controllers/eventController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/', upload.single('image'), createEvent);
router.get('/', getAllEvents);
router.get('/:id', getEvent);
router.put('/:id', upload.single('image'), updateEvent);
router.delete('/:id', deleteEvent);

export default router;
