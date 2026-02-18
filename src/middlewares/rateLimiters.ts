import rateLimit from 'express-rate-limit';

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many chat requests, please slow down.'
});