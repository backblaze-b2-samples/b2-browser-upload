import config from '../config.js';
import Debug from 'debug';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const debug = Debug('b2-browser-upload:getS3PresignedUrl');

const client = new S3Client({
    endpoint: config.s3EndpointUrl,
    region: config.b2Region,
    customUserAgent: 'b2-browser-upload/0.0.1 (backblaze-b2-samples)',
    credentials: {
        accessKeyId: config.b2ApplicationKeyId,
        secretAccessKey: config.b2ApplicationKey,
    }
});

function getPublicUrl(key) {
    if (!config.b2PublicUrlBase) {
        return undefined;
    }

    const encodedKey = key
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');

    return `${config.b2PublicUrlBase.replace(/\/$/, '')}/${encodedKey}`;
}

async function getS3PresignedUrl(key) {
    const putObjectParams = {
        Bucket: config.b2BucketName,
        Key: key,
    }
    const putObjectCommand = new PutObjectCommand(putObjectParams);
    const presignedUrl = await getSignedUrl(client, putObjectCommand, { expiresIn: 3600 });

    debug("presignedUrl: %j", presignedUrl);

    return {
        presignedUrl,
        publicUrl: getPublicUrl(key),
    };
}

export default getS3PresignedUrl;
