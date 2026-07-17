import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const uploadToken = 'test-upload-token';
const uploadUserId = 'sample-user';
const publicUrlBase = 'https://bucket.example.test';

process.env.DEBUG = 'b2-browser-upload:getS3UploadInfo';
process.env.B2_APPLICATION_KEY_ID = 'test_key_id';
process.env.B2_APPLICATION_KEY = 'test_application_key';
process.env.B2_BUCKET_NAME = 'test-bucket';
process.env.B2_REGION = 'test-region';
process.env.B2_PUBLIC_URL_BASE = publicUrlBase;
process.env.UPLOAD_AUTH_TOKEN = uploadToken;
process.env.UPLOAD_USER_ID = uploadUserId;

const { default: app } = await import('../app.js');

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

async function getUploadInfo(baseUrl, params, token = uploadToken) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
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

test('config validation fails fast before serving traffic', () => {
    const env = {
        ...process.env,
        B2_APPLICATION_KEY_ID: 'test_key_id',
        B2_APPLICATION_KEY: 'test_application_key',
        B2_BUCKET_NAME: 'test-bucket',
        B2_PUBLIC_URL_BASE: publicUrlBase,
        UPLOAD_AUTH_TOKEN: uploadToken,
        UPLOAD_USER_ID: uploadUserId,
    };
    delete env.B2_REGION;

    const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', "import('./config.js')"],
        { cwd: repoRoot, env, encoding: 'utf8' },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing required env vars: B2_REGION/);
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
                'content-length;host',
            );
            assert.equal(
                body.publicUrl,
                `${publicUrlBase}/users/sample-user/${body.objectKey.split('/')[2]}/photo.png`,
            );
            assert.equal(body.expiresIn, 300);
            assert.match(debugOutput, /presigned upload bucket=/);
            assert.doesNotMatch(debugOutput, /X-Amz-Signature|X-Amz-Credential/);
        });

        await t.test('rate limits upload URL minting', async () => {
            const statuses = [];
            for (let index = 0; index < 5; index += 1) {
                const { response } = await getUploadInfo(
                    baseUrl,
                    validParams({ key: `rate-limit-${index}.png` }),
                );
                statuses.push(response.status);
            }

            assert.deepEqual(statuses, [200, 200, 200, 200, 429]);
        });
    } finally {
        process.stderr.write = originalStderrWrite;
        await close(server);
    }
});
