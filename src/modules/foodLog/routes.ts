import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middlewares/authMiddleware';
import { ROLES } from '../../utils/constants';
import { createFoodLog, getHomeData, getWeeklySummary, listFoodLogs, listLogFoods, previewFoodLog } from './controller';

const router = Router();

router.use(authenticate, authorizeRoles(ROLES.USER));
router.get('/log-foods', listLogFoods);
router.get('/home', getHomeData);
router.get('/weekly-summary', getWeeklySummary);
router.get('/', listFoodLogs);
router.post('/preview', previewFoodLog);
router.post('/', createFoodLog);

export default router;
