import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─────────────────────────────────────────────────────────────────────────────
// CREATE POLL
// ─────────────────────────────────────────────────────────────────────────────
export const createPoll = mutation({
  args: {
    conversationId: v.id("conversations"),
    createdBy: v.id("users"),
    question: v.string(),
    options: v.array(v.object({ id: v.string(), text: v.string() })),
  },
  handler: async (ctx, args) => {
    // Verify participant
    const participant = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.createdBy)
      )
      .unique();
    if (!participant) throw new Error("Not a participant");

    const now = Date.now();

    const pollId = await ctx.db.insert("polls", {
      conversationId: args.conversationId,
      createdBy: args.createdBy,
      question: args.question,
      options: args.options,
      isClosed: false,
      createdAt: now,
    });

    return pollId;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// VOTE POLL
// ─────────────────────────────────────────────────────────────────────────────
export const votePoll = mutation({
  args: {
    pollId: v.id("polls"),
    userId: v.id("users"),
    optionId: v.string(),
  },
  handler: async (ctx, { pollId, userId, optionId }) => {
    const poll = await ctx.db.get(pollId);
    if (!poll) throw new Error("Poll not found");
    if (poll.isClosed) throw new Error("Poll is closed");

    // Verify option exists
    if (!poll.options.find((o) => o.id === optionId)) {
      throw new Error("Invalid option");
    }

    // Remove previous vote if exists
    const existingVote = await ctx.db
      .query("pollVotes")
      .withIndex("by_poll_user", (q) => q.eq("pollId", pollId).eq("userId", userId))
      .unique();

    if (existingVote) {
      await ctx.db.delete(existingVote._id);
    }

    await ctx.db.insert("pollVotes", {
      pollId,
      userId,
      optionId,
      createdAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CLOSE POLL
// ─────────────────────────────────────────────────────────────────────────────
export const closePoll = mutation({
  args: {
    pollId: v.id("polls"),
    userId: v.id("users"),
  },
  handler: async (ctx, { pollId, userId }) => {
    const poll = await ctx.db.get(pollId);
    if (!poll) throw new Error("Poll not found");
    if (poll.createdBy !== userId) throw new Error("Only the poll creator can close it");

    await ctx.db.patch(pollId, { isClosed: true });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// GET POLL RESULTS
// ─────────────────────────────────────────────────────────────────────────────
export const getPollResults = query({
  args: { pollId: v.id("polls") },
  handler: async (ctx, { pollId }) => {
    const poll = await ctx.db.get(pollId);
    if (!poll) throw new Error("Poll not found");

    const votes = await ctx.db
      .query("pollVotes")
      .withIndex("by_poll", (q) => q.eq("pollId", pollId))
      .collect();

    const results = poll.options.map((option) => {
      const optionVotes = votes.filter((v) => v.optionId === option.id);
      return {
        ...option,
        voteCount: optionVotes.length,
        voterIds: optionVotes.map((v) => v.userId),
      };
    });

    return {
      ...poll,
      totalVotes: votes.length,
      results,
    };
  },
});
