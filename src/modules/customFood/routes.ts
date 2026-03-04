import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';
import { createCustomFood, listCustomFoods, scanFoodByBarcode } from './controller';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.USER));
router.get('/', listCustomFoods);
router.post('/', createCustomFood);
router.get('/scan/barcode/:barcode', scanFoodByBarcode);

export default router;
