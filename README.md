# B2 Browser Upload 

This example demonstrates two mechanisms that a web browser can use to upload a file directly from a web browser to a Backblaze B2 Cloud Object Storage Bucket, without sending the file contents via a web server that you control:
* Using an [S3 presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) and the [PutObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html) operation.
* Using the [`b2_upload_file`](https://www.backblaze.com/apidocs/b2-upload-file) Backblaze B2 Native API operation.

The `b2_upload_file` example was inspired by and borrows from [Matt Welke](https://github.com/mattwelke)'s [upload-file-to-backblaze-b2-from-browser-example](https://github.com/mattwelke/upload-file-to-backblaze-b2-from-browser-example). Many thanks to Matt for writing and publishing that code! 

Both examples use a Node.js back end app that is configured with a Backblaze B2 application key, its ID, and other settings.

> Note: for both mechanisms, the maximum file size that may be uploaded is 5 GB. You must split larger files into parts between 5 MB and 5 GB in size and use either the [S3 Multipart operations](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html) or the [B2 Native API equivalents](https://www.backblaze.com/docs/cloud-storage-create-large-files-with-the-native-api).

## Uploading via an S3 Presigned URL

Since the presigned URL includes the object key (filename), after the user clicks the upload button, the front end JavaScript code uses the `fetch()` API to retrieve a presigned URL from the back end, passing the filename as a query parameter. The front end then uses `fetch()` to PUT the file directly to Backblaze B2 via the S3-compatible API's PutObject operation.

## Uploading via the B2 `b2_upload_file` Operation
 
In this example, the back end calls [`b2_get_upload_url`](https://www.backblaze.com/apidocs/b2-get-upload-url), passing the bucket id, and receiving an upload URL and authorization token in the response. The back end then renders the upload URL and authorization token into the web page containing the file upload element. JavaScript on the front end uses the `fetch()` API to POST the file directly to Backblaze B2.

## S3 Presigned URL vs B2 `b2_upload_file`: Which Should You Use?

Here's how the two mechanisms differ:

| S3 Presigned URL                                                                                                                                         | B2 `b2_upload_file`                                                                                                                   |
|----------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| You can configure the presigned URL to expire any time from one second (probably too short to be of any practical use!) to one week after it is created. | The auth token and upload URL are valid for 24 hours or until the endpoint rejects an upload.                                         |
| A presigned URL must be created for each file to be uploaded.                                                                                            | The client may use the auth token and upload URL to upload an arbitrary number of files.                                              |
| The presigned URL contains the bucket and filename of the file to be uploaded.                                                                           | The auth token and upload URL apply to a given bucket. The client specifies the filename as an HTTP header when the file is uploaded. |

In general, you should use S3 presigned URLs, since you have greater control over their expiration. Use the `b2_upload_file` operation only when you cannot provide a mechanism for the client to obtain a presigned URL containing an appropriate filename, or you are working with a bucket that does not support the S3-compatible API.

# Components

The example has two components:

1. An [Express](https://expressjs.com/) back end. For S3, the back end creates a presigned URL, signed using the B2 application key. For B2, the back end calls `b2_get_upload_url` and renders the resulting upload URL and authorization token into the web page as hidden form fields. In neither case is the B2 application key exposed to the browser.
2. A front end JavaScript app that uploads a selected file from the browser. For the B2 `b2_get_upload_url` mechanism, the app uses [SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) to perform SHA1 hashing.

# Preparing Your Backblaze B2 bucket

Create a bucket and use the B2 CLI to apply custom CORS rules. The contents of the `b2CorsRules.json` file in this repo can be used as an example. The policy allows downloads and uploads from any origin, via both the B2 Native and S3-compatible APIs. If you're using bash, or a similar shell, you can use [command substitution](https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html) (`$(...)`) to reference the JSON file with the CORS policy: 

```bash
b2 update-bucket --cors-rules "$(cat b2CorsRules.json)" yourBucketName
```

You should see your CORS policy in the output from the `b2` command. For example:

```console
% b2 update-bucket --cors-rules "$(cat b2CorsRules.json)" metadaddy-public
{
    "accountId": "15f935cf4dcb",
    "bucketId": "f1f51fb913357c4f74ed0c1b",
    "bucketInfo": {},
    "bucketName": "metadaddy-public",
    "bucketType": "allPublic",
    "corsRules": [
        {
            "allowedHeaders": [
                "authorization",
                "content-type",
                "x-bz-file-name",
                "x-bz-content-sha1"
            ],
            "allowedOperations": [
                "b2_download_file_by_id",
                "b2_upload_part",
                "b2_upload_file",
                "s3_put",
                "b2_download_file_by_name",
                "s3_get"
            ],
            "allowedOrigins": [
                "*"
            ],
            "corsRuleName": "downloadFromAnyOriginWithUpload",
            "exposeHeaders": null,
            "maxAgeSeconds": 3600
        }
    ],
    "defaultRetention": {
        "mode": null
    },
    "defaultServerSideEncryption": {
        "mode": "none"
    },
    "isFileLockEnabled": false,
    "lifecycleRules": [],
    "options": [
        "s3"
    ],
    "replication": {
        "asReplicationDestination": null,
        "asReplicationSource": null
    },
    "revision": 8
}
```

Make a note of the `bucketId` value - you'll need that in the next step.

## Running the Back End

Run `npm install`.

Copy the provided `.env.template` to `.env` and edit it to include the following values:

```dotenv
B2_APPLICATION_KEY_ID=Your B2 application key id
B2_APPLICATION_KEY=Your B2 application key
B2_BUCKET_ID=The ID of the B2 bucket you're uploading files into.
B2_BUCKET_NAME=The name of the B2 bucket you're uploading files into.
AWS_ENDPOINT_URL=The bucket endpoint, prepended with `https://`, for example, `https://s3.us-west-004.backblazeb2.com`
AWS_REGION=The region segment of the bucket endpoint, for example. `us-west-004`
```

Run the app with `DEBUG=b2-browser-upload:* npm start`.

Choose a file and upload it:

![upload screenshot](https://github.com/user-attachments/assets/c5fde727-af80-43b2-9c38-0bd9034b60d3)
