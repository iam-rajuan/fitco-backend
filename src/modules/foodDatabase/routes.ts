import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';
import { createFood, deleteFood, getFoodByBarcode, getFoodById, importFoodsFromCsv, listFoods, updateFood } from './controller';

const router = Router();

router.get('/lookup/barcode/:barcode', authenticate, getFoodByBarcode);

router.use(authenticate, authorizeRoles(ROLES.ADMIN));
router.get('/', listFoods);
router.get('/:id', getFoodById);
router.post('/import-csv', importFoodsFromCsv);
router.post('/', createFood);
router.put('/:id', updateFood);
router.delete('/:id', deleteFood);

export default router;
