const REQUIRED_ENV_VARS = [
    'B2_APPLICATION_KEY_ID',
    'B2_APPLICATION_KEY',
    'B2_BUCKET_NAME',
    'B2_REGION',
    'B2_PUBLIC_URL_BASE',
    'UPLOAD_AUTH_TOKEN',
    'UPLOAD_USER_ID',
];

const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
    throw new Error(`Missing required env vars: ${missingEnvVars.join(', ')}`);
}

const b2Region = process.env['B2_REGION'];
const uploadUserId = process.env['UPLOAD_USER_ID'];
const uploadAuthToken = process.env['UPLOAD_AUTH_TOKEN'];
const minUploadAuthTokenLength = 32;
if (uploadAuthToken.length < minUploadAuthTokenLength) {
    throw new Error(`UPLOAD_AUTH_TOKEN must be at least ${minUploadAuthTokenLength} characters`);
}

const uploadUserIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
if (!uploadUserIdPattern.test(uploadUserId)) {
    throw new Error('UPLOAD_USER_ID must contain only letters, numbers, underscores, or hyphens and be 64 characters or less');
}

export const allowedContentTypes = Object.freeze([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
]);

export const maxUploadBytes = 10 * 1024 * 1024;
export const presignedUrlExpiresSeconds = 300;

export default {
    b2ApplicationKeyId: process.env['B2_APPLICATION_KEY_ID'],
    b2ApplicationKey: process.env['B2_APPLICATION_KEY'],
    b2BucketName: process.env['B2_BUCKET_NAME'],
    b2PublicUrlBase: process.env['B2_PUBLIC_URL_BASE'],
    b2Region,
    s3EndpointUrl: `https://s3.${b2Region}.backblazeb2.com`,
    uploadAuthToken,
    uploadUserId,
};
