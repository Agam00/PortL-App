/**
 * Test driver — acts as resident/guard against the LIVE api (localhost:8000)
 * so admin screens get real, service-generated data (incl. notifications).
 * Run: apps/api/node_modules/.bin/tsx apps/api/_driver.ts <phase> [arg]
 * Phases: check | visitors | complaints | community | vote | book | pay | claim <CODE>
 */
import { createTRPCClient, httpBatchLink, type ServerRouter } from "@repo/trpc/client";

const API = process.env.API_URL || "http://localhost:8000/trpc";
const PASS = "Portl@123";

function makeClient(token?: string) {
  return createTRPCClient<ServerRouter>({
    links: [httpBatchLink({ url: API, headers: () => (token ? { Authorization: `Bearer ${token}` } : {}) })],
  });
}
const anon = makeClient();

type Sess = { token: string; user: any; c: ReturnType<typeof makeClient> };
async function login(identifier: string): Promise<Sess> {
  const res = await anon.auth.login.mutate({ identifier, password: PASS });
  return { token: res.accessToken, user: res.user, c: makeClient(res.accessToken) };
}
const R = (n: number) => login(`resident${n}@portl.dev`);
const today = () => new Date().toISOString().slice(0, 10);
const log = (...a: any[]) => console.log(...a);

async function phaseVisitors() {
  const g = await login("guard1@portl.dev");
  const r1 = await R(1);
  const r2 = await R(2);

  await g.c.visitors.create.mutate({ flatId: r1.user.flatId, name: "Zomato Delivery", type: "delivery", phone: "+919000000011" });
  log(`  • Guard logged a PENDING delivery "Zomato Delivery" -> ${r1.user.fullName}'s flat`);

  const guest: any = await g.c.visitors.create.mutate({ flatId: r2.user.flatId, name: "Meera (Guest)", type: "guest", phone: "+919000000012" });
  await r2.c.visitors.decide.mutate({ visitorId: guest.id, decision: "approved" });
  await g.c.visitors.markEntry.mutate({ visitorId: guest.id });
  log(`  • Guard logged guest "Meera", ${r2.user.fullName} APPROVED, guard marked ENTRY (checked-in)`);
  log("-> Admin: pull-to-refresh Dashboard. 'Visitors today' +2, activity feed shows both.");
}

async function phaseComplaints() {
  const r4 = await R(4);
  const r5 = await R(5);
  const r1 = await R(1);
  await r4.c.complaints.create.mutate({ category: "Plumbing", title: "Kitchen sink is blocked", description: "Water isn't draining in the kitchen sink since morning." });
  await r5.c.complaints.create.mutate({ category: "Electrical", title: "Corridor light flickering", description: "The 3rd floor corridor tube light keeps flickering." });
  await r1.c.complaints.create.mutate({ category: "Noise", title: "Loud music late at night", description: "Persistent loud music after 11pm from a nearby flat." });
  log("  • 3 complaints raised (Plumbing / Electrical / Noise), all status OPEN");
  log("-> Admin: Operations tab, pull-to-refresh. 3 new tickets; test filter, expand, assign, advance status, comment.");
}

async function phaseCommunity() {
  const r1 = await R(1);
  const r2 = await R(2);
  const r3 = await R(3);
  const post: any = await r1.c.posts.create.mutate({ body: "Lost a set of keys near the Tower A lobby this evening. Please DM if found." });
  await r2.c.posts.create.mutate({ body: "Anyone up for a weekend cricket match at the common ground?" });
  await r3.c.posts.addComment.mutate({ postId: post.id, body: "I think I saw keys near the mailboxes!" });

  const contacts: any[] = await r3.c.chat.staffContacts.query();
  const admin = contacts.find((x) => x.role === "admin") ?? contacts[0];
  if (admin) {
    await r3.c.chat.send.mutate({ recipientId: admin.id, body: "Hi, what time is the water tanker expected today?" });
    log(`  • ${r3.user.fullName} sent a chat to ${admin.fullName ?? "admin"}`);
  }
  log("  • 2 posts created + 1 comment");
  log("-> Admin: Community -> Feed (pull-refresh) shows posts; test pin/remove. People tab call+chat. Chat tab shows the new message — reply to it.");
}

