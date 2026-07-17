# B2 Browser Upload

This example demonstrates how a web browser can upload a file directly to a Backblaze B2 Cloud Object Storage bucket with an S3-compatible presigned URL. The file contents go from the browser to B2 without passing through the Node.js server.

The Node.js back end authenticates the browser request, creates a short-lived presigned URL for the S3-compatible PutObject operation, and scopes the object key under the configured sample user. The browser then uploads the selected file to that URL with `fetch()`. The B2 application key stays on the server and is never exposed to the browser.

> Note: this sample intentionally limits each upload to 10 MiB and accepts PDF, JPEG, PNG, WebP, and plain text files. Use S3 Multipart operations for larger production uploads, and adjust `allowedContentTypes` in `config.js` if your sample deployment needs more file types.

---

## Related Project: Vibe Coding Starter Kit

If you are looking for a production-ready, full-stack example that implements browser uploads to Backblaze B2, including direct-to-B2 uploads, dashboard UI, and backend integration, see:

[Vibe Coding Starter Kit](https://github.com/backblaze-b2-samples/vibe-coding-starter-kit)

This starter kit includes a pre-built Next.js + FastAPI application with file uploads, file browser, and Backblaze B2 already integrated.

---

## Components

The example has two components:

1. An [Express](https://expressjs.com/) back end that signs S3-compatible presigned URLs with a Backblaze B2 application key.
2. A front end JavaScript app that uploads a selected file from the browser with the presigned URL.

## Preparing Your Backblaze B2 Bucket

Create a bucket and use the B2 CLI to apply custom CORS rules. The contents of the `b2CorsRules.json` file in this repo can be used as an example for local development on `localhost:3000` or `127.0.0.1:3000`. Update `allowedOrigins` to your production origin before deploying.

If you're using bash, or a similar shell, you can use command substitution to reference the JSON file with the CORS policy:

```bash
b2 update-bucket --cors-rules "$(cat b2CorsRules.json)" yourBucketName
```

## Running the Back End

Run `npm install`.

Copy the provided `.env.example` to `.env` and edit it to include the following values:

```dotenv
B2_APPLICATION_KEY_ID=your_application_key_id
B2_APPLICATION_KEY=your_application_key
B2_BUCKET_NAME=your-bucket-name
B2_REGION=your-region
B2_PUBLIC_URL_BASE=https://your-bucket-name.s3.your-region.backblazeb2.com
UPLOAD_AUTH_TOKEN=replace-with-a-long-random-token-32-chars-min
UPLOAD_USER_ID=sample-user
```

`B2_REGION` is the region segment for your bucket. The sample derives the S3-compatible endpoint as `https://s3.<B2_REGION>.backblazeb2.com`.

`B2_PUBLIC_URL_BASE` is used only to display the uploaded object's URL after a successful upload. Set it to the public or CDN base URL for your bucket.

`UPLOAD_AUTH_TOKEN` is a sample bearer token with a minimum length of 32 characters. Enter this token in the browser UI before uploading. `UPLOAD_USER_ID` becomes part of the enforced object key prefix: `users/<UPLOAD_USER_ID>/<generated-id>/<filename>`.

All required environment variables are validated at startup. If any are missing, the server exits before accepting requests.

The upload endpoint also enforces bearer authentication, scoped object keys, file-name validation, allowed content types, maximum object size, short-lived presigned URLs, no-store response headers, and request rate limiting. These hardening controls are part of this sample's S3-only upload flow.

The sample uses `express-rate-limit` pinned at `7.5.1` for in-process request throttling. That store is intentionally local to this sample server: counters are per process and reset on restart. For a multi-replica production deployment, put a shared rate limiter at the edge or configure a distributed store. The app sets `trust proxy` to one hop so the limiter keys on the real client IP when it runs behind a single reverse proxy.

If uploaded objects are served from a public bucket or CDN, configure that serving layer to send `X-Content-Type-Options: nosniff` or `Content-Disposition: attachment` for user uploads.

## Configuration Migration Notes

Older revisions of this sample used `AWS_ENDPOINT_URL`, `AWS_REGION`, and `B2_BUCKET_ID`. This standards-aligned version does not read those names. For a rolling deployment, add the new `B2_REGION`, `B2_PUBLIC_URL_BASE`, `UPLOAD_AUTH_TOKEN`, and `UPLOAD_USER_ID` settings before deploying this version, keep the old values populated until old processes drain, then remove the old names.

Custom S3 endpoint overrides are not a runtime setting in this sample. The S3-compatible endpoint is derived from `B2_REGION` as `https://s3.<B2_REGION>.backblazeb2.com`.

Run the app with `DEBUG=b2-browser-upload:* npm start`.

Choose a supported file, enter the upload token, and upload it.
