import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { query } from "./_generated/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const chatHandler = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  try {
    const { messages, lang, userId, userRole, userName, userEmail } = await request.json();

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const isAdmin = userRole === "admin" || userRole === "supervisor";
    const isEmployee = !isAdmin;

    // ── Fetch real data from Convex DB ──────────────────────────────────
    let userDataContext = "";
    let teamDataContext = "";
    let userProfile: any = null;

    try {
      if (userEmail) {
        // Get user profile via email (safe string lookup)
        userProfile = await ctx.runQuery(api.users.getUserByEmail, { email: userEmail });
        const resolvedUserId = userProfile?._id;

        // Get user's own leaves
        const userLeaves = resolvedUserId
          ? await ctx.runQuery(api.leaves.getUserLeaves, { userId: resolvedUserId })
          : [];
        const myLeaves = Array.isArray(userLeaves) ? userLeaves : [];

        const today = new Date().toISOString().split("T")[0];
        const approved = myLeaves.filter(l => l.status === "approved");
        const pending = myLeaves.filter(l => l.status === "pending");
        const totalDaysUsed = approved.reduce((s, l) => s + (l.days ?? 0), 0);

        // Calendar: current + upcoming approved leaves
        const currentLeave = approved.find(l => l.startDate <= today && l.endDate >= today);
        const upcomingLeaves = approved
          .filter(l => l.startDate > today)
          .sort((a, b) => a.startDate.localeCompare(b.startDate));
        const pastLeaves = approved
          .filter(l => l.endDate < today)
          .sort((a, b) => b.startDate.localeCompare(a.startDate));

        userDataContext = `
=== YOUR PROFILE ===
Name: ${userProfile?.name ?? userName}
Role: ${userProfile?.role ?? userRole}
Department: ${userProfile?.department ?? "N/A"}
Position: ${userProfile?.position ?? "N/A"}
User ID: ${userProfile?._id ?? userId}
Today's date: ${today}
Paid Leave Balance: ${(userProfile as any)?.leaveBalance?.paid ?? (userProfile as any)?.paidLeaveBalance ?? 20} days
Sick Leave Balance: ${(userProfile as any)?.leaveBalance?.sick ?? (userProfile as any)?.sickLeaveBalance ?? 10} days
Family Leave Balance: ${(userProfile as any)?.leaveBalance?.family ?? (userProfile as any)?.familyLeaveBalance ?? 5} days

=== YOUR PERSONAL CALENDAR / SCHEDULE ===
${currentLeave
  ? `🏖 CURRENTLY ON LEAVE: ${currentLeave.type} leave from ${currentLeave.startDate} to ${currentLeave.endDate} (${currentLeave.days} days) — "${currentLeave.reason ?? ""}"`
  : `✅ You are NOT currently on leave. Today (${today}) is a working day.`}

UPCOMING APPROVED LEAVES (${upcomingLeaves.length}):
${upcomingLeaves.slice(0, 10).map(l =>
  `  📅 ${l.type} leave: ${l.startDate} → ${l.endDate} (${l.days} days)${l.reason ? ` — "${l.reason}"` : ""}`
).join("\n") || "  No upcoming approved leaves."}

PENDING REQUESTS (${pending.length}):
${pending.slice(0, 5).map(l =>
  `  ⏳ ${l.type} leave: ${l.startDate} → ${l.endDate} (${l.days} days) — waiting for approval`
).join("\n") || "  No pending requests."}

PAST LEAVES (last 5):
${pastLeaves.slice(0, 5).map(l =>
  `  ✔ ${l.type} leave: ${l.startDate} → ${l.endDate} (${l.days} days)`
).join("\n") || "  No past leaves."}

=== YOUR LEAVE STATISTICS ===
Total Requests: ${myLeaves.length}
Approved: ${approved.length} (${totalDaysUsed} days used)
Pending: ${pending.length}
Rejected: ${myLeaves.filter(l => l.status === "rejected").length}

=== ALL YOUR LEAVES (with IDs for edit/delete actions) ===
${myLeaves.slice(0, 15).map(l =>
  `- ID:${l._id} | ${l.type} | ${l.startDate}→${l.endDate} (${l.days}d) | ${l.status}${l.reason ? ` | "${l.reason}"` : ""}`
).join("\n") || "No leave requests yet."}`;
      }

      // All users get team calendar (who else is on leave)
      // Use the resolved userId or fallback to the userId from request
      const requesterId = userProfile?._id ?? userId;
      const allLeaves = requesterId 
        ? await ctx.runQuery(api.leaves.getAllLeaves, { requesterId })
        : [];
      const allUsers = requesterId 
        ? await ctx.runQuery(api.users.getAllUsers, { requesterId })
        : [];

      const leavesArr = Array.isArray(allLeaves) ? allLeaves : [];
      const usersArr = Array.isArray(allUsers) ? allUsers : [];

      const todayStr = new Date().toISOString().split("T")[0];
      const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const onLeaveToday = leavesArr.filter(l =>
        l.status === "approved" && l.startDate <= todayStr && l.endDate >= todayStr
      );
      const upcomingTeamLeaves = leavesArr.filter(l =>
        l.status === "approved" && l.startDate > todayStr && l.startDate <= in90Days
      ).sort((a, b) => a.startDate.localeCompare(b.startDate));

      teamDataContext = `
=== TEAM CALENDAR ===
Colleagues On Leave Today (${onLeaveToday.length}):
${onLeaveToday.slice(0, 10).map(l =>
  `  - ${(l as any).userName ?? "Unknown"} (${(l as any).userDepartment ?? ""}): ${l.type} leave until ${l.endDate}`
).join("\n") || "  Nobody on leave today."}

Upcoming Team Leaves (next 90 days, ${upcomingTeamLeaves.length} total):
${upcomingTeamLeaves.slice(0, 10).map(l =>
  `  - ${(l as any).userName ?? "Unknown"} (${(l as any).userDepartment ?? ""}): ${l.type} ${l.startDate}→${l.endDate} (${l.days}d)`
).join("\n") || "  No upcoming team leaves."}`;

      if (isAdmin) {
        const pendingLeaves = leavesArr.filter(l => l.status === "pending");

        teamDataContext += `

=== ADMIN: FULL TEAM DATA ===
Total Employees: ${usersArr.length}
Pending Leave Requests: ${pendingLeaves.length}
Employees On Leave Today: ${onLeaveToday.length}

=== PENDING REQUESTS (need review — use IDs to approve/reject) ===
${pendingLeaves.slice(0, 10).map(l =>
  `- ID:${l._id} | ${(l as any).userName ?? "Unknown"} (${(l as any).userDepartment ?? ""}): ${l.type} ${l.startDate}→${l.endDate} (${l.days}d) | "${l.reason}"`
).join("\n") || "No pending requests."}

=== ALL RECENT LEAVES ===
${leavesArr.slice(0, 10).map(l =>
  `- ${(l as any).userName ?? "Unknown"}: ${l.type} ${l.startDate}→${l.endDate} (${l.days}d) — ${l.status}`
).join("\n")}`;
      }
    } catch (dbErr) {
      // DB fetch failed — continue without real data
      console.error("DB fetch error:", dbErr);
    }

    // ── Build system prompt ─────────────────────────────────────────────
    const langInstruction = lang === "ru"
      ? "Пользователь пишет на русском. Отвечай ТОЛЬКО на русском языке."
      : "The user is writing in English. Reply ONLY in English.";

    const capabilities = isAdmin
      ? `As an ADMIN/SUPERVISOR you can:
- View ALL employee leave requests and team data
- Approve OR reject any leave request
- Create leave requests for any employee
- Delete any leave request
- View team statistics and analytics`
      : `As an EMPLOYEE you can:
- View your own leave balance and history
- Create new leave requests for yourself
- Edit or delete only your OWN pending requests (cannot touch approved/rejected)
- View general HR policies`;

    const actionInstructions = `
== HOW TO PERFORM ACTIONS ==
When the user asks you to CREATE, APPROVE, REJECT, DELETE, or EDIT a leave — you MUST respond with a special JSON block embedded in your message like this:

For creating a leave:
<ACTION>{"type":"create_leave","params":{"userId":"<id>","userName":"<name>","type":"paid|sick|family|doctor|unpaid","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","days":<number>,"reason":"<reason>"}}</ACTION>

For approving a leave (admin only):
<ACTION>{"type":"approve_leave","params":{"leaveId":"<_id>","comment":"<optional comment>"}}</ACTION>

For rejecting a leave (admin only):
<ACTION>{"type":"reject_leave","params":{"leaveId":"<_id>","comment":"<reason>"}}</ACTION>

For updating/editing a leave (employee: only own pending; admin: any):
<ACTION>{"type":"update_leave","params":{"leaveId":"<_id>","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","days":<number>,"type":"paid|sick|family|doctor|unpaid","reason":"<reason>"}}</ACTION>

For deleting a leave (employee: only own pending; admin: any):
<ACTION>{"type":"delete_leave","params":{"leaveId":"<_id>"}}</ACTION>

RULES FOR ACTIONS:
⚠️ MOST IMPORTANT RULE: NEVER generate an <ACTION> block unless the user has EXPLICITLY confirmed they want to submit/create/approve/delete.

CONFIRMATION FLOW (MANDATORY):
1. If user asks about available dates, balances, or says "I want to take leave" → Show them a smart summary with suggestions (dates, days count, balance remaining). Do NOT create the leave yet. End with: "Shall I submit this request?" or "Хотите подать заявку?"
2. ONLY when user says "yes", "submit", "send", "да", "отправь", "подай", "confirm", "создай", "go ahead" → THEN generate the <ACTION> block
3. If user just asks a question ("what dates are available?", "how many days do I have?", "какие даты?") → Answer informatively, suggest options, but do NOT create anything

- Always check leave balance before suggesting dates
- For dates, always use YYYY-MM-DD format
- Calculate days correctly (end-start+1)
- After the ACTION block, write a friendly confirmation message
- If you need missing info (like dates or reason), ASK the user first before generating the ACTION block
- Employee can only delete their OWN pending leaves (not approved/rejected)
- Admin can approve/reject/delete any leave

== HOW TO SHOW CALENDAR / SCHEDULE DATA ==
When the user asks about their calendar, schedule, leaves, vacations, отпуск, расписание — you MUST include a structured CALENDAR block so the app can render a beautiful visual card. Include it AFTER your friendly text reply:

<CALENDAR>
{
  "title": "Your Leave Schedule",
  "current": { "type": "paid|sick|family|doctor|unpaid|null", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "days": 5, "status": "approved" },
  "upcoming": [
    { "type": "paid", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "days": 3, "status": "approved", "reason": "vacation" }
  ],
  "pending": [
    { "type": "sick", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "days": 2, "status": "pending" }
  ],
  "balances": { "paid": 15, "sick": 8, "family": 5 },
  "teamOnLeaveToday": [
    { "name": "John Doe", "department": "IT", "type": "paid", "endDate": "YYYY-MM-DD" }
  ]
}
</CALENDAR>

RULES FOR CALENDAR BLOCK:
- Include <CALENDAR> block whenever user asks about their calendar, schedule, leaves, vacations, отпуск, расписание, кто на отпуске
- Use ONLY real data from the database sections above — do NOT invent dates
- If current leave is null, omit the "current" field or set it to null
- If no upcoming leaves, set "upcoming" to []
- If no pending, set "pending" to []
- Always include "balances" from the profile data above
- For "teamOnLeaveToday", use data from TEAM CALENDAR section above
- The CALENDAR block is parsed by the app — keep it valid JSON`;

    const systemPrompt = `You are an intelligent HR AI assistant for an office leave management system called HRLeave.

${capabilities}

${actionInstructions}

CRITICAL KNOWLEDGE — READ CAREFULLY:
- You have FULL ACCESS to the user's personal calendar, schedule, leave history, and HR data from the live database
- The user's "calendar" and "schedule" IS their leave data — all approved, pending, and past leaves are shown below
- NEVER say "I don't have access to your calendar" or "I cannot see your schedule" — you have full access
- NEVER say "I don't have access to your personal calendar" — you DO have it (shown in YOUR PERSONAL CALENDAR section below)
- When asked about "my calendar", "my schedule", "my vacations", "my отпуск", "my расписание" — answer using the data below
- When asked about approved/upcoming/past leaves — use the CALENDAR section below
- When asked about leave balances — use the PROFILE section below
- Always give specific dates, types, and counts from the real data

IMPORTANT:
- You have access to REAL live data from the database (shown below) — use it accurately
- Be concise, helpful, and friendly. Use emojis occasionally 😊
- Today's date: ${new Date().toISOString().split("T")[0]}
- If the user asks about their calendar/schedule and they have no leaves, say "You have no scheduled leaves/vacations at this time" — do NOT say you lack access

${userDataContext}
${teamDataContext}

${langInstruction}`;

    // ── Call Groq ───────────────────────────────────────────────────────
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      // Handle rate limit specifically
      if (groqResponse.status === 429) {
        let retryAfter = '';
        try {
          const errJson = JSON.parse(err);
          const msg: string = errJson?.error?.message ?? '';
          const match = msg.match(/Please try again in ([^.]+)/);
          if (match) retryAfter = match[1].trim();
        } catch {}
        const friendlyMsg = retryAfter
          ? `⏳ AI limit reached. Please try again in ${retryAfter}.`
          : '⏳ AI limit reached. Please try again in a few minutes.';
        return new Response(
          JSON.stringify({ error: friendlyMsg, code: 'rate_limit' }),
          { status: 429, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Groq error: ${err}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const data = await groqResponse.json();
    const content = data.choices?.[0]?.message?.content ?? "Sorry, I could not process that.";

    return new Response(
      JSON.stringify({ content }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION QUERIES — expose messenger functions through chat module
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get my conversations (for compatibility with client expectations)
 * Calls messenger.getMyConversations internally
 */
export const getMyConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const result = await ctx.runQuery(api.messenger.getMyConversations, { userId });
    return result;
  },
});

/**
 * Get incoming calls (for compatibility with client expectations)
 * Calls messenger.getIncomingCalls internally
 */
export const getIncomingCalls = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const result = await ctx.runQuery(api.messenger.getIncomingCalls, { userId });
    return result;
  },
});

/**
 * Get total unread count (for compatibility with client expectations)
 * Calls messenger.getTotalUnread internally
 */
export const getTotalUnread = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const result = await ctx.runQuery(api.messenger.getTotalUnread, { userId });
    return result;
  },
});
