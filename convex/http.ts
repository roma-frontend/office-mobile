import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { chatHandler } from "./chat";
import { uploadToCloudinary } from "./fileUpload";

const http = httpRouter();

// Google OAuth redirect relay — receives the token fragment and redirects to hrleave:// deep link
http.route({
  path: "/auth/google/callback",
  method: "GET",
  handler: httpAction(async (_, request) => {
    // Google implicit flow returns params in the fragment (#), which the server can't see.
    // So we serve an HTML page that reads the fragment client-side and redirects to the app.
    const html = `<!DOCTYPE html>
<html><head><title>Signing in...</title></head>
<body>
<p>Signing in, please wait...</p>
<script>
  const hash = window.location.hash.substring(1);
  if (hash) {
    window.location.href = "hrleave://google-auth?" + hash;
  } else {
    const params = window.location.search.substring(1);
    if (params) {
      window.location.href = "hrleave://google-auth?" + params;
    } else {
      document.body.innerHTML = "<p>Authentication failed. Please close this window and try again.</p>";
    }
  }
</script>
</body></html>`;
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }),
});

http.route({
  path: "/chat",
  method: "POST",
  handler: chatHandler,
});

http.route({
  path: "/chat",
  method: "OPTIONS",
  handler: chatHandler,
});

http.route({
  path: "/uploadToCloudinary",
  method: "POST",
  handler: uploadToCloudinary,
});

export default http;
