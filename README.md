# B2 Browser Upload 

This example demonstrates using the `b2_upload_file` Backblaze B2 Cloud Storage API from a web browser to upload a file directly from a web browser to the B2 bucket, without the file contents having to go through a web server you control.

This is similar to using techniques with other cloud storage providers such as AWS's [presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/dev/PresignedUrlUploadObject.html) and GCP's [signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls), and was inspired by and borrows from [Matt Welke](https://github.com/mattwelke)'s [upload-file-to-backblaze-b2-from-browser-example](https://github.com/mattwelke/upload-file-to-backblaze-b2-from-browser-example). Many thanks to Matt for writing and publishing that code! 

In this example, a Node.js back end app renders the upload URL and authorization token into the web page containing the file upload element. JavaScript on the front end uses the `fetch()` API to POST the file directly to Backblaze B2.  

# Components

The example has two components:

1. An Express back end to call the b2_get_upload_url and render the resulting upload URL and authorization token into the web page as hidden form fields without exposing the B2 application key to the browser.
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
                "b2_download_file_by_name"
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

Run the app with `DEBUG=b2-browser-upload:* npm start`.

Choose file and upload:

![upload screenshot](https://github.com/backblaze-b2-samples/b2-browser-upload/assets/723517/1c63fe79-64aa-4f99-8a71-dde266e203e2)

