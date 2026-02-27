// Clear old leave requests and keep only fresh test data
import { mutation } from "./_generated/server";

export const clearAllLeaves = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all leave requests
    const allLeaves = await ctx.db.query("leaveRequests").collect();
    
    // Delete all of them
    for (const leave of allLeaves) {
      await ctx.db.delete(leave._id);
    }
    
    return { 
      success: true, 
      deletedCount: allLeaves.length,
      message: `Deleted ${allLeaves.length} leave requests. Database is now clean.`
    };
  },
});

export const clearAllNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all notifications
    const allNotifications = await ctx.db.query("notifications").collect();
    
    // Delete all of them
    for (const notification of allNotifications) {
      await ctx.db.delete(notification._id);
    }
    
    return { 
      success: true, 
      deletedCount: allNotifications.length,
      message: `Deleted ${allNotifications.length} notifications.`
    };
  },
});

export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear leaves
    const allLeaves = await ctx.db.query("leaveRequests").collect();
    for (const leave of allLeaves) {
      await ctx.db.delete(leave._id);
    }
    
    // Clear notifications
    const allNotifications = await ctx.db.query("notifications").collect();
    for (const notification of allNotifications) {
      await ctx.db.delete(notification._id);
    }
    
    // Clear tasks if needed
    const allTasks = await ctx.db.query("tasks").collect();
    for (const task of allTasks) {
      await ctx.db.delete(task._id);
    }
    
    // Clear performance metrics
    const allMetrics = await ctx.db.query("performanceMetrics").collect();
    for (const metric of allMetrics) {
      await ctx.db.delete(metric._id);
    }
    
    return { 
      success: true, 
      deletedLeaves: allLeaves.length,
      deletedNotifications: allNotifications.length,
      deletedTasks: allTasks.length,
      deletedMetrics: allMetrics.length,
      message: `Database cleaned! Deleted: ${allLeaves.length} leaves, ${allNotifications.length} notifications, ${allTasks.length} tasks, ${allMetrics.length} metrics.`
    };
  },
});
