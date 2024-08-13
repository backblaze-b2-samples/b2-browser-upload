import express from 'express';
import getB2UploadInfo from "../upload/getB2UploadInfo.js";
import getS3PresignedUrl from "../upload/getS3PresignedUrl.js";

const router = express.Router();

/* GET home page. */
router.get('/', async function(req, res, next) {
  // Generate an upload URL and token and render them into the page
  const uploadInfo = await getB2UploadInfo();
  res.render('index', { uploadInfo: uploadInfo });
});

/* GET presigned url */
router.get('/presigned-url', async function(req, res, next) {
  // Return a presigned URL for the given Key
  const presignedUrl = await getS3PresignedUrl(req.query.key);

  res.setHeader('Content-Type', 'application/json');
  res.json({"presignedUrl": presignedUrl});
});

export default router;
