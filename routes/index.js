import express from 'express';
import getS3PresignedUrl from "../upload/getS3PresignedUrl.js";

const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

/* GET presigned url */
router.get('/presigned-url', async function(req, res, next) {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  if (!key) {
    res.status(400).json({ error: 'key is required' });
    return;
  }

  // Return a presigned URL for the given Key
  const uploadInfo = await getS3PresignedUrl(key);

  res.setHeader('Content-Type', 'application/json');
  res.json(uploadInfo);
});

export default router;
