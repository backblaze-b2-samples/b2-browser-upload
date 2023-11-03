import express from 'express';
import getUploadInfo from "../upload/getUploadInfo.js";

const router = express.Router();

let uploadInfo;

/* GET home page. */
router.get('/', async function(req, res, next) {
  // Generate an upload URL and token and render them into the page
  uploadInfo = await getUploadInfo();
  res.render('index', { uploadInfo: uploadInfo });
});

export default router;
