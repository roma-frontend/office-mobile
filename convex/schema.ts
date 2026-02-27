import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── ORGANIZATIONS ────────────────────────────────────────────────────────
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    plan: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise"),
    ),
    isActive: v.boolean(),
    createdBySuperadmin: v.boolean(),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    timezone: v.optional(v.string()),
    country: v.optional(v.string()),
    industry: v.optional(v.string()),
    employeeLimit: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_plan", ["plan"])
    .index("by_active", ["isActive"]),

  // ── JOIN REQUESTS ────────────────────────────────────────────────────────
  organizationInvites: defineTable({
    organizationId: v.optional(v.id("organizations")),
    requestedByEmail: v.string(),
    requestedByName: v.string(),
    requestedAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    inviteToken: v.optional(v.string()),
    inviteEmail: v.optional(v.string()),
    inviteExpiry: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_email", ["requestedByEmail"])
    .index("by_status", ["status"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_token", ["inviteToken"]),

  // ── USERS ────────────────────────────────────────────────────────────────
  users: defineTable({
    organizationId: v.optional(v.id("organizations")),
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: v.union(
      v.literal("superadmin"),
      v.literal("admin"),
      v.literal("supervisor"),
      v.literal("employee"),
    ),
    employeeType: v.union(v.literal("staff"), v.literal("contractor")),
    department: v.optional(v.string()),
    position: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    presenceStatus: v.optional(v.union(
      v.literal("available"),
      v.literal("in_meeting"),
      v.literal("in_call"),
      v.literal("out_of_office"),
      v.literal("busy"),
    )),
    supervisorId: v.optional(v.id("users")),
    isActive: v.boolean(),
    isApproved: v.boolean(),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    travelAllowance: v.number(),
    paidLeaveBalance: v.number(),
    sickLeaveBalance: v.number(),
    familyLeaveBalance: v.number(),
    webauthnChallenge: v.optional(v.string()),
    faceDescriptor: v.optional(v.array(v.number())),
    faceImageUrl: v.optional(v.string()),
    faceRegisteredAt: v.optional(v.number()),
    resetPasswordToken: v.optional(v.string()),
    resetPasswordExpiry: v.optional(v.number()),
    sessionToken: v.optional(v.string()),
    sessionExpiry: v.optional(v.number()),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_org", ["organizationId"])
    .index("by_org_role", ["organizationId", "role"])
    .index("by_org_active", ["organizationId", "isActive"])
    .index("by_org_approval", ["organizationId", "isApproved"])
    .index("by_role", ["role"])
    .index("by_supervisor", ["supervisorId"])
    .index("by_approval", ["isApproved"]),

  webauthnCredentials: defineTable({
    userId: v.id("users"),
    credentialId: v.string(),
    publicKey: v.string(),
    counter: v.number(),
    deviceName: v.optional(v.string()),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_credential_id", ["credentialId"]),

  // ── LEAVE REQUESTS ───────────────────────────────────────────────────────
  leaveRequests: defineTable({
    organizationId: v.optional(v.id("organizations")),
    userId: v.id("users"),
    type: v.union(
      v.literal("paid"),
      v.literal("unpaid"),
      v.literal("sick"),
      v.literal("family"),
      v.literal("doctor"),
    ),
    startDate: v.string(),
    endDate: v.string(),
    days: v.number(),
    reason: v.string(),
    comment: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reviewedBy: v.optional(v.id("users")),
    reviewComment: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // ── NOTIFICATIONS ────────────────────────────────────────────────────
  notifications: defineTable({
    organizationId: v.optional(v.id("organizations")),
    userId: v.id("users"),
    type: v.union(
      v.literal("leave_request"),
      v.literal("leave_approved"),
      v.literal("leave_rejected"),
      v.literal("employee_added"),
      v.literal("join_request"),
      v.literal("join_approved"),
      v.literal("join_rejected"),
      v.literal("system"),
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    relatedId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["organizationId"])
    .index("by_user_unread", ["userId", "isRead"]),

  // ── AUDIT LOGS ───────────────────────────────────────────────────────────
  auditLogs: defineTable({
    organizationId: v.optional(v.id("organizations")),
    userId: v.id("users"),
    action: v.string(),
    target: v.optional(v.string()),
    details: v.optional(v.string()),
    ip: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"]),

  // ── SLA CONFIG ───────────────────────────────────────────────────────────
  slaConfig: defineTable({
    organizationId: v.optional(v.id("organizations")),
    targetResponseTime: v.number(),
    warningThreshold: v.number(),
    criticalThreshold: v.number(),
    businessHoursOnly: v.boolean(),
    businessStartHour: v.number(),
    businessEndHour: v.number(),
    excludeWeekends: v.boolean(),
    notifyOnWarning: v.boolean(),
    notifyOnCritical: v.boolean(),
    notifyOnBreach: v.boolean(),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_org", ["organizationId"]),

  // ── SLA METRICS ──────────────────────────────────────────────────────────
  slaMetrics: defineTable({
    organizationId: v.optional(v.id("organizations")),
    leaveRequestId: v.id("leaveRequests"),
    submittedAt: v.number(),
    respondedAt: v.optional(v.number()),
    responseTimeHours: v.optional(v.number()),
    targetResponseTime: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("on_time"),
      v.literal("breached"),
    ),
    slaScore: v.optional(v.number()),
    warningTriggered: v.boolean(),
    criticalTriggered: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_leave", ["leaveRequestId"])
    .index("by_status", ["status"])
    .index("by_submitted", ["submittedAt"]),

  // ── EMPLOYEE PROFILES ────────────────────────────────────────────────────
  employeeProfiles: defineTable({
    organizationId: v.optional(v.id("organizations")),
    userId: v.id("users"),
    biography: v.optional(v.object({
      education: v.optional(v.array(v.string())),
      certifications: v.optional(v.array(v.string())),
      workHistory: v.optional(v.array(v.string())),
      skills: v.optional(v.array(v.string())),
      languages: v.optional(v.array(v.string())),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"]),

  // ── EMPLOYEE DOCUMENTS ───────────────────────────────────────────────────
  employeeDocuments: defineTable({
    organizationId: v.optional(v.id("organizations")),
    userId: v.id("users"),
    uploaderId: v.id("users"),
    category: v.union(
      v.literal("resume"),
      v.literal("contract"),
      v.literal("certificate"),
      v.literal("performance_review"),
      v.literal("id_document"),
      v.literal("other"),
    ),
    fileName: v.string(),
    fileUrl: v.string(),
    fileSize: v.number(),
    description: v.optional(v.string()),
    uploadedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"]),

  // ── EMPLOYEE NOTES ───────────────────────────────────────────────────────
  employeeNotes: defineTable({
    organizationId: v.optional(v.id("organizations")),
    employeeId: v.id("users"),
    authorId: v.id("users"),
    type: v.union(
      v.literal("performance"),
      v.literal("behavior"),
      v.literal("achievement"),
      v.literal("concern"),
      v.literal("general"),
    ),
    visibility: v.union(
      v.literal("private"),
      v.literal("hr_only"),
      v.literal("manager_only"),
      v.literal("employee_visible"),
    ),
    content: v.string(),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("neutral"),
      v.literal("negative"),
    ),
    tags: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_employee", ["employeeId"])
    .index("by_author", ["authorId"]),

  // ── PERFORMANCE METRICS ──────────────────────────────────────────────────
  performanceMetrics: defineTable({
    organizationId: v.optional(v.id("organizations")),
    userId: v.id("users"),
    updatedBy: v.id("users"),
    punctualityScore: v.number(),
    absenceRate: v.number(),
    lateArrivals: v.number(),
    kpiScore: v.number(),
    projectCompletion: v.number(),
    deadlineAdherence: v.number(),
    teamworkRating: v.number(),
    communicationScore: v.number(),
    conflictIncidents: v.number(),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"]),

  // ── TIME TRACKING ────────────────────────────────────────────────────────
  timeTracking: defineTable({
    organizationId: v.optional(v.id("organizations")),
    userId: v.id("users"),
    checkInTime: v.number(),
    checkOutTime: v.optional(v.number()),
    scheduledStartTime: v.number(),
    scheduledEndTime: v.number(),
    isLate: v.boolean(),
    lateMinutes: v.optional(v.number()),
    isEarlyLeave: v.boolean(),
    earlyLeaveMinutes: v.optional(v.number()),
    overtimeMinutes: v.optional(v.number()),
    totalWorkedMinutes: v.optional(v.number()),
    status: v.union(
      v.literal("checked_in"),
      v.literal("checked_out"),
      v.literal("absent"),
    ),
    date: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_date", ["date"])
    .index("by_user_date", ["userId", "date"])
    .index("by_status", ["status"]),

  // ── SUPERVISOR RATINGS ───────────────────────────────────────────────────
  supervisorRatings: defineTable({
    organizationId: v.optional(v.id("organizations")),
    employeeId: v.id("users"),
    supervisorId: v.id("users"),
    qualityOfWork: v.number(),
    efficiency: v.number(),
    teamwork: v.number(),
    initiative: v.number(),
    communication: v.number(),
    reliability: v.number(),
    overallRating: v.number(),
    strengths: v.optional(v.string()),
    areasForImprovement: v.optional(v.string()),
    generalComments: v.optional(v.string()),
    ratingPeriod: v.string(),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_employee", ["employeeId"])
    .index("by_supervisor", ["supervisorId"])
    .index("by_period", ["ratingPeriod"]),

  // ── TASKS ────────────────────────────────────────────────────────────────
  tasks: defineTable({
    organizationId: v.optional(v.id("organizations")),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.id("users"),
    assignedBy: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    deadline: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    attachmentUrl: v.optional(v.string()),
    attachments: v.optional(v.array(v.object({
      url: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
      uploadedBy: v.id("users"),
      uploadedAt: v.number(),
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_assigned_to", ["assignedTo"])
    .index("by_assigned_by", ["assignedBy"])
    .index("by_status", ["status"])
    .index("by_deadline", ["deadline"]),

  // ── TASK COMMENTS ────────────────────────────────────────────────────────
  taskComments: defineTable({
    taskId: v.id("tasks"),
    authorId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_task", ["taskId"]),

  // ── WORK SCHEDULE ────────────────────────────────────────────────────────
  workSchedule: defineTable({
    organizationId: v.optional(v.id("organizations")),
    userId: v.id("users"),
    startTime: v.string(),
    endTime: v.string(),
    workingDays: v.array(v.number()),
    timezone: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"]),
});

