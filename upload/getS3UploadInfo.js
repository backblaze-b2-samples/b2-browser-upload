import { createRequire } from 'node:module';
import config, { presignedUrlExpiresSeconds } from '../config.js';
import Debug from 'debug';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const debug = Debug('b2-browser-upload:getS3UploadInfo');

const client = new S3Client({
    endpoint: config.s3EndpointUrl,
    region: config.b2Region,
    customUserAgent: `${pkg.name}/${pkg.version} (backblaze-b2-samples)`,
    credentials: {
        accessKeyId: config.b2ApplicationKeyId,
        secretAccessKey: config.b2ApplicationKey,
    },
});

function getPublicUrl(key) {
    const encodedKey = key
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');

    return `${config.b2PublicUrlBase.replace(/\/$/, '')}/${encodedKey}`;
}

async function getS3UploadInfo({ objectKey, contentType, contentLength }) {
    const putObjectParams = {
        Bucket: config.b2BucketName,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: contentLength,
    };
    const putObjectCommand = new PutObjectCommand(putObjectParams);
    const presignedUrl = await getSignedUrl(client, putObjectCommand, {
        expiresIn: presignedUrlExpiresSeconds,
        signableHeaders: new Set(['content-length', 'content-type']),
    });

    debug(
        'presigned upload bucket=%s key=%s contentType=%s contentLength=%d expiresIn=%d',
        config.b2BucketName,
        objectKey,
        contentType,
        contentLength,
        presignedUrlExpiresSeconds,
    );

    return {
        objectKey,
        presignedUrl,
        publicUrl: getPublicUrl(objectKey),
        expiresIn: presignedUrlExpiresSeconds,
    };
}

export default getS3UploadInfo;
