import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import config, { allowedContentTypes, maxUploadBytes } from '../config.js';
import getS3UploadInfo from '../upload/getS3UploadInfo.js';

const router = express.Router();
const uploadRateLimitWindowMs = 60 * 1000;
const uploadRateLimitMax = 5;
const maxKeyBytes = 512;
const reservedKeyPrefixes = new Set(['assets', 'public', 'system', 'users']);
const uploadAuthTokenDigest = createHash('sha256').update(config.uploadAuthToken).digest();
const uploadRateLimiter = rateLimit({
  windowMs: uploadRateLimitWindowMs,
  limit: uploadRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  message: { error: 'too many upload URLs requested' },
});

function isUploadTokenValid(token) {
  const tokenDigest = createHash('sha256').update(token).digest();

  return timingSafeEqual(tokenDigest, uploadAuthTokenDigest);
}

function authenticateUploadRequest(req) {
  const header = req.get('authorization') || '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix) || !isUploadTokenValid(header.slice(prefix.length))) {
    return null;
  }

  return { id: config.uploadUserId };
}

function sanitizeKey(key) {
  if (Buffer.byteLength(key, 'utf8') > maxKeyBytes) {
    throw new Error('key is too long');
  }
  if (key.startsWith('/') || key.includes('\\') || /[\u0000-\u001F\u007F]/u.test(key)) {
    throw new Error('key contains invalid characters');
  }

  const segments = key.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('key contains invalid path segments');
  }
  if (reservedKeyPrefixes.has(segments[0])) {
    throw new Error('key uses a reserved prefix');
  }

  return segments.join('/');
}

function getScopedObjectKey(userId, key) {
  return `users/${userId}/${randomUUID()}/${sanitizeKey(key)}`;
}

function parseContentLength(value) {
  const contentLength = Number(value);
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
    throw new Error('contentLength must be a positive integer');
  }
  if (contentLength > maxUploadBytes) {
    throw new Error(`contentLength must be ${maxUploadBytes} bytes or less`);
  }

  return contentLength;
}

function setNoStoreHeaders(req, res, next) {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  next();
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

/* GET presigned url */
router.get('/presigned-url', setNoStoreHeaders, uploadRateLimiter, async function(req, res, next) {
  const user = authenticateUploadRequest(req);
  if (!user) {
    res.status(401).json({ error: 'authorization is required' });
    return;
  }

  const key = typeof req.query.key === 'string' ? req.query.key : '';
  const contentType = typeof req.query.contentType === 'string' ? req.query.contentType : '';
  const contentLengthValue = typeof req.query.contentLength === 'string' ? req.query.contentLength : '';

  let objectKey;
  let contentLength;
  try {
    if (!key) {
      throw new Error('key is required');
    }
    if (!allowedContentTypes.includes(contentType)) {
      throw new Error('contentType is not allowed');
    }

    contentLength = parseContentLength(contentLengthValue);
    objectKey = getScopedObjectKey(user.id, key);
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  try {
    const uploadInfo = await getS3UploadInfo({ objectKey, contentType, contentLength });
    res.json({
      ...uploadInfo,
      maxUploadBytes,
      allowedContentTypes,
    });
  } catch (error) {
    console.error('Failed to create presigned upload URL:', error);
    res.status(500).json({ error: 'failed to create upload URL' });
  }
});

export default router;
