import fetch from 'node-fetch';
import config from '../config.js';
import Debug from 'debug';
const debug = Debug('b2-browser-upload:getB2UploadInfo');

async function getB2UploadInfo() {
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        headers: {
            'Authorization': 'Basic ' + Buffer.from(config.b2ApplicationKeyId + ":" + config.b2ApplicationKey).toString('base64')
        }
    });
    const auth = await authResponse.json();

    const getUploadResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
            'Authorization': auth.authorizationToken,
        },
        body: JSON.stringify({
            bucketId: config.b2BucketId,
        }),
    });

    const uploadInfo = await getUploadResponse.json();
    debug("uploadInfo: %j", uploadInfo);

    return uploadInfo;
}

export default getB2UploadInfo;
