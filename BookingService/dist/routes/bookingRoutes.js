import { Router } from 'express';
import { createBooking, getBookingStatus, submitPayment } from '../controllers/bookingController.js';
const router = Router();
router.post('/', createBooking);
router.get('/:bookingId', getBookingStatus);
router.post('/:bookingId/payment', submitPayment);
export default router;
//# sourceMappingURL=bookingRoutes.js.map