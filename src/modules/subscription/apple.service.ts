import crypto from 'crypto';
import config from '../../config';

export interface AppleVerifiedSubscription {
  productId: string;
  transactionId: string;
  originalTransactionId?: string;
  purchaseDate?: Date;
  expiryDate: Date;
  revokedAt?: Date;
  environment?: string;
}

export interface AppleCatalogPrice {
  amount: number;
  currency: string;
  territory: string;
}

interface AppleTransactionPayload {
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  revocationDate?: number;
  environment?: string;
}

interface AppleNotificationPayload {
  notificationType?: string;
  subtype?: string;
  data?: {
    signedTransactionInfo?: string;
    originalTransactionId?: string;
  };
}

const APPLE_API_AUDIENCE = 'appstoreconnect-v1';

const createHttpError = (message: string, statusCode: number): Error & { statusCode: number } => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
};

const ensureAppleConfigured = (): void => {
  if (!config.apple.issuerId || !config.apple.keyId || !config.apple.bundleId || !config.apple.privateKey) {
    throw createHttpError(
      'Apple subscription verification is not configured. Missing Apple App Store credentials',
      400
    );
  }
};

const toBase64Url = (value: Buffer | string): string =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (value: string): Buffer => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = 4 - (normalized.length % 4 || 4);
  return Buffer.from(normalized + '='.repeat(padding), 'base64');
};

const decodeJwsPayload = <T>(token: string): T => {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw createHttpError('Invalid Apple signed payload', 400);
  }
  return JSON.parse(fromBase64Url(parts[1] as string).toString('utf8')) as T;
};

const createAppStoreConnectToken = (): string => {
  const header = {
    alg: 'ES256',
    kid: config.apple.keyId,
    typ: 'JWT'
  };
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.apple.issuerId,
    iat: issuedAt,
    exp: issuedAt + 300,
    aud: APPLE_API_AUDIENCE,
    bid: config.apple.bundleId
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign('sha256', Buffer.from(unsignedToken), {
    key: config.apple.privateKey,
    dsaEncoding: 'ieee-p1363'
  });

  return `${unsignedToken}.${toBase64Url(signature)}`;
};

const createStoreKitToken = (): string => {
  const header = {
    alg: 'ES256',
    kid: config.apple.keyId,
    typ: 'JWT'
  };
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.apple.issuerId,
    iat: issuedAt,
    exp: issuedAt + 300,
    aud: APPLE_API_AUDIENCE,
    bid: config.apple.bundleId
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign('sha256', Buffer.from(unsignedToken), {
    key: config.apple.privateKey,
    dsaEncoding: 'ieee-p1363'
  });

  return `${unsignedToken}.${toBase64Url(signature)}`;
};

const getAppleBaseUrl = (): string => {
  return config.apple.environment === 'production'
    ? 'https://api.storekit.itunes.apple.com'
    : 'https://api.storekit-sandbox.itunes.apple.com';
};

const fetchFromApple = async <T>(path: string): Promise<T> => {
  ensureAppleConfigured();

  const response = await fetch(`${getAppleBaseUrl()}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${createStoreKitToken()}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw createHttpError(`Apple verification failed: ${body || response.statusText}`, response.status);
  }

  return (await response.json()) as T;
};

const fetchFromAppStoreConnect = async <T>(path: string): Promise<T> => {
  ensureAppleConfigured();

  const response = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${createAppStoreConnectToken()}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw createHttpError(`Apple catalog request failed: ${body || response.statusText}`, response.status);
  }

  return (await response.json()) as T;
};

interface AppleSubscriptionPricesResponse {
  data?: Array<{
    relationships?: {
      territory?: {
        data?: {
          id?: string;
        };
      };
      subscriptionPricePoint?: {
        data?: {
          id?: string;
        };
      };
    };
  }>;
  included?: Array<{
    type?: string;
    id?: string;
    attributes?: {
      customerPrice?: string;
      currency?: string;
    };
  }>;
}

export const getAppleSubscriptionPrice = async ({
  subscriptionId,
  territory
}: {
  subscriptionId: string;
  territory: string;
}): Promise<AppleCatalogPrice | null> => {
  const response = await fetchFromAppStoreConnect<AppleSubscriptionPricesResponse>(
    `/v1/subscriptions/${encodeURIComponent(
      subscriptionId
    )}/prices?filter[territory]=${encodeURIComponent(territory)}&include=subscriptionPricePoint,territory&limit=1`
  );

  const pricePointId = response.data?.[0]?.relationships?.subscriptionPricePoint?.data?.id;
  const pricePoint = response.included?.find(item => item.type === 'subscriptionPricePoints' && item.id === pricePointId);
  const territoryInfo = response.included?.find(item => item.type === 'territories' && item.id === territory);
  const customerPrice = pricePoint?.attributes?.customerPrice;
  const currency = territoryInfo?.attributes?.currency || 'USD';

  if (!customerPrice) {
    return null;
  }

  return {
    amount: Number(customerPrice),
    currency,
    territory
  };
};

const mapTransactionPayload = (payload: AppleTransactionPayload): AppleVerifiedSubscription => {
  if (!payload.productId || !payload.transactionId || !payload.expiresDate) {
    throw createHttpError('Apple transaction response is missing required fields', 400);
  }

  return {
    productId: payload.productId,
    transactionId: payload.transactionId,
    originalTransactionId: payload.originalTransactionId,
    purchaseDate: payload.purchaseDate ? new Date(payload.purchaseDate) : undefined,
    expiryDate: new Date(payload.expiresDate),
    revokedAt: payload.revocationDate ? new Date(payload.revocationDate) : undefined,
    environment: payload.environment
  };
};

export const verifyAppleTransaction = async (transactionId: string): Promise<AppleVerifiedSubscription> => {
  const response = await fetchFromApple<{ signedTransactionInfo?: string }>(
    `/inApps/v1/transactions/${encodeURIComponent(transactionId)}`
  );

  if (!response.signedTransactionInfo) {
    throw createHttpError('Apple transaction verification response is missing signed transaction info', 400);
  }

  const payload = decodeJwsPayload<AppleTransactionPayload>(response.signedTransactionInfo);
  return mapTransactionPayload(payload);
};

export const parseAppleWebhookPayload = (
  payload: Record<string, unknown>
): {
  notificationType?: string;
  subtype?: string;
  transaction?: AppleVerifiedSubscription;
  originalTransactionId?: string;
} => {
  const signedPayload = payload.signedPayload;
  if (!signedPayload || typeof signedPayload !== 'string') {
    throw createHttpError('Missing Apple signedPayload', 400);
  }

  const notification = decodeJwsPayload<AppleNotificationPayload>(signedPayload);
  const signedTransactionInfo = notification.data?.signedTransactionInfo;

  return {
    notificationType: notification.notificationType,
    subtype: notification.subtype,
    transaction: signedTransactionInfo
      ? mapTransactionPayload(decodeJwsPayload<AppleTransactionPayload>(signedTransactionInfo))
      : undefined,
    originalTransactionId: notification.data?.originalTransactionId
  };
};
