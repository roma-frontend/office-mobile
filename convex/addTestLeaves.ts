// Temporary script to add test leave data
// Run this in Convex dashboard or as a mutation

import { mutation } from "./_generated/server";

export const addTestLeaves = mutation({
  args: {},
  handler: async (ctx) => {
    // Get first user
    const users = await ctx.db.query("users").collect();
    if (users.length === 0) {
      throw new Error("No users found");
    }
    
    const user = users[0];
    const now = Date.now();
    const today = new Date();
    
    // Create test leaves for the last 3 months
    const testLeaves = [
      {
        userId: user._id,
        type: "paid" as const,
        startDate: new Date(today.getFullYear(), today.getMonth() - 2, 15).toISOString().split('T')[0],
        endDate: new Date(today.getFullYear(), today.getMonth() - 2, 19).toISOString().split('T')[0],
        days: 5,
        reason: "Family vacation",
        status: "approved" as const,
        createdAt: now - 60 * 24 * 60 * 60 * 1000,
        updatedAt: now - 60 * 24 * 60 * 60 * 1000,
        reviewedAt: now - 59 * 24 * 60 * 60 * 1000,
      },
      {
        userId: user._id,
        type: "sick" as const,
        startDate: new Date(today.getFullYear(), today.getMonth() - 1, 10).toISOString().split('T')[0],
        endDate: new Date(today.getFullYear(), today.getMonth() - 1, 11).toISOString().split('T')[0],
        days: 2,
        reason: "Medical appointment",
        status: "approved" as const,
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        updatedAt: now - 30 * 24 * 60 * 60 * 1000,
        reviewedAt: now - 29 * 24 * 60 * 60 * 1000,
      },
      {
        userId: user._id,
        type: "family" as const,
        startDate: new Date(today.getFullYear(), today.getMonth(), 20).toISOString().split('T')[0],
        endDate: new Date(today.getFullYear(), today.getMonth(), 22).toISOString().split('T')[0],
        days: 3,
        reason: "Family event",
        status: "pending" as const,
        createdAt: now - 5 * 24 * 60 * 60 * 1000,
        updatedAt: now - 5 * 24 * 60 * 60 * 1000,
      },
    ];
    
    for (const leave of testLeaves) {
      await ctx.db.insert("leaveRequests", leave);
    }
    
    return { success: true, count: testLeaves.length };
  },
});
