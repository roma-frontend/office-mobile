import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "deliver scheduled messages",
  { minutes: 1 },
  internal.scheduledMessages.deliverScheduledMessages,
);

export default crons;
