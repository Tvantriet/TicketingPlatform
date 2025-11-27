import { Router } from 'express';
import { testFunction } from '../controllers/paymentController.js';

const router = Router();

router.get('/test', testFunction);

export default router;