import express from 'express';
import { 
  createEvent, 
  getEvent, 
  getAllEvents, 
  updateEvent,
  deleteEvent 
} from '../controllers/eventController.js';

const router = express.Router();

router.post('/', createEvent);
router.get('/', getAllEvents);
router.get('/:id', getEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;

