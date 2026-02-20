import Stripe from 'stripe';
import config from '.';

if (!config.stripe.secretKey) {
  console.warn('STRIPE_SECRET_KEY is not configured. Subscription checkout will fail until configured.');
}

const stripe = new Stripe(config.stripe.secretKey || 'sk_test_placeholder');

export default stripe;