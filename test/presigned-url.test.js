import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const uploadToken = 'test-upload-token-32-characters-long';
const uploadUserId = 'sample-user';
const publicUrlBase = 'https://bucket.example.test';
let requestIpCounter = 1;

process.env.DEBUG = 'b2-browser-upload:getS3UploadInfo';
process.env.B2_APPLICATION_KEY_ID = 'test_key_id';
process.env.B2_APPLICATION_KEY = 'test_application_key';
process.env.B2_BUCKET_NAME = 'test-bucket';
process.env.B2_REGION = 'test-region';
process.env.B2_PUBLIC_URL_BASE = publicUrlBase;
process.env.UPLOAD_AUTH_TOKEN = uploadToken;
process.env.UPLOAD_USER_ID = uploadUserId;

const { default: app } = await import('../app.js');
const { s3ClientConfig } = await import('../upload/getS3UploadInfo.js');

function nextClientIp() {
    const ip = `203.0.113.${requestIpCounter}`;
    requestIpCounter += 1;
    return ip;
}

function listen() {
    const server = http.createServer(app);

    return new Promise((resolveListen) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolveListen({
                server,
                baseUrl: `http://127.0.0.1:${port}`,
            });
        });
    });
}

function close(server) {
    return new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
            if (error) {
                rejectClose(error);
                return;
            }
            resolveClose();
        });
    });
}