async function phaseVote() {
  const voters = await Promise.all([R(1), R(2), R(3), R(4)]);
  const polls: any[] = await voters[0].c.polls.listForResident.query();
  const open = polls.find((p) => !p.isClosed && (p.myVote?.length ?? 0) === 0) ?? polls.find((p) => !p.isClosed);
  if (!open) {
    log("  ! No open poll found. Admin: create a poll first, then re-run this phase.");
    return;
  }
  const opts = open.options;
  const plan = [opts[0]?.id, opts[0]?.id, opts[0]?.id, opts[1]?.id ?? opts[0]?.id];
  for (let i = 0; i < voters.length; i++) {
    try {
      await voters[i].c.polls.vote.mutate({ pollId: open.id, optionIds: [plan[i]] });
    } catch (e: any) {
      log(`  (resident${i + 1} vote skipped: ${e?.message ?? e})`);
    }
  }
  log(`  • Cast votes on poll: "${open.question}" (3x "${opts[0]?.label}", 1x "${opts[1]?.label ?? opts[0]?.label}")`);
  log("-> Admin: Polls, pull-refresh. Bars + percentages update; leading option bright orange.");
}

async function phaseBook() {
  const admin = await login("+911000000001");
  const amenities: any[] = await admin.c.amenities.list.query();
  const active = amenities.filter((a) => a.isActive);
  const amenity = active[active.length - 1] ?? amenities[amenities.length - 1];
  if (!amenity) {
    log("  ! No amenity found. Admin: create an amenity first, then re-run.");
    return;
  }
  const r6 = await R(6);
  const slots: any[] = await r6.c.amenityBookings.availableSlots.query({ amenityId: amenity.id, date: today() });
  const slot = slots.find((s) => s.bookedCount < (amenity.capacity ?? 1)) ?? slots[0];
  if (!slot) {
    log(`  ! No free slot today for ${amenity.name}.`);
    return;
  }
  await r6.c.amenityBookings.create.mutate({ amenityId: amenity.id, date: today(), slotStart: slot.slotStart });
  log(`  • ${r6.user.fullName} booked ${amenity.name} @ ${slot.slotStart} today`);
  log(`-> Admin: Amenities -> tap "Booking Oversight" on ${amenity.name}. The booking shows.`);
}

async function phasePay() {
  for (let i = 1; i <= 8; i++) {
    const r = await R(i);
    const dues: any[] = await r.c.dues.mine.query();
    const pending = dues.find((d) => d.status !== "paid");
    if (pending) {
      await r.c.dues.payMock.mutate({ dueId: pending.id });
      log(`  • ${r.user.fullName} PAID due ${pending.amount} (flat ${pending.flatNumber ?? "?"})`);
      log("-> Admin: Dues, pull-refresh. That row flips to PAID; Collected/Pending tiles update.");
      return;
    }
  }
  log("  ! No pending due found for any resident. Admin: generate a due first, then re-run.");
}

async function phaseClaim(code?: string) {
  if (!code) return log("  ! Usage: claim <CODE>");
  const res: any = await anon.auth.claimAccount.mutate({ code, password: "NewPass@123" });
  log(`  • Activated account for ${res.user?.fullName ?? "user"} — they can now log in with password NewPass@123`);
}

async function main() {
  const phase = process.argv[2] ?? "check";
  const arg = process.argv[3];
  log(`\n=== phase: ${phase} ===`);
  switch (phase) {
    case "check": {
      const r = await R(1);
      const g = await login("guard1@portl.dev");
      log("OK resident:", r.user.fullName, "| guard:", g.user.fullName, "| API reachable");
      break;
    }
    case "visitors": await phaseVisitors(); break;
    case "complaints": await phaseComplaints(); break;
    case "community": await phaseCommunity(); break;
    case "vote": await phaseVote(); break;
    case "book": await phaseBook(); break;
    case "pay": await phasePay(); break;
    case "claim": await phaseClaim(arg); break;
    default: log("Unknown phase.");
  }
  log("");
}

main().then(() => setTimeout(() => process.exit(0), 150)).catch((e) => {
  console.error("DRIVER ERROR:", e?.message ?? e);
  process.exit(1);
});
