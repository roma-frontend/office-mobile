import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Migration: Approve all existing users
export const approveAllExistingUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    let approved = 0;
    for (const user of users) {
      // If user doesn't have isApproved field or it's false, approve them
      if (user.isApproved === undefined || user.isApproved === false) {
        await ctx.db.patch(user._id, {
          isApproved: true,
          approvedAt: Date.now(),
        });
        approved++;
      }
    }
    
    return { 
      success: true, 
      message: `Approved ${approved} users`,
      total: users.length 
    };
  },
});

// Migration: Move all leave requests to ADB-ARRM organization
export const migrateLeaveRequestsToAdbArrm = mutation({
  args: {
    adminUserId: v.id("users"),
  },
  handler: async (ctx, { adminUserId }) => {
    // Verify admin is superadmin
    const admin = await ctx.db.get(adminUserId);
    if (!admin || admin.role !== "superadmin") {
      throw new Error("Only superadmin can migrate data");
    }

    // Find ADB-ARRM organization
    const allOrgs = await ctx.db.query("organizations").collect();
    const adbArrm = allOrgs.find(org => org.slug === "adb-arrm");
    
    if (!adbArrm) {
      throw new Error("ADB-ARRM organization not found. Please create it first.");
    }

    // Get all leave requests
    const allLeaves = await ctx.db.query("leaveRequests").collect();
    
    let migrated = 0;
    let skipped = 0;

    for (const leave of allLeaves) {
      if (leave.organizationId === adbArrm._id) {
        skipped++;
        continue;
      }

      // Update organizationId
      await ctx.db.patch(leave._id, {
        organizationId: adbArrm._id,
      });
      
      migrated++;
    }

    return {
      success: true,
      migrated,
      skipped,
      total: allLeaves.length,
      organizationName: adbArrm.name,
      organizationId: adbArrm._id,
    };
  },
});
