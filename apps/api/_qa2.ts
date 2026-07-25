/**
 * Automated backend QA — PART 2. Covers items the first suite skipped:
 * guard invite + deactivate, poll create/multi/close, amenity & staff admin CRUD,
 * cab/service pre-approvals, cancel pre-approval, residents search/directory,
 * notice react/comment, complaint comments, post pin/delete, chat threads,
 * push-token register, guard→admin RBAC, service requests.
 * Run AFTER a fresh seed against a CURRENT build.
 */
import { createTRPCClient, httpBatchLink, type ServerRouter } from "@repo/trpc/client";

const API = process.env.API_URL || "http://localhost:8000/trpc";
const PASS = "Portl@123";
type C = ReturnType<typeof mk>;
function mk(token?: string) {
  return createTRPCClient<ServerRouter>({
    links: [httpBatchLink({ url: API, headers: () => (token ? { Authorization: `Bearer ${token}` } : {}) })],
  });
}
const anon = mk();
type Sess = { id: string; token: string; refresh: string; user: any; c: C };
async function login(identifier: string, password = PASS): Promise<Sess> {
  const r = await anon.auth.login.mutate({ identifier, password });
  return { id: r.user.id, token: r.accessToken, refresh: r.refreshToken, user: r.user, c: mk(r.accessToken) };
}

