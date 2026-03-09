import { internalMutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVER SCHEDULED MESSAGES — called by cron every minute
// ─────────────────────────────────────────────────────────────────────────────
export const deliverScheduledMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find undelivered messages whose scheduledFor has passed
    const scheduled = await ctx.db
      .query("messages")
      .withIndex("by_scheduled", (q) => q.eq("isDelivered", false))
      .collect();

    const toDeliver = scheduled.filter(
      (m) => m.scheduledFor && m.scheduledFor <= now && !m.isDeleted
    );

    for (const msg of toDeliver) {
      await ctx.db.patch(msg._id, { isDelivered: true });

      // Update conversation
      const sender = await ctx.db.get(msg.senderId);
      const preview =
        msg.type === "file"
          ? `${sender?.name ?? "Someone"}: 📎 ${msg.fileName ?? "File"}`
          : `${sender?.name ?? "Someone"}: ${(msg.content ?? "").slice(0, 60)}`;

      await ctx.db.patch(msg.conversationId, {
        lastMessageAt: now,
        lastMessagePreview: preview,
        updatedAt: now,
      });

      // Create mention notifications for scheduled messages
      if (msg.mentions && msg.mentions.length > 0) {
        for (const mentionedUserId of msg.mentions) {
          if (mentionedUserId === msg.senderId) continue;
          const conv = await ctx.db.get(msg.conversationId);
          await ctx.db.insert("notifications", {
            userId: mentionedUserId,
            type: "message_mention",
            title: "💬 You were mentioned",
            message: `${sender?.name ?? "Someone"} mentioned you${conv?.name ? ` in ${conv.name}` : ""}: "${(msg.content ?? "").slice(0, 80)}"`,
            isRead: false,
            relatedId: msg.conversationId,
            createdAt: now,
          });
        }
      }
    }

    return { delivered: toDeliver.length };
  },
});
