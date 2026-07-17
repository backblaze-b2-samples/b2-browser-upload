// When the user submits the upload form...
document.getElementById("uploadForm").addEventListener("submit", async (event) => {
  // Don't submit the form!
  event.preventDefault();

  // Get the selected file
  const file = document.getElementById("uploadFileInput").files[0];
  const uploadToken = document.getElementById("uploadTokenInput").value.trim();
  document.getElementById("resultMessage").textContent = "";
  document.getElementById("response").textContent = "";
  document.getElementById('presignedUrl').textContent = "";
  document.getElementById('publicUrl').textContent = "";

  if (!file) {
    document.getElementById("resultMessage").textContent = "Choose a file before uploading.";
    return;
  }
  if (!uploadToken) {
    document.getElementById("resultMessage").textContent = "Enter an upload token before uploading.";
    return;
  }
  if (!file.type) {
    document.getElementById("resultMessage").textContent = "Selected file has no content type.";
    return;
  }

  let msg, detail;

  try {
    // Ask the backend for a presigned URL
    let response = await fetch('/presigned-url?' + new URLSearchParams({
      key: file.name,
      contentType: file.type,
      contentLength: String(file.size),
    }).toString(), {
      headers: {
        "Authorization": `Bearer ${uploadToken}`,
      },
    })

    // Report on the outcome
    if (!response.ok) {
      msg = `${response.status} when retrieving presigned URL from backend`;
      console.error(msg)
      detail = await response.text();
    } else {
      const { presignedUrl, publicUrl } = await response.json();

      document.getElementById('presignedUrl').textContent = presignedUrl;

      // Get the file's contents as an ArrayBuffer
      const fileContent = await file.arrayBuffer();

      // Upload the file content with the filename, hash and auth token
      response = await fetch(presignedUrl,{
        method: "PUT",
        mode: "cors",
        body: fileContent,
        headers: {
          "Content-Type": file.type,
        },
      });

      // Report on the outcome
      if (response.status >= 200 && response.status < 300) {
        msg = `${response.status} response from S3 API. Success!`;
        if (publicUrl) {
          document.getElementById('publicUrl').textContent = publicUrl;
        }
        detail = publicUrl
            ? `Uploaded object URL: ${publicUrl}`
            : '[S3 PutObject does not return any content]';
      } else if (response.status >= 400) {
        msg = `${response.status} error from S3 API.`;
        detail = await response.text();
      } else {
        msg = `Unknown error.`;
        detail = await response.text();
      }
    }
  } catch (error) {
    console.error("Fetch threw an error:", error)
    msg = `Fetch threw "${error}" - see the console and/or network tab for more details`
    detail = error.stack;
  }

  document.getElementById("resultMessage").textContent = msg;
  document.getElementById("response").textContent = detail;
});

// When selected file changes...
document.getElementById("uploadFileInput").addEventListener("change", async () => {
  // Clear the result, response, etc
  document.getElementById("resultMessage").textContent = "";
  document.getElementById("response").textContent = "";
  document.getElementById('presignedUrl').textContent = "";
  document.getElementById('publicUrl').textContent = "";
});