type Row = { phase: string; name: string; ok: boolean; detail: string };
const rows: Row[] = [];
let curPhase = "";
const phase = (p: string) => (curPhase = p);
function rec(name: string, ok: boolean, detail = "") {
  rows.push({ phase: curPhase, name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
function errInfo(e: any) {
  const code = e?.data?.code ?? e?.shape?.data?.code ?? e?.cause?.data?.code;
  return { code, msg: (e?.message ?? String(e)).split("\n")[0] };
}
async function check(name: string, fn: () => Promise<any>) {
  try { const d = await fn(); rec(name, true, typeof d === "string" ? d : ""); }
  catch (e) { const { code, msg } = errInfo(e); rec(name, false, `threw ${code ?? ""} ${msg}`); }
}
async function expectErr(name: string, want: string, fn: () => Promise<any>) {
  try { await fn(); rec(name, false, "expected an error but call succeeded"); }
  catch (e) {
    const { code, msg } = errInfo(e);
    const ok = `${code ?? ""} ${msg}`.toLowerCase().includes(want.toLowerCase());
    rec(name, ok, ok ? `correctly rejected (${code ?? msg})` : `threw but not "${want}": ${code} ${msg}`);
  }
}
const iso = (d: Date) => d.toISOString();
const todayStr = () => new Date().toISOString().slice(0, 10);
function assert(c: any, m: string) { if (!c) throw new Error(m); }

async function main() {
  console.log("\n============ PORTL BACKEND QA — PART 2 ============\n");
  const admin = await login("admin@portl.dev");
  const g1 = await login("guard1@portl.dev");
  const g2 = await login("guard2@portl.dev");
  const r1 = await login("resident1@portl.dev");
  const r2 = await login("resident2@portl.dev");
  const r4 = await login("resident4@portl.dev");
  const nowIso = iso(new Date());
  const tomorrowIso = iso(new Date(Date.now() + 864e5));

  // ---------------- Phase 2C: Guards ----------------
  phase("2C. Guards management");
  await check("2.14 invite guard → code + lookup shows guard role", async () => {
    const inv = await admin.c.admin.inviteGuard.mutate({
      fullName: "QA Guard", email: `qaguard_${Date.now()}@portl.dev`, phone: `+9198${Date.now().toString().slice(-8)}`,
    });
    assert(inv.inviteCode, "no invite code");
    const look = await anon.auth.lookupInvite.query({ code: inv.inviteCode });
    assert(look.role === "guard", `role=${look.role}`);
    await admin.c.admin.deleteUser.mutate({ userId: inv.user.id }); // cleanup
    return "guard invited + verified";
  });
  await check("2.15 deactivate guard blocks login, reactivate restores", async () => {
    await admin.c.admin.deactivateUser.mutate({ userId: g2.id });
    let blocked = false;
    try { await anon.auth.login.mutate({ identifier: "guard2@portl.dev", password: PASS }); }
    catch { blocked = true; }
    await admin.c.admin.activateUser.mutate({ userId: g2.id });
    await login("guard2@portl.dev");
    assert(blocked, "deactivated guard could still log in");
    return "guard access toggles correctly";
  });

  // ---------------- Phase 2D: Polls ----------------
  phase("2D/6B. Polls");
  await check("2.18/6.4 create single-choice poll → resident votes", async () => {
    await admin.c.polls.create.mutate({ question: "QA single poll?", options: ["Alpha", "Beta"] });
    const polls: any[] = await r1.c.polls.listForResident.query();
    const p = polls.find((x) => x.question === "QA single poll?");
    assert(p, "poll not visible to resident");
    await r1.c.polls.vote.mutate({ pollId: p.id, optionIds: [p.options[0].id] });
    const after: any[] = await r1.c.polls.listForResident.query();
    const voted = after.find((x) => x.id === p.id);
    assert((voted.myVote?.length ?? 0) === 1, "vote not recorded");
    return "single poll created + voted";
  });
  await check("6.5 multi-select poll accepts multiple options", async () => {
    await admin.c.polls.create.mutate({ question: "QA multi poll?", multiSelect: true, options: ["One", "Two", "Three"] });
    const polls: any[] = await r2.c.polls.listForResident.query();
    const p = polls.find((x) => x.question === "QA multi poll?");
    assert(p && p.multiSelect, "multi poll missing/flag off");
    await r2.c.polls.vote.mutate({ pollId: p.id, optionIds: [p.options[0].id, p.options[1].id] });
    const after: any[] = await r2.c.polls.listForResident.query();
    assert((after.find((x) => x.id === p.id).myVote?.length ?? 0) === 2, "multi-vote not recorded");
    return "2 options recorded";
  });
  await check("6.6 admin closes poll → resident can't vote", async () => {
    await admin.c.polls.create.mutate({ question: "QA closed poll?", options: ["Yes", "No"] });
    let polls: any[] = await r4.c.polls.listForResident.query();
    const p = polls.find((x) => x.question === "QA closed poll?");
    await admin.c.polls.close.mutate({ pollId: p.id });
    let blocked = false;
    try { await r4.c.polls.vote.mutate({ pollId: p.id, optionIds: [p.options[0].id] }); }
    catch { blocked = true; }
    assert(blocked, "voting on a closed poll was allowed");
    return "closed poll rejects votes";
  });

  // ---------------- Phase 2D: Amenities admin CRUD ----------------
  phase("2D/7. Amenities admin CRUD");
  await check("2.21 amenity create → update → remove", async () => {
    const created: any = await admin.c.amenities.create.mutate({
      name: "QA Sauna", capacity: 4, openTime: "06:00", closeTime: "22:00", slotMinutes: 60,
    });
    const list1: any[] = await admin.c.amenities.list.query();
    const found = list1.find((a) => a.name === "QA Sauna");
    assert(found, "created amenity not listed");
    await admin.c.amenities.update.mutate({ amenityId: found.id, capacity: 8 });
    const list2: any[] = await admin.c.amenities.list.query();
    assert(list2.find((a) => a.id === found.id)?.capacity === 8, "update not applied");
    await admin.c.amenities.remove.mutate({ amenityId: found.id });
    const list3: any[] = await admin.c.amenities.list.query();
    assert(!list3.find((a) => a.id === found.id), "amenity not removed");
    return "create/update/remove OK";
  });

  // ---------------- Phase 2D: Staff directory admin CRUD ----------------
  phase("2D/9. Staff directory admin CRUD");
  await check("2.22 staff create → update → remove", async () => {
    const created: any = await admin.c.staffDirectory.create.mutate({
      name: "QA Plumber", category: "Plumber", phone: "+919000000099",
    });
    const l1: any[] = await admin.c.staffDirectory.list.query();
    const found = l1.find((s) => s.name === "QA Plumber");
    assert(found, "created staff not listed");
    await admin.c.staffDirectory.update.mutate({ staffId: found.id, category: "Electrician" });
    const l2: any[] = await admin.c.staffDirectory.list.query();
    assert(l2.find((s) => s.id === found.id)?.category === "Electrician", "update not applied");
    await admin.c.staffDirectory.remove.mutate({ staffId: found.id });
    const l3: any[] = await admin.c.staffDirectory.list.query();
    assert(!l3.find((s) => s.id === found.id), "staff not removed");
    return "create/update/remove OK";
  });

  // ---------------- Phase 4B: pre-approval variants ----------------
  phase("4B. Pre-approval variants");
  await check("4.7 cab + service pre-approvals generate passes", async () => {
    const cab: any = await r1.c.visitors.preApprove.mutate({
      name: "QA Cab", phone: "+919000000031", type: "cab", validFrom: nowIso, validUntil: tomorrowIso,
    });
    const svc: any = await r1.c.visitors.preApprove.mutate({
      name: "QA Electrician", phone: "+919000000032", type: "service", validFrom: nowIso, validUntil: tomorrowIso,
    });
    assert(cab.passCode && svc.passCode, "missing pass code");
    return `cab ${cab.passCode}, service ${svc.passCode}`;
  });
  let cancelledCode = "";
  await check("4.9 cancel pre-approval removes it from the active list", async () => {
    const v: any = await r1.c.visitors.preApprove.mutate({
      name: "QA Cancelme", phone: "+919000000033", type: "guest", validFrom: nowIso, validUntil: tomorrowIso,
    });
    cancelledCode = v.passCode;
    await r1.c.visitors.cancelPreApproval.mutate({ visitorId: v.id });
    const list: any[] = await r1.c.visitors.listPreApprovedForResident.query();
    const still = list.find((x) => x.id === v.id);
    assert(!still || still.status === "cancelled", "cancel not reflected");
    return "cancelled";
  });
  await check("4.10 my pre-approvals list returns active passes", async () => {
    const list: any[] = await r1.c.visitors.listPreApprovedForResident.query();
    assert(Array.isArray(list) && list.length > 0, "empty pre-approval list");
    return `${list.length} passes`;
  });
  await check("5.9 guard lookup of a cancelled pass code is rejected/blocked", async () => {
    let rejected = false, note = "";
    try {
      const v: any = await g1.c.visitors.lookupByPassCode.query({ code: cancelledCode });
      if (!v || v.status === "cancelled") { rejected = true; note = "returns cancelled status"; }
    } catch { rejected = true; note = "throws"; }
    assert(rejected, "cancelled pass still resolves as valid");
    return note;
  });

  // ---------------- Phase 5A/D: residents search + directory ----------------
  phase("5. Guard resident lookup");
  await check("5.3 residents search: match + no-match handled", async () => {
    const hit: any[] = await g1.c.residents.search.query({ query: "Priya" });
    const miss: any[] = await g1.c.residents.search.query({ query: "zzzznobody" });
    assert(hit.length > 0, "known resident not found");
    assert(Array.isArray(miss) && miss.length === 0, "no-match should be empty");
    return `${hit.length} hit, 0 on no-match`;
  });
  await check("5.17 residents directory returns roster", async () => {
    const dir: any[] = await g1.c.residents.directory.query();
    assert(Array.isArray(dir) && dir.length > 0, "empty directory");
    return `${dir.length} entries`;
  });

  // ---------------- Phase 6A/C: notice + complaint interactions ----------------
  phase("6. Notice/complaint interactions");
  await check("6.2 react to a notice + add a comment", async () => {
    const notices: any[] = await r1.c.notices.listForResident.query({});
    assert(notices.length > 0, "no notices to react to");
    const n = notices[0];
    await r1.c.notices.react.mutate({ noticeId: n.id, reaction: "like" });
    await r1.c.notices.addComment.mutate({ noticeId: n.id, body: "QA comment on notice" });
    const comments: any[] = await r1.c.notices.listComments.query({ noticeId: n.id });
    assert(comments.some((c) => c.body === "QA comment on notice"), "comment not saved");
    return "reacted + commented";
  });
  await check("6.9 complaint comment thread works both sides", async () => {
    const c: any = await r1.c.complaints.create.mutate({
      category: "Noise", title: "QA noise", description: "Loud QA test noise.",
    });
    await r1.c.complaints.addComment.mutate({ complaintId: c.id, body: "resident note" });
    await admin.c.complaints.addComment.mutate({ complaintId: c.id, body: "admin reply" });
    const thread: any[] = await r1.c.complaints.listComments.query({ complaintId: c.id });
    assert(thread.length >= 2, `expected >=2 comments, got ${thread.length}`);
    return `${thread.length} comments`;
  });

  // ---------------- Phase 10: post pin + delete ----------------
  phase("10. Feed moderation");
  await check("10.5 admin pin a post", async () => {
    const p: any = await r1.c.posts.create.mutate({ body: "QA pin me" });
    await admin.c.posts.setPinned.mutate({ postId: p.id, pinned: true });
    const feed: any[] = await r1.c.posts.list.query();
    const pinned = feed.find((x) => x.id === p.id);
    assert(pinned?.isPinned === true, "post not pinned");
    return "pinned";
  });
  await check("10.6 admin delete a post", async () => {
    const p: any = await r1.c.posts.create.mutate({ body: "QA delete me" });
    await admin.c.posts.adminDeletePost.mutate({ postId: p.id });
    const feed: any[] = await r1.c.posts.list.query();
    assert(!feed.find((x) => x.id === p.id), "post still present after delete");
    return "deleted";
  });

  // ---------------- Phase 11: chat thread + reply ----------------
  phase("11. Chat threads");
  await check("11.3/11.4 send → recipient thread → reply → conversations", async () => {
    const contacts: any[] = await r1.c.chat.staffContacts.query();
    const target = contacts.find((x) => x.role === "admin") ?? contacts[0];
    await r1.c.chat.send.mutate({ recipientId: target.id, body: "QA hello admin" });
    const adminThread: any = await admin.c.chat.thread.query({ peerId: r1.id });
    const amsgs = Array.isArray(adminThread) ? adminThread : (adminThread?.messages ?? []);
    assert(amsgs.some((m: any) => m.body === "QA hello admin"), "recipient can't see message");
    await admin.c.chat.send.mutate({ recipientId: r1.id, body: "QA admin reply" });
    const back: any = await r1.c.chat.thread.query({ peerId: target.id });
    const bmsgs = Array.isArray(back) ? back : (back?.messages ?? []);
    assert(bmsgs.some((m: any) => m.body === "QA admin reply"), "reply not threaded");
    const convos: any[] = await r1.c.chat.conversations.query();
    assert(Array.isArray(convos) && convos.length > 0, "no conversations listed");
    return `thread + reply OK, ${convos.length} conversations`;
  });

  // ---------------- Phase 12/services: service requests ----------------
  phase("Extra. Service requests");
  await check("SR resident creates → mine → cancel", async () => {
    const sr: any = await r1.c.serviceRequests.create.mutate({ category: "Plumber", note: "QA sink leak" });
    const mine: any[] = await r1.c.serviceRequests.mine.query();
    assert(mine.some((x) => x.id === sr.id), "request not in mine");
    await r1.c.serviceRequests.cancel.mutate({ requestId: sr.id } as any);
    return "created + cancelled";
  });

  // ---------------- Phase 14: push token + RBAC ----------------
  phase("14. Push token + RBAC");
  await check("14.1 push token registers without error", async () => {
    await r1.c.pushTokens.register.mutate({ expoPushToken: "ExponentPushToken[QA-test-token]" });
    return "registered";
  });
  await expectErr("14.8 guard token → admin route = FORBIDDEN", "forbidden", () =>
    g1.c.admin.listResidents.query(),
  );

  // ---------- summary ----------
  const pass = rows.filter((r) => r.ok).length;
  const fail = rows.length - pass;
  console.log("\n============ SUMMARY (PART 2) ============");
  const byPhase = new Map<string, { p: number; f: number }>();
  for (const r of rows) { const e = byPhase.get(r.phase) ?? { p: 0, f: 0 }; r.ok ? e.p++ : e.f++; byPhase.set(r.phase, e); }
  for (const [p, e] of byPhase) console.log(`  ${e.f === 0 ? "OK " : "!! "} ${p}: ${e.p} pass, ${e.f} fail`);
  console.log(`\n  TOTAL: ${pass}/${rows.length} passed, ${fail} failed`);
  if (fail > 0) { console.log("\n  Failures:"); rows.filter((r) => !r.ok).forEach((r) => console.log(`   - [${r.phase}] ${r.name} :: ${r.detail}`)); }
  console.log("");
}
main().then(() => setTimeout(() => process.exit(0), 200)).catch((e) => { console.error("QA2 CRASHED:", e?.message ?? e); process.exit(1); });
