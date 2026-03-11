import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

/**
 * Get user statistics including leave usage, attendance, and productivity metrics
 */
export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Get user's leaves
    const userLeaves = await ctx.db
      .query("leaveRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Calculate leave statistics
    const approved = userLeaves.filter(l => l.status === "approved");
    const pending = userLeaves.filter(l => l.status === "pending");
    const rejected = userLeaves.filter(l => l.status === "rejected");

    const totalDaysUsed = approved.reduce((sum, l) => sum + (l.days ?? 0), 0);
    const totalDaysPending = pending.reduce((sum, l) => sum + (l.days ?? 0), 0);

    // Get user's tasks
    const userTasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("assigneeId"), userId))
      .collect();

    const completedTasks = userTasks.filter(t => t.status === "completed").length;
    const totalTasks = userTasks.length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Get user's messages/activity
    const userMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_sender", (q) => q.eq("senderId", userId))
      .collect();

    // Get attendance records if available
    const attendanceStats = {
      presentDays: 0,
      absentDays: 0,
      leaveDays: totalDaysUsed,
      totalWorkingDays: 0,
    };

    try {
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      if (attendance && attendance.length > 0) {
        attendanceStats.presentDays = attendance.filter(a => a.status === "present").length;
        attendanceStats.absentDays = attendance.filter(a => a.status === "absent").length;
        attendanceStats.totalWorkingDays = attendance.length;
      }
    } catch (err) {
      // Attendance table might not exist
    }

    // Calculate leave balances
    const leaveBalances = {
      paid: (user as any).paidLeaveBalance ?? 20,
      sick: (user as any).sickLeaveBalance ?? 10,
      family: (user as any).familyLeaveBalance ?? 5,
    };

    return {
      userId: user._id,
      userName: user.name,
      department: user.department,
      position: user.position,
      avatar: user.avatarUrl,
      joinDate: (user as any).createdAt,
      
      leaveStats: {
        totalDaysUsed,
        totalDaysPending,
        approvedLeaves: approved.length,
        pendingLeaves: pending.length,
        rejectedLeaves: rejected.length,
        balances: leaveBalances,
      },

      taskStats: {
        totalTasks,
        completedTasks,
        completionRate: Math.round(taskCompletionRate),
        pendingTasks: userTasks.filter(t => t.status !== "completed").length,
      },

      activityStats: {
        totalMessages: userMessages.length,
        lastActive: userMessages.length > 0 
          ? Math.max(...userMessages.map(m => m.createdAt ?? 0))
          : null,
      },

      attendanceStats,

      // Overall productivity score (0-100)
      productivityScore: Math.round(
        (taskCompletionRate * 0.4) + 
        (Math.min(userMessages.length / 100, 1) * 100 * 0.3) +
        (attendanceStats.presentDays > 0 ? (attendanceStats.presentDays / (attendanceStats.presentDays + attendanceStats.absentDays)) * 100 * 0.3 : 0)
      ),
    };
  },
});
