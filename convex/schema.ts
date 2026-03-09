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
    location: v.optional(v.string()),
    totpEnabled: v.optional(v.boolean()),
    totpSecret: v.optional(v.string()),
    workHoursStart: v.optional(v.string()),
    workHoursEnd: v.optional(v.string()),
    backupCodes: v.optional(v.array(v.string())),
    breakInterval: v.optional(v.number()),
    breakRemindersEnabled: v.optional(v.boolean()),
    dailyTaskGoal: v.optional(v.number()),
    faceIdBlocked: v.optional(v.boolean()),
    faceIdFailedAttempts: v.optional(v.number()),
    faceIdLastAttempt: v.optional(v.number()),
    focusModeEnabled: v.optional(v.boolean()),
    isSuspended: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
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
    isRead: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // ── CONVERSATIONS (legacy mobile — kept for data compat) ─────────
  conversations: defineTable({
    type: v.union(v.literal("personal"), v.literal("group")),
    name: v.optional(v.string()),
    createdBy: v.id("users"),
    lastMessageAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_last_message", ["lastMessageAt"])
    .index("by_created_by", ["createdBy"]),

  conversationParticipants: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    lastReadAt: v.optional(v.number()),
    isMuted: v.boolean(),
    joinedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    type: v.union(
      v.literal("text"),
      v.literal("file"),
      v.literal("poll"),
      v.literal("system"),
    ),
    content: v.optional(v.string()),
    mentions: v.optional(v.array(v.id("users"))),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    pollId: v.optional(v.id("polls")),
    scheduledFor: v.optional(v.number()),
    isDelivered: v.boolean(),
    isDeleted: v.boolean(),
    reactions: v.optional(v.any()),
    parentMessageId: v.optional(v.id("messages")),
    threadCount: v.optional(v.number()),
    threadLastAt: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
    pinnedBy: v.optional(v.id("users")),
    pinnedAt: v.optional(v.number()),
    isEdited: v.optional(v.boolean()),
    editedAt: v.optional(v.number()),
    replyToId: v.optional(v.id("messages")),
    replyToContent: v.optional(v.string()),
    replyToSenderName: v.optional(v.string()),
    readBy: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_delivered", ["conversationId", "isDelivered"])
    .index("by_sender", ["senderId"])
    .index("by_scheduled", ["isDelivered", "scheduledFor"])
    .index("by_parent", ["parentMessageId"]),

  // ── CHAT CONVERSATIONS (shared with desktop) ───────────────────────
  chatConversations: defineTable({
    organizationId: v.id("organizations"),
    type: v.union(v.literal("direct"), v.literal("group")),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdBy: v.id("users"),
    lastMessageAt: v.optional(v.number()),
    lastMessageText: v.optional(v.string()),
    lastMessageSenderId: v.optional(v.id("users")),
    dmKey: v.optional(v.string()),
    isPinned: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    isDeleted: v.optional(v.boolean()),
    deletedBy: v.optional(v.id("users")),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_last", ["organizationId", "lastMessageAt"])
    .index("by_dm_key", ["dmKey"])
    .index("by_creator", ["createdBy"])
    .index("by_org_not_deleted", ["organizationId", "isDeleted"])
    .index("by_org_pinned", ["organizationId", "isPinned"])
    .index("by_org_archived", ["organizationId", "isArchived"]),

  // ── CHAT MEMBERS (shared with desktop) ─────────────────────────────
  chatMembers: defineTable({
    conversationId: v.id("chatConversations"),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    unreadCount: v.number(),
    lastReadAt: v.optional(v.number()),
    lastReadMessageId: v.optional(v.id("chatMessages")),
    isMuted: v.boolean(),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    isArchived: v.optional(v.boolean()),
    joinedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_org", ["organizationId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  // ── CHAT MESSAGES (shared with desktop) ────────────────────────────
  chatMessages: defineTable({
    conversationId: v.id("chatConversations"),
    organizationId: v.id("organizations"),
    senderId: v.id("users"),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("file"),
      v.literal("audio"),
      v.literal("system"),
      v.literal("call"),
    ),
    content: v.string(),
    attachments: v.optional(v.array(v.object({
      url: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
    }))),
    replyToId: v.optional(v.id("chatMessages")),
    replyToContent: v.optional(v.string()),
    replyToSenderName: v.optional(v.string()),
    reactions: v.optional(v.any()),
    mentionedUserIds: v.optional(v.array(v.id("users"))),
    readBy: v.optional(v.any()),
    poll: v.optional(v.object({
      question: v.string(),
      options: v.array(v.object({
        id: v.string(),
        text: v.string(),
        votes: v.array(v.id("users")),
      })),
      closedAt: v.optional(v.number()),
    })),
    threadCount: v.optional(v.number()),
    threadLastAt: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
    isSent: v.optional(v.boolean()),
    linkPreview: v.optional(v.object({
      url: v.string(),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      siteName: v.optional(v.string()),
    })),
    parentMessageId: v.optional(v.id("chatMessages")),
    isEdited: v.optional(v.boolean()),
    editedAt: v.optional(v.number()),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    deletedForUsers: v.optional(v.array(v.id("users"))),
    isPinned: v.optional(v.boolean()),
    pinnedBy: v.optional(v.id("users")),
    pinnedAt: v.optional(v.number()),
    callDuration: v.optional(v.number()),
    callType: v.optional(v.union(v.literal("audio"), v.literal("video"))),
    callStatus: v.optional(v.union(v.literal("missed"), v.literal("answered"), v.literal("declined"))),
    isServiceBroadcast: v.optional(v.boolean()),
    broadcastTitle: v.optional(v.string()),
    broadcastIcon: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"])
    .index("by_org", ["organizationId"])
    .index("by_sender", ["senderId"])
    .index("by_pinned", ["conversationId", "isPinned"]),

  // ── CHAT TYPING (shared with desktop) ──────────────────────────────
  chatTyping: defineTable({
    conversationId: v.id("chatConversations"),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  // ── POLLS ─────────────────────────────────────────────────────────
  polls: defineTable({
    conversationId: v.id("conversations"),
    createdBy: v.id("users"),
    question: v.string(),
    options: v.array(v.object({
      id: v.string(),
      text: v.string(),
    })),
    isClosed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"]),

  // ── POLL VOTES ────────────────────────────────────────────────────
  pollVotes: defineTable({
    pollId: v.id("polls"),
    userId: v.id("users"),
    optionId: v.string(),
    createdAt: v.number(),
  })
    .index("by_poll", ["pollId"])
    .index("by_poll_user", ["pollId", "userId"]),

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
      v.literal("message_mention"),
      v.literal("status_change"),
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