async function getUploadInfo(baseUrl, params, token = uploadToken, clientIp = nextClientIp()) {
    const headers = { 'X-Forwarded-For': clientIp };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${baseUrl}/presigned-url?${new URLSearchParams(params)}`, { headers });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};

    return { response, body };
}

function validParams(overrides = {}) {
    return {
        key: 'photo.png',
        contentType: 'image/png',
        contentLength: '1024',
        ...overrides,
    };
}

test('S3 client uses required Backblaze sample user agent', () => {
    assert.equal(s3ClientConfig.customUserAgent, 'b2ai-b2-browser-upload');
});

test('config validation fails fast before serving traffic', () => {
    const baseEnv = {
        ...process.env,
        B2_APPLICATION_KEY_ID: 'test_key_id',
        B2_APPLICATION_KEY: 'test_application_key',
        B2_BUCKET_NAME: 'test-bucket',
        B2_REGION: 'test-region',
        B2_PUBLIC_URL_BASE: publicUrlBase,
        UPLOAD_AUTH_TOKEN: uploadToken,
        UPLOAD_USER_ID: uploadUserId,
    };

    const missingRegionEnv = { ...baseEnv };
    delete missingRegionEnv.B2_REGION;
    const missingRegion = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', "import('./config.js')"],
        { cwd: repoRoot, env: missingRegionEnv, encoding: 'utf8' },
    );
    const invalidUserId = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', "import('./config.js')"],
        { cwd: repoRoot, env: { ...baseEnv, UPLOAD_USER_ID: '../bad' }, encoding: 'utf8' },
    );
    const shortUploadToken = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', "import('./config.js')"],
        { cwd: repoRoot, env: { ...baseEnv, UPLOAD_AUTH_TOKEN: 'short-token' }, encoding: 'utf8' },
    );

    assert.notEqual(missingRegion.status, 0);
    assert.match(missingRegion.stderr, /Missing required env vars: B2_REGION/);
    assert.notEqual(invalidUserId.status, 0);
    assert.match(invalidUserId.stderr, /UPLOAD_USER_ID must contain only/);
    assert.notEqual(shortUploadToken.status, 0);
    assert.match(shortUploadToken.stderr, /UPLOAD_AUTH_TOKEN must be at least 32 characters/);
});

test('presigned-url endpoint enforces auth, key scope, limits, and safe logs', async (t) => {
    const { server, baseUrl } = await listen();
    let debugOutput = '';
    const originalStderrWrite = process.stderr.write;
    process.stderr.write = function captureStderr(chunk, encoding, callback) {
        debugOutput += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
        if (typeof encoding === 'function') {
            encoding();
        }
        if (typeof callback === 'function') {
            callback();
        }
        return true;
    };

    try {
        await t.test('serves client contract assets without caching', async () => {
            const page = await fetch(`${baseUrl}/`);
            const script = await fetch(`${baseUrl}/javascripts/index.js`);

            assert.equal(page.status, 200);
            assert.equal(script.status, 200);
            assert.equal(page.headers.get('cache-control'), 'no-store');
            assert.equal(script.headers.get('cache-control'), 'no-store');
        });

        await t.test('rejects unauthenticated requests', async () => {
            const { response, body } = await getUploadInfo(baseUrl, validParams(), null);

            assert.equal(response.status, 401);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            assert.equal(body.error, 'authorization is required');
        });

        await t.test('rejects invalid upload tokens', async () => {
            const { response, body } = await getUploadInfo(baseUrl, validParams(), 'wrong-token');

            assert.equal(response.status, 401);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            assert.equal(body.error, 'authorization is required');
        });

        await t.test('rejects missing keys', async () => {
            const { response, body } = await getUploadInfo(baseUrl, {
                contentType: 'image/png',
                contentLength: '1024',
            });

            assert.equal(response.status, 400);
            assert.equal(body.error, 'key is required');
        });

        await t.test('rejects missing content metadata', async () => {
            const missingType = await getUploadInfo(baseUrl, {
                key: 'photo.png',
                contentLength: '1024',
            });
            const missingLength = await getUploadInfo(baseUrl, {
                key: 'photo.png',
                contentType: 'image/png',
            });

            assert.equal(missingType.response.status, 400);
            assert.equal(missingType.body.error, 'contentType is required');
            assert.equal(missingLength.response.status, 400);
            assert.equal(missingLength.body.error, 'contentLength is required');
        });

        await t.test('rejects malicious keys', async () => {
            const invalidKeys = [
                '../index.html',
                '/index.html',
                'assets//index.html',
                'assets/../index.html',
                'assets/index.html',
                'users/other/index.html',
                'bad\\name.txt',
                `bad${String.fromCharCode(1)}name.txt`,
                `${'a'.repeat(513)}.txt`,
            ];

            for (const key of invalidKeys) {
                const { response } = await getUploadInfo(baseUrl, validParams({ key }));

                assert.equal(response.status, 400, key);
            }
        });

        await t.test('rejects disallowed content metadata', async () => {
            const html = await getUploadInfo(baseUrl, validParams({ contentType: 'text/html' }));
            const oversized = await getUploadInfo(baseUrl, validParams({ contentLength: String(10 * 1024 * 1024 + 1) }));

            assert.equal(html.response.status, 400);
            assert.equal(html.body.error, 'contentType is not allowed');
            assert.equal(oversized.response.status, 400);
            assert.match(oversized.body.error, /bytes or less/);
        });

        await t.test('scopes signed object keys to the authenticated principal', async () => {
            const { response, body } = await getUploadInfo(baseUrl, validParams({ key: 'photo.png' }));

            assert.equal(response.status, 200);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            assert.match(
                body.objectKey,
                /^users\/sample-user\/[0-9a-f-]{36}\/photo\.png$/,
            );
            assert.ok(body.presignedUrl.includes('X-Amz-Signature='));
            assert.equal(
                new URL(body.presignedUrl).searchParams.get('X-Amz-SignedHeaders'),
                'content-length;content-type;host',
            );
            assert.equal(
                body.publicUrl,
                `${publicUrlBase}/users/sample-user/${body.objectKey.split('/')[2]}/photo.png`,
            );
            assert.equal(body.expiresIn, 300);
            assert.match(debugOutput, /presigned upload bucket=/);
            assert.doesNotMatch(debugOutput, /X-Amz-Signature|X-Amz-Credential/);
        });

        await t.test('allows zero-byte uploads', async () => {
            const { response, body } = await getUploadInfo(baseUrl, validParams({
                key: 'empty.txt',
                contentType: 'text/plain',
                contentLength: '0',
            }));

            assert.equal(response.status, 200);
            assert.match(
                body.objectKey,
                /^users\/sample-user\/[0-9a-f-]{36}\/empty\.txt$/,
            );
        });

        await t.test('rate limits upload URL minting per client IP', async () => {
            const limitedIp = '198.51.100.10';
            const statuses = [];
            for (let index = 0; index < 6; index += 1) {
                const { response } = await getUploadInfo(
                    baseUrl,
                    validParams({ key: `rate-limit-${index}.png` }),
                    uploadToken,
                    limitedIp,
                );
                statuses.push(response.status);
            }
            const otherClient = await getUploadInfo(
                baseUrl,
                validParams({ key: 'other-client.png' }),
                uploadToken,
                '198.51.100.11',
            );

            assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
            assert.equal(otherClient.response.status, 200);
        });

        await t.test('rate limits failed authentication attempts', async () => {
            const statuses = [];
            for (let index = 0; index < 6; index += 1) {
                const { response } = await getUploadInfo(
                    baseUrl,
                    validParams({ key: `bad-token-${index}.png` }),
                    'wrong-token',
                    '198.51.100.12',
                );
                statuses.push(response.status);
            }

            assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429]);
        });

        await t.test('does not log express-rate-limit trust proxy validation errors', () => {
            assert.doesNotMatch(debugOutput, /ValidationError|ERR_ERL_/);
        });
    } finally {
        process.stderr.write = originalStderrWrite;
        await close(server);
    }
});
