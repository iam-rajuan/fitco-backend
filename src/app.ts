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

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;