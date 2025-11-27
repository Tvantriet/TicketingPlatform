import express from 'express';
import { 
  createTicket, 
  getTicket, 
  getTicketsByEvent, 
  getTicketsByStatus,
  updateTicketStatus,
  bookTicket,
  reserveTicket,
  deleteTicket 
} from '../controllers/ticketController.js';

const router = express.Router();

router.post('/', createTicket);
router.get('/event/:eventId', getTicketsByEvent);
router.get('/status/:status', getTicketsByStatus);
router.get('/:id', getTicket);
router.put('/:id/status', updateTicketStatus);
router.put('/:id/reserve', reserveTicket);
router.put('/:id/book', bookTicket);
router.delete('/:id', deleteTicket);

export default router;

