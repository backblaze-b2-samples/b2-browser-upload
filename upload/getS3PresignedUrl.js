import config from '../config.js';
import Debug from 'debug';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const debug = Debug('b2-browser-upload:getS3PresignedUrl');

const client = new S3Client({
    endpoint: config.s3EndpointUrl,
    region: config.s3Region,
    credentials: {
        accessKeyId: config.b2ApplicationKeyId,
        secretAccessKey: config.b2ApplicationKey,
    }
});

async function getS3PresignedUrl(key) {
    const putObjectParams = {
        Bucket: config.b2BucketName,
        Key: key,
    }
    const putObjectCommand = new PutObjectCommand(putObjectParams);
    const presignedUrl = await getSignedUrl(client, putObjectCommand, { expiresIn: 3600 });

    debug("presignedUrl: %j", presignedUrl);

    return presignedUrl;
}

export default getS3PresignedUrl;
