import { httpAction } from "./_generated/server";

/**
 * HTTP action to upload files to Cloudinary
 * 
 * Required environment variables:
 * - CLOUDINARY_CLOUD_NAME: Your Cloudinary cloud name
 * - CLOUDINARY_UPLOAD_PRESET: Your Cloudinary unsigned upload preset
 * 
 * Expected POST body:
 * {
 *   "file": "base64-encoded-file-data",
 *   "fileName": "document.pdf",
 *   "fileType": "application/pdf"
 * }
 */
export const uploadToCloudinary = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const { file, fileName, fileType } = body;

    if (!file || !fileName) {
      return new Response(
        JSON.stringify({ error: "Missing file or fileName" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get Cloudinary credentials from environment
    const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudinaryUploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      return new Response(
        JSON.stringify({
          error: "Cloudinary credentials not configured",
          message:
            "Please set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET environment variables",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create FormData for Cloudinary upload
    const formData = new FormData();
    
    // Convert base64 to blob
    const base64Data = file.split(",")[1] || file; // Handle data:mime;base64, prefix
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: fileType || "application/octet-stream" });

    formData.append("file", blob, fileName);
    formData.append("upload_preset", cloudinaryUploadPreset);
    formData.append("resource_type", "auto");
    formData.append("public_id", `tasks/${Date.now()}_${fileName.replace(/\s+/g, "_")}`);

    // Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/auto/upload`;
    const uploadResponse = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      return new Response(
        JSON.stringify({
          error: "Cloudinary upload failed",
          details: errorData,
        }),
        { status: uploadResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const uploadData = await uploadResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        url: uploadData.secure_url,
        publicId: uploadData.public_id,
        size: uploadData.bytes,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("File upload error:", error);
    return new Response(
      JSON.stringify({
        error: "File upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
