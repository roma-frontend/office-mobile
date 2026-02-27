import { httpRouter } from "convex/server";
import { chatHandler } from "./chat";
import { uploadToCloudinary } from "./fileUpload";

const http = httpRouter();

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
