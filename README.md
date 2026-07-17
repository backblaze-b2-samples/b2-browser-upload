# B2 Browser Upload

This example demonstrates how a web browser can upload a file directly to a Backblaze B2 Cloud Object Storage bucket with an S3-compatible presigned URL. The file contents go from the browser to B2 without passing through the Node.js server.

The Node.js back end creates a presigned URL for the S3-compatible PutObject operation. The browser then uploads the selected file to that URL with `fetch()`. The B2 application key stays on the server and is never exposed to the browser.

> Note: a single presigned PutObject upload is limited to 5 GB. Split larger files into parts between 5 MB and 5 GB and use the S3 Multipart operations.

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

Create a bucket and use the B2 CLI to apply custom CORS rules. The contents of the `b2CorsRules.json` file in this repo can be used as an example. Update `allowedOrigins` to the origin where you run the sample.

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
```

`B2_REGION` is the region segment for your bucket. The sample derives the S3-compatible endpoint as `https://s3.<B2_REGION>.backblazeb2.com`.

`B2_PUBLIC_URL_BASE` is used only to display the uploaded object's URL after a successful upload. Set it to the public or CDN base URL for your bucket.

Run the app with `DEBUG=b2-browser-upload:* npm start`.

Choose a file and upload it:

![upload screenshot](https://github.com/user-attachments/assets/c5fde727-af80-43b2-9c38-0bd9034b60d3)
