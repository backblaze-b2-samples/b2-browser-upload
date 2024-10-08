// When the user clicks the B2 upload button...
document.getElementById("b2UploadFileButton").addEventListener("click", async (event) => {
  // Don't submit the form!
  event.preventDefault();

  // Get the selected file
  const file = document.getElementById("uploadFileInput").files[0];

  // Get the file's contents as an ArrayBuffer
  const fileContent = await file.arrayBuffer();

  // Create a SHA-1 hash of the content as a hex string
  const hashBuffer = await crypto.subtle.digest('SHA-1', fileContent);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  // Get the uploadUrl and authorizationToken from the hidden form fields
  const uploadUrl = document.getElementById("uploadUrl").value;
  const authorizationToken = document.getElementById("authorizationToken").value;

  console.log(`Upload URL: ${uploadUrl}`);
  console.log(`Authorization token: ${authorizationToken}`);

  // Upload the file content with the filename, hash and auth token
  let msg, detail;
  try {
    const response = await fetch(uploadUrl,{
      method: "POST",
      mode: "cors",
      body: fileContent,
      headers: {
        "Content-Type": "b2/x-auto",
        "Authorization": authorizationToken,
        "X-Bz-File-Name": file.name,
        "X-Bz-Content-Sha1": hashHex,
      },
    });

    // Report on the outcome
    if (response.status >= 200 && response.status < 300) {
      // // Display the success element
      // const ref = document.getElementById('result-message-container');
      // ref.setAttribute('class', 'show');
      msg = `${response.status} response from B2 API. Success!`;
    } else if (response.status >= 400) {
      msg = `${response.status} error from B2 API.`;
    } else {
      msg = `Unknown error.`;
    }

    detail = await response.text();
  } catch (error) {
    console.error("Fetch threw an error:", error)
    msg = `Fetch threw "${error}" - see the console and/or network tab for more details`
    detail = error.stack;
  }

  console.log(`Upload file result: ${msg}`);
  console.log(`Response detail: ${detail}`);
  document.getElementById("resultMessage").innerHTML = msg;
  document.getElementById("response").innerHTML = detail;
});


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
      const { presignedUrl } = await response.json();

      document.getElementById('presignedUrl').innerHTML = presignedUrl;
      console.log(`Presigned URL: ${presignedUrl}`);

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

      detail = '[S3 PutObject does not return any content]';
    }
  } catch (error) {
    console.error("Fetch threw an error:", error)
    msg = `Fetch threw "${error}" - see the console and/or network tab for more details`
    detail = error.stack;
  }

  console.log(`Upload file result: ${msg}`);
  console.log(`Response detail: ${detail}`);
  document.getElementById("resultMessage").innerHTML = msg;
  document.getElementById("response").innerHTML = detail;
});

// When selected file changes...
document.getElementById("uploadFileInput").addEventListener("change", async () => {
  // Clear the result, response, etc
  document.getElementById("resultMessage").innerHTML ="";
  document.getElementById("response").innerHTML = "";
  document.getElementById('presignedUrl').innerHTML = "";
});
