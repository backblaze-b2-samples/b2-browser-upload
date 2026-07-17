const b2Region = process.env['B2_REGION'];

export default {
    b2ApplicationKeyId: process.env['B2_APPLICATION_KEY_ID'],
    b2ApplicationKey: process.env['B2_APPLICATION_KEY'],
    b2BucketName: process.env['B2_BUCKET_NAME'],
    b2PublicUrlBase: process.env['B2_PUBLIC_URL_BASE'],
    b2Region,
    s3EndpointUrl: b2Region ? `https://s3.${b2Region}.backblazeb2.com` : undefined,
};
