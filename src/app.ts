import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import config from './config';
import { notFound, errorHandler } from './middlewares/errorMiddleware';

import authRoutes from './modules/auth/routes';
import userRoutes from './modules/user/routes';
import adminRoutes from './modules/admin/routes';
import subscriptionRoutes from './modules/subscription/routes';
import couponRoutes from './modules/coupon/routes';
import chatRoutes from './modules/chat/routes';
import reportRoutes from './modules/report/routes';
import cmsRoutes from './modules/cms/routes';
import dashboardRoutes from './modules/dashboard/routes';

const app = express();
const API_PREFIX = '/api/v1';

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);
app.use(`${API_PREFIX}/coupons`, couponRoutes);
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/cms`, cmsRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
