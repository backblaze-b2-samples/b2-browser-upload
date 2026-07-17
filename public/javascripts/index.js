// When the user clicks the S3 upload button...
document.getElementById("s3UploadFileButton").addEventListener("click", async (event) => {
  // Don't submit the form!
  event.preventDefault();

  // Get the selected file
  const file = document.getElementById("uploadFileInput").files[0];

  // Tell B2 to set the content type automatically depending on the file extension
  const contentType = "b2/x-auto"

  let msg, detail;

  try {
    // Ask the backend for a presigned URL
    let response = await fetch('/presigned-url?' + new URLSearchParams({
      key: file.name,
    }).toString())

    // Report on the outcome
    if (!response.ok) {
      msg = `${response.status} when retrieving presigned URL from backend`;
      console.error(msg)
      detail = await response.text();
    } else {
      const { presignedUrl, publicUrl } = await response.json();

      document.getElementById('presignedUrl').textContent = presignedUrl;
      document.getElementById('publicUrl').textContent = publicUrl || "";
      console.log(`Presigned URL: ${presignedUrl}`);
      console.log(`Public URL: ${publicUrl}`);

      // Get the file's contents as an ArrayBuffer
      const fileContent = await file.arrayBuffer();

      // Upload the file content with the filename, hash and auth token
      response = await fetch(presignedUrl,{
        method: "PUT",
        mode: "cors",
        body: fileContent,
        headers: {
          "Content-Type": contentType,
        },
      });

      // Report on the outcome
      if (response.status >= 200 && response.status < 300) {
        msg = `${response.status} response from S3 API. Success!`;
      } else if (response.status >= 400) {
        msg = `${response.status} error from S3 API.`;
      } else {
        msg = `Unknown error.`;
      }

      detail = publicUrl
          ? `Uploaded object URL: ${publicUrl}`
          : '[S3 PutObject does not return any content]';
    }
  } catch (error) {
    console.error("Fetch threw an error:", error)
    msg = `Fetch threw "${error}" - see the console and/or network tab for more details`
    detail = error.stack;
  }

  console.log(`Upload file result: ${msg}`);
  console.log(`Response detail: ${detail}`);
  document.getElementById("resultMessage").textContent = msg;
  document.getElementById("response").textContent = detail;
});

// When selected file changes...
document.getElementById("uploadFileInput").addEventListener("change", async () => {
  // Clear the result, response, etc
  document.getElementById("resultMessage").textContent ="";
  document.getElementById("response").textContent = "";
  document.getElementById('presignedUrl').textContent = "";
  document.getElementById('publicUrl').textContent = "";
});
