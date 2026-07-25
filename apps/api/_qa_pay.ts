/**
 * Live test for the dues approval flow against the deployed API.
 * Run: API_URL=https://portl-app.onrender.com/trpc apps/api/node_modules/.bin/tsx apps/api/_qa_pay.ts
 */
import { createTRPCClient, httpBatchLink, type ServerRouter } from "@repo/trpc/client";

const API = process.env.API_URL || "http://localhost:8000/trpc";
const PASS = "Portl@123";
function mk(token?: string) {
  return createTRPCClient<ServerRouter>({
    links: [httpBatchLink({ url: API, headers: () => (token ? { Authorization: `Bearer ${token}` } : {}) })],
  });
}
const anon = mk();
async function login(id: string) {
  const r = await anon.auth.login.mutate({ identifier: id, password: PASS });
  return { id: r.user.id, user: r.user, c: mk(r.accessToken) };
}
const rows: { name: string; ok: boolean; detail: string }[] = [];
function rec(name: string, ok: boolean, detail = "") {
  rows.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
async function check(name: string, fn: () => Promise<any>) {
  try {
    const d = await fn();
    rec(name, true, typeof d === "string" ? d : "");
  } catch (e: any) {
    rec(name, false, `threw ${e?.data?.code ?? ""} ${(e?.message ?? e).split("\n")[0]}`);
  }
}
function assert(c: any, m: string) {
  if (!c) throw new Error(m);
}
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function main() {
  console.log("\n===== DUES APPROVAL — LIVE TEST =====\n");
  const admin = await login("admin@portl.dev");
  const r1 = await login("resident1@portl.dev");

  let dueId = "";
  await check("admin creates a due for a flat", async () => {
    const res: any = await admin.c.dues.create.mutate({
      title: "QA Approval Test",
      amount: 350,
      dueDate: new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10),
      flatId: r1.user.flatId,
    });
    assert(res.count === 1, `count=${res.count}`);
    return "1 due";
  });
  await check("resident submits screenshot → UNDER REVIEW, not paid", async () => {
    const mine: any[] = await r1.c.dues.mine.query();
    const pending = mine.find((d) => d.status !== "paid" && d.title === "QA Approval Test" && !d.hasProof);
    assert(pending, "no fresh QA due");
    dueId = pending.id;
    const res: any = await r1.c.dues.submitUpiPayment.mutate({ dueId, proofImage: PNG });
    assert(res.status !== "paid", `should NOT be paid yet, got ${res.status}`);
    assert(res.hasProof === true && res.verified === false, "should be under review (hasProof, !verified)");
    return "under review";
  });
  await check("resident cannot resubmit while under review", async () => {
    let blocked = false;
    try {
      await r1.c.dues.submitUpiPayment.mutate({ dueId, proofImage: PNG });
    } catch {
      blocked = true;
    }
    assert(blocked, "resubmit should be blocked");
    return "CONFLICT enforced";
  });
  await check("admin sees the screenshot", async () => {
    const res: any = await admin.c.dues.proof.query({ dueId });
    assert(res.proofImage && res.proofImage.startsWith("data:image"), "no proof");
    return `${res.proofImage.length} chars`;
  });
  await check("admin approves → PAID + verified", async () => {
    const res: any = await admin.c.dues.approvePayment.mutate({ dueId });
    assert(res.status === "paid", `status=${res.status}`);
    assert(res.verified === true, "should be verified");
    assert(res.paidAt, "paidAt should be set after approval");
    return "approved → paid";
  });
  await check("paying an already-paid due is blocked", async () => {
    let blocked = false;
    try {
      await r1.c.dues.submitUpiPayment.mutate({ dueId, proofImage: PNG });
    } catch {
      blocked = true;
    }
    assert(blocked, "should be blocked");
    return "CONFLICT enforced";
  });

  // reject flow
  let dueId2 = "";
  await check("reject flow: submit → admin rejects → back to pending", async () => {
    await admin.c.dues.create.mutate({
      title: "QA Reject Test",
      amount: 120,
      dueDate: new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10),
      flatId: r1.user.flatId,
    });
    const mine: any[] = await r1.c.dues.mine.query();
    const d = mine.find((x) => x.title === "QA Reject Test" && !x.hasProof);
    assert(d, "no reject-test due");
    dueId2 = d.id;
    await r1.c.dues.submitUpiPayment.mutate({ dueId: dueId2, proofImage: PNG });
    const rejected: any = await admin.c.dues.rejectPayment.mutate({ dueId: dueId2 });
    assert(rejected.status !== "paid" && rejected.hasProof === false, "should be back to pending, no proof");
    // resident can submit again after rejection
    const again: any = await r1.c.dues.submitUpiPayment.mutate({ dueId: dueId2, proofImage: PNG });
    assert(again.hasProof && !again.verified, "resubmission should work after reject");
    return "reject → resubmit OK";
  });

  const pass = rows.filter((r) => r.ok).length;
  console.log(`\n  TOTAL: ${pass}/${rows.length} passed\n`);
}
main().then(() => setTimeout(() => process.exit(0), 200)).catch((e) => {
  console.error("CRASHED:", e?.message ?? e);
  process.exit(1);
});
