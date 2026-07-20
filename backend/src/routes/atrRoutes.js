import { Router } from 'express';
import { createATR, listATRs, getATRById, advanceStatus } from '../controllers/atrController.js';
import { sendAtrEmail } from '../controllers/mailController.js';
import { requireAuth, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

// Open public submission model - no auth needed for creation or automated emailing
router.post('/', createATR);
router.post('/email', sendAtrEmail);
router.get('/', requireAuth, listATRs);
router.get('/:id', requireAuth, getATRById);

// Roles capable of endorsing, recommending or approving can sign off/advance status
router.put('/:id/advance', requireAuth, requireRoles([
  'AMS',
  'SO3 Air Prep',
  'D Air',
  'COMD',
  'ADS'
]), advanceStatus);

// Provide signoff alias endpoint for full backward-compatibility with previously written clients
router.put('/:id/signoff', requireAuth, requireRoles([
  'AMS',
  'SO3 Air Prep',
  'D Air',
  'COMD',
  'ADS'
]), advanceStatus);

export default router;
