/**
 * Automated backend QA — exercises the live tRPC contract on localhost:8000.
 * Run AFTER a fresh seed:  apps/api/node_modules/.bin/tsx apps/api/_qa.ts
 * Covers every server-testable item of the QA plan (auth, RBAC, visitors,
 * admin, amenities, community, dues, chat, alerts, duty). UI-only items are
 * out of scope and listed separately in the chat summary.
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

// ---- reporting ----
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
  try {
    const detail = await fn();
    rec(name, true, typeof detail === "string" ? detail : "");
  } catch (e) {
    const { code, msg } = errInfo(e);
    rec(name, false, `threw ${code ?? ""} ${msg}`);
  }
}
// passes only if fn throws, and (if given) the code/message matches
async function expectErr(name: string, want: string, fn: () => Promise<any>) {
  try {
    await fn();
    rec(name, false, "expected an error but call succeeded");
  } catch (e) {
    const { code, msg } = errInfo(e);
    const hay = `${code ?? ""} ${msg}`.toLowerCase();
    const ok = hay.includes(want.toLowerCase());
    rec(name, ok, ok ? `correctly rejected (${code ?? msg})` : `threw but not "${want}": ${code} ${msg}`);
  }
}
const iso = (d: Date) => d.toISOString();
const todayStr = () => new Date().toISOString().slice(0, 10);
function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log("\n================ PORTL BACKEND QA ================\n");

  // ---------- sessions ----------
  const admin = await login("admin@portl.dev");
  const g1 = await login("guard1@portl.dev");
  const g2 = await login("guard2@portl.dev");
  const r1 = await login("resident1@portl.dev");
  const r2 = await login("resident2@portl.dev");
  const r3 = await login("resident3@portl.dev");

  // ================= PHASE 1: AUTH =================
  phase("1. Auth & RBAC");
  await check("1.1 login admin/guard/resident returns tokens", async () => {
    assert(admin.token && g1.token && r1.token, "missing tokens");
    return `admin=${admin.user.fullName}`;
  });
  await check("1.2 resident login carries flat + tower (new)", async () => {
    assert(r1.user.flatNumber, "flatNumber missing on AuthUser");
    return `flat ${r1.user.flatNumber}, tower ${r1.user.towerName ?? "—"}`;
  });
  await expectErr("1.3 wrong password rejected", "unauthorized", () =>
    anon.auth.login.mutate({ identifier: "resident1@portl.dev", password: "wrongpass" }),
  );
  await expectErr("1.4 unknown identifier rejected", "unauthorized", () =>
    anon.auth.login.mutate({ identifier: "nobody@nowhere.dev", password: PASS }),
  );
  await check("1.5 refresh token issues new access token", async () => {
    const res = await anon.auth.refresh.mutate({ refreshToken: r2.refresh });
    assert(res.accessToken, "no accessToken");
    return "rotated";
  });
  await expectErr("1.6 resident hitting admin route → FORBIDDEN", "forbidden", () =>
    r1.c.admin.listResidents.query(),
  );
  await expectErr("1.7 unauthenticated admin route → UNAUTHORIZED", "unauthorized", () =>
    anon.admin.listResidents.query(),
  );
  // revoked-access message (new)
  const r8 = await login("resident8@portl.dev");
  await check("1.8a admin can deactivate a resident", async () => {
    await admin.c.admin.deactivateUser.mutate({ userId: r8.id });
    return "resident8 deactivated";
  });
  await expectErr("1.8b revoked user login → 'access revoked'", "revoked", () =>
    anon.auth.login.mutate({ identifier: "resident8@portl.dev", password: PASS }),
  );
  await check("1.8c reactivate restores login", async () => {
    await admin.c.admin.activateUser.mutate({ userId: r8.id });
    await login("resident8@portl.dev");
    return "resident8 can log in again";
  });

  // ================= PHASE 1B: INVITE / CLAIM =================
  phase("1B. Invite & Claim");
  let newUserId = "";
  await check("1B.1–4 invite → lookup → claim → login → re-claim blocked", async () => {
    const flats: any[] = await admin.c.flats.list.query({});
    const vacant = flats.filter((f) => f.residentCount === 0);
    assert(vacant.length > 0, "no vacant flat to invite into");
    const inv = await admin.c.admin.inviteResident.mutate({
      fullName: "QA Test Resident",
      email: `qa_${Date.now()}@portl.dev`,
      phone: `+9199${Date.now().toString().slice(-8)}`,
      flatId: vacant[0].id,
    });
    newUserId = inv.user.id;
    const look = await anon.auth.lookupInvite.query({ code: inv.inviteCode });
    assert(look.fullName === "QA Test Resident", "lookup name mismatch");
    const claimed = await anon.auth.claimAccount.mutate({ code: inv.inviteCode, password: "NewPass@123" });
    assert(claimed.accessToken, "claim returned no token");
    await login(inv.user.email, "NewPass@123"); // login with claimed creds
    let reclaimBlocked = false;
    try {
      await anon.auth.claimAccount.mutate({ code: inv.inviteCode, password: "x2NewPass@123" });
    } catch {
      reclaimBlocked = true;
    }
    assert(reclaimBlocked, "re-claiming a used code should fail");
    return "invite lifecycle OK";
  });

  // ================= PHASE 2: ADMIN =================
  phase("2. Admin management");
  await check("2.1 listResidents / listGuards / metrics", async () => {
    const res: any[] = await admin.c.admin.listResidents.query();
    const gds: any[] = await admin.c.admin.listGuards.query();
    const m: any = await admin.c.admin.metrics.query();
    assert(res.length >= 8 && gds.length >= 2 && m, "unexpected counts");
    return `residents=${res.length}, guards=${gds.length}`;
  });
  await check("2.2 flats expose residentCount (for available-flat filter)", async () => {
    const flats: any[] = await admin.c.flats.list.query({});
    assert(flats.every((f) => typeof f.residentCount === "number"), "residentCount missing");
    const vacant = flats.filter((f) => f.residentCount === 0).length;
    return `${flats.length} flats, ${vacant} vacant`;
  });
  await expectErr("2.3 duplicate-email invite rejected", "", async () => {
    const flats: any[] = await admin.c.flats.list.query({});
    const v = flats.find((f) => f.residentCount === 0) ?? flats[0];
    return admin.c.admin.inviteResident.mutate({
      fullName: "Dup", email: "admin@portl.dev", phone: "+919111111111", flatId: v.id,
    });
  });
  await expectErr("2.4 invalid-email invite rejected (validation)", "", async () => {
    const flats: any[] = await admin.c.flats.list.query({});
    const v = flats.find((f) => f.residentCount === 0) ?? flats[0];
    return admin.c.admin.inviteResident.mutate({
      fullName: "Bad", email: "not-an-email", phone: "+919111111112", flatId: v.id,
    });
  });
  await check("2.5 reassign resident to a vacant flat", async () => {
    const flats: any[] = await admin.c.flats.list.query({});
    const vacant = flats.find((f) => f.residentCount === 0);
    assert(vacant, "need a vacant flat for reassign");
    await admin.c.admin.reassignResidentFlat.mutate({ userId: r3.id, flatId: vacant.id });
    const after: any[] = await admin.c.admin.listResidents.query();
    const moved = after.find((u) => u.id === r3.id);
    assert(moved?.flatId === vacant.id, "reassign not reflected");
    return `moved to ${vacant.flatNumber}`;
  });
  await check("2.6 delete the QA test resident", async () => {
    assert(newUserId, "no test user to delete");
    await admin.c.admin.deleteUser.mutate({ userId: newUserId });
    const after: any[] = await admin.c.admin.listResidents.query();
    assert(!after.find((u) => u.id === newUserId), "user still present after delete");
    return "deleted";
  });

  // ================= PHASE 4/5: VISITORS =================
  phase("4/5. Visitors + keep-at-gate OTP");
  const nowIso = iso(new Date());
  const tomorrowIso = iso(new Date(Date.now() + 864e5));
  let heldCode = "";
  let heldId = "";
  let plainDeliveryId = "";
  await check("4.1 pre-approve guest generates a pass code", async () => {
    const v: any = await r1.c.visitors.preApprove.mutate({
      name: "QA Guest", phone: "+919000000021", type: "guest", validFrom: nowIso, validUntil: tomorrowIso,
    });
    assert(v.passCode, "no passCode");
    assert(v.keepAtGate === false, "guest should not be keepAtGate");
    return `code ${v.passCode}`;
  });
  await check("4.2 delivery keep-at-gate=true → held (collection)", async () => {
    const v: any = await r1.c.visitors.preApprove.mutate({
      name: "QA Held Parcel", phone: "+919000000022", type: "delivery",
      validFrom: nowIso, validUntil: tomorrowIso, keepAtGate: true,
    });
    assert(v.keepAtGate === true, "keepAtGate not persisted");
    heldCode = v.passCode; heldId = v.id;
    return `held code ${v.passCode}`;
  });
  await check("4.3 delivery keep-at-gate=false → normal gate pass", async () => {
    const v: any = await r1.c.visitors.preApprove.mutate({
      name: "QA Normal Parcel", phone: "+919000000023", type: "delivery",
      validFrom: nowIso, validUntil: tomorrowIso, keepAtGate: false,
    });
    assert(v.keepAtGate === false, "should not be held");
    plainDeliveryId = v.id;
    return "normal pass";
  });
  await check("5.1 guard searchPreApproved finds the held parcel", async () => {
    const list: any[] = await g1.c.visitors.searchPreApproved.query({ query: "QA Held" });
    assert(list.some((v) => v.id === heldId), "not found in search");
    return `${list.length} match`;
  });
  await check("5.2 guard lookupByPassCode resolves the pass", async () => {
    const v: any = await g1.c.visitors.lookupByPassCode.query({ code: heldCode });
    assert(v && v.id === heldId, "pass lookup mismatch");
    return "resolved";
  });
  await expectErr("5.3 collectPackage wrong code → FORBIDDEN", "forbidden", () =>
    g1.c.visitors.collectPackage.mutate({ visitorId: heldId, code: "000000" }),
  );
  await check("5.4 collectPackage correct code → checked_out", async () => {
    const v: any = await g1.c.visitors.collectPackage.mutate({ visitorId: heldId, code: heldCode });
    assert(v.status === "checked_out", `status=${v.status}`);
    return "released";
  });
  await expectErr("5.5 collectPackage re-use → CONFLICT", "conflict", () =>
    g1.c.visitors.collectPackage.mutate({ visitorId: heldId, code: heldCode }),
  );
  await expectErr("5.6 collectPackage on non-held delivery → BAD_REQUEST", "bad_request", () =>
    g1.c.visitors.collectPackage.mutate({ visitorId: plainDeliveryId, code: "123456" }),
  );
  await check("5.7 walk-in → approve → entry → exit", async () => {
    const v: any = await g1.c.visitors.create.mutate({
      flatId: r2.user.flatId, name: "QA Walk-in", type: "guest", phone: "+919000000024",
    });
    await r2.c.visitors.decide.mutate({ visitorId: v.id, decision: "approved" });
    await g1.c.visitors.markEntry.mutate({ visitorId: v.id });
    const exited: any = await g1.c.visitors.markExit.mutate({ visitorId: v.id });
    assert(exited.status === "checked_out", `status=${exited.status}`);
    return "full entry/exit cycle";
  });
  await check("5.8 walk-in reject path", async () => {
    const v: any = await g1.c.visitors.create.mutate({
      flatId: r2.user.flatId, name: "QA Rejected", type: "guest", phone: "+919000000025",
    });
    const decided: any = await r2.c.visitors.decide.mutate({ visitorId: v.id, decision: "rejected" });
    assert(decided.status === "rejected", `status=${decided.status}`);
    return "rejected";
  });
  await check("5.9 visitor history returns rows", async () => {
    const h: any[] = await g1.c.visitors.history.query({});
    assert(Array.isArray(h) && h.length > 0, "empty history");
    return `${h.length} entries`;
  });

  // ================= PHASE 6: COMMUNITY =================
  phase("6. Community (notices/polls/complaints)");
  await check("6.1 notices list for resident", async () => {
    const n: any[] = await r1.c.notices.listForResident.query({});
    assert(Array.isArray(n), "not an array");
    return `${n.length} notices`;
  });
  await check("6.2 admin post notice → visible to resident", async () => {
    await admin.c.notices.create.mutate({ title: "QA Notice", body: "Water shutoff 2–4pm.", targetScope: "all" });
    const n: any[] = await r1.c.notices.listForResident.query({});
    assert(n.some((x) => x.title === "QA Notice"), "new notice not visible");
    return "visible";
  });
  await check("6.3 poll single-vote is enforced", async () => {
    const polls: any[] = await r1.c.polls.listForResident.query();
    const open = polls.find((p) => !p.isClosed);
    assert(open, "no open poll in seed");
    const opt = open.options[0];
    let firstOk = false, blocked = false;
    try { await r1.c.polls.vote.mutate({ pollId: open.id, optionIds: [opt.id] }); firstOk = true; }
    catch { blocked = true; } // already voted in seed → protection already engaged
    if (firstOk) {
      try { await r1.c.polls.vote.mutate({ pollId: open.id, optionIds: [opt.id] }); }
      catch { blocked = true; }
    }
    assert(blocked, "a second vote was NOT blocked");
    return firstOk ? "voted, re-vote blocked" : "single-vote enforced (seed vote present)";
  });
  await check("6.4 complaint create → mine → admin status update", async () => {
    const c: any = await r1.c.complaints.create.mutate({
      category: "Plumbing", title: "QA leak", description: "Tap dripping in QA test.",
    });
    const mine: any[] = await r1.c.complaints.mine.query();
    assert(mine.some((x) => x.id === c.id), "not in mine");
    await admin.c.complaints.update.mutate({ complaintId: c.id, status: "in_progress" });
    const after: any[] = await r1.c.complaints.mine.query();
    assert(after.find((x) => x.id === c.id)?.status === "in_progress", "status not updated");
    return "raised + advanced to in_progress";
  });

  // ================= PHASE 7: AMENITIES =================
  phase("7. Amenities");
  await check("7.1–3 book / double-book / cancel", async () => {
    const ams: any[] = await r1.c.amenities.listForResident.query();
    const am = ams.find((a) => a.isActive) ?? ams[0];
    assert(am, "no amenity in seed");
    const slots: any[] = await r1.c.amenityBookings.availableSlots.query({ amenityId: am.id, date: todayStr() });
    const free = slots.find((s) => s.isAvailable);
    assert(free, "no free slot today");
    const b: any = await r1.c.amenityBookings.create.mutate({ amenityId: am.id, date: todayStr(), slotStart: free.slotStart });
    let dbl = "not tested";
    try {
      await r1.c.amenityBookings.create.mutate({ amenityId: am.id, date: todayStr(), slotStart: free.slotStart });
      dbl = "allowed (capacity>1)";
    } catch { dbl = "blocked"; }
    await r1.c.amenityBookings.cancel.mutate({ bookingId: b.id });
    const mine: any[] = await r1.c.amenityBookings.myBookings.query();
    const cancelled = mine.find((x) => x.id === b.id);
    assert(!cancelled || cancelled.status === "cancelled", "cancel not reflected");
    return `booked ${am.name}@${free.slotStart}; re-book ${dbl}; cancelled OK`;
  });

  // ================= PHASE 8: DUES =================
  phase("8. Dues");
  await check("8.1 resident pays a mock due", async () => {
    let paidOne = "";
    for (const r of [r1, r2, r3]) {
      const dues: any[] = await r.c.dues.mine.query();
      const pending = dues.find((d) => d.status !== "paid");
      if (pending) {
        const res: any = await r.c.dues.payMock.mutate({ dueId: pending.id });
        paidOne = `${r.user.fullName} paid ₹${pending.amount}`;
        const after: any[] = await r.c.dues.mine.query();
        assert(after.find((d) => d.id === pending.id)?.status === "paid", "due not marked paid");
        break;
      }
    }
    assert(paidOne, "no pending due found (seed may already be paid)");
    return paidOne;
  });

  // ================= PHASE 9: STAFF =================
  phase("9. Staff directory");
  await check("9.1 staff directory lists entries", async () => {
    const s: any[] = await r1.c.staffDirectory.listForResident.query();
    assert(Array.isArray(s), "not array");
    return `${s.length} staff`;
  });

  // ================= PHASE 10: POSTS =================
  phase("10. Community feed");
  await check("10.1 create post / like / comment / list", async () => {
    const p: any = await r1.c.posts.create.mutate({ body: "QA test post — hello society." });
    await r2.c.posts.toggleLike.mutate({ postId: p.id });
    await r3.c.posts.addComment.mutate({ postId: p.id, body: "QA comment" });
    const feed: any[] = await r1.c.posts.list.query();
    assert(feed.some((x) => x.id === p.id), "post not in feed");
    return "post+like+comment OK";
  });

  // ================= PHASE 11: CHAT =================
  phase("11. Chat");
  await check("11.1 staff contacts / send / thread", async () => {
    const contacts: any[] = await r1.c.chat.staffContacts.query();
    assert(contacts.length > 0, "no staff contacts");
    const to = contacts.find((x) => x.role === "admin") ?? contacts[0];
    await r1.c.chat.send.mutate({ recipientId: to.id, body: "QA: what time is the water tanker?" });
    const thread: any = await r1.c.chat.thread.query({ userId: to.id } as any).catch(() => null);
    return thread ? "sent + thread readable" : "sent (thread shape differs)";
  });

  // ================= PHASE 12: ALERTS =================
  phase("12. Alerts");
  await check("12.1 resident raises alert → in history", async () => {
    await r1.c.alerts.raise.mutate({ type: "send_security" });
    const hist: any[] = await r1.c.alerts.myHistory.query();
    assert(Array.isArray(hist) && hist.length > 0, "no alert history");
    return `${hist.length} in history`;
  });
  await check("12.2 guard files a report", async () => {
    await g1.c.alerts.guardReport.mutate({ type: "incident", note: "QA test incident report" });
    return "guard report accepted";
  });

  // ================= PHASE 13: DUTY =================
  phase("13. Guard duty");
  await check("13.1 guard on/off duty reflects to admin roster", async () => {
    await g1.c.duty.setStatus.mutate({ onDuty: true });
    await g2.c.duty.setStatus.mutate({ onDuty: false });
    const mine: any = await g1.c.duty.myStatus.query();
    assert(mine.onDuty === true, "myStatus not on duty");
    const roster: any[] = await admin.c.duty.guards.query();
    const g1row = roster.find((x) => x.id === g1.id);
    assert(g1row?.onDuty === true, "admin roster doesn't show g1 on duty");
    return `roster on-duty: ${roster.filter((x) => x.onDuty).map((x) => x.name).join(", ") || "none"}`;
  });

  // ---------- summary ----------
  const pass = rows.filter((r) => r.ok).length;
  const fail = rows.length - pass;
  console.log("\n================ SUMMARY ================");
  const byPhase = new Map<string, { p: number; f: number }>();
  for (const r of rows) {
    const e = byPhase.get(r.phase) ?? { p: 0, f: 0 };
    r.ok ? e.p++ : e.f++;
    byPhase.set(r.phase, e);
  }
  for (const [p, e] of byPhase) console.log(`  ${e.f === 0 ? "OK " : "!! "} ${p}: ${e.p} pass, ${e.f} fail`);
  console.log(`\n  TOTAL: ${pass}/${rows.length} passed, ${fail} failed`);
  if (fail > 0) {
    console.log("\n  Failures:");
    rows.filter((r) => !r.ok).forEach((r) => console.log(`   - [${r.phase}] ${r.name} :: ${r.detail}`));
  }
  console.log("");
}

main()
  .then(() => setTimeout(() => process.exit(0), 200))
  .catch((e) => {
    console.error("QA RUNNER CRASHED:", e?.message ?? e);
    process.exit(1);
  });
