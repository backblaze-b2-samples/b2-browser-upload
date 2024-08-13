# B2 Browser Upload 

This example demonstrates two mechanisms that a web browser can use to upload a file directly from a web browser to the B2 bucket, without the file contents having to go through a web server you control:
* Using an S3 presigned URL and the PutObject operation
* Using the `b2_upload_file` Backblaze B2 Native API operation

The `b2_upload_file` example was inspired by and borrows from [Matt Welke](https://github.com/mattwelke)'s [upload-file-to-backblaze-b2-from-browser-example](https://github.com/mattwelke/upload-file-to-backblaze-b2-from-browser-example). Many thanks to Matt for writing and publishing that code! 

Both examples use a Node.js back end app that is configured with a Backblaze B2 application key and its ID.

## Uploading via an S3 Presigned URL

Since the presigned URL includes the object key (filename), after the user clicks the upload button, the front end JavaScript code uses the `fetch()` API to retrieve a presigned URL from the back end, passing the filename as a query parameter. The front end then uses `fetch()` to PUT the file directly to Backblaze B2 via its S3-compatible API's PutObject operation.

## Uploading via the B2 `b2_upload_file` Operation
 
In this example, the back end renders the upload URL and authorization token into the web page containing the file upload element. JavaScript on the front end uses the `fetch()` API to POST the file directly to Backblaze B2.  

# Components

The example has two components:

1. An Express back end. For S3, the back end creates a presigned URL, signed using the B2 application key. For B2, the back end calls `b2_get_upload_url` and renders the resulting upload URL and authorization token into the web page as hidden form fields. In neither case is the B2 application key exposed to the browser.
2. A front end JS app to retrieve the rendered values to upload a selected file from the browser. Uses [SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) to perform SHA1 hashing.

# Preparing Backblaze B2 bucket

Create a bucket and use the B2 CLI to apply custom CORS rules. The contents of the `b2CorsRules.json` file in this repo can be used as an example. The policy allows downloads and uploads from any origin. If you're using bash, or a similar shell, you can use [command substitution](https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html) (`$(...)`) to reference the JSON file with the CORS policy: 

```bash
b2 update-bucket --cors-rules "$(cat b2CorsRules.json)" yourBucketName
```

You should see your CORS policy in the output from the `b2` command:

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

## Running back end

Run `npm install`.

Set the following environment variables:

* B2_APPLICATION_KEY_ID - Your B2 application key id
* B2_APPLICATION_KEY - Your B2 application key
* B2_BUCKET_ID - The ID of the B2 bucket you're uploading files into.
* B2_BUCKET_NAME - The name of the B2 bucket you're uploading files into.
* AWS_ENDPOINT_URL - The bucket endpoint, prepended with `https://`, for example, `https://s3.us-west-004.backblazeb2.com`
* AWS_REGION - The region segment of the bucket endpoint, for example. `us-west-004`

Run the app with `DEBUG=b2-browser-upload:* npm start`.

Choose file and upload:

![upload screenshot](https://github.com/user-attachments/assets/c5fde727-af80-43b2-9c38-0bd9034b60d3)
