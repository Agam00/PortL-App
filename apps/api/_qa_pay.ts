/**
 * Live test for the UPI dues feature against the deployed API.
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
const PNG_1x1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function main() {
  console.log("\n===== UPI DUES — LIVE TEST =====\n");
  const admin = await login("admin@portl.dev");
  const r1 = await login("resident1@portl.dev");

  await check("admin sets collection UPI", async () => {
    const res: any = await admin.c.dues.setPaymentSettings.mutate({
      upiId: "palmmeadows@okhdfcbank",
      upiName: "Palm Meadows Society",
    });
    assert(res.upiId === "palmmeadows@okhdfcbank", "upiId not saved");
    return res.upiId;
  });
  await check("admin reads back settings", async () => {
    const s: any = await admin.c.dues.paymentSettings.query();
    assert(s.upiId === "palmmeadows@okhdfcbank", "mismatch");
    return `${s.upiId} (${s.upiName})`;
  });
  await check("invalid UPI id rejected", async () => {
    let blocked = false;
    try {
      await admin.c.dues.setPaymentSettings.mutate({ upiId: "not-a-upi" } as any);
    } catch {
      blocked = true;
    }
    assert(blocked, "invalid upi should be rejected");
    return "validation works";
  });
  await check("resident reads collection UPI", async () => {
    const s: any = await r1.c.dues.collectionUpi.query();
    assert(s.upiId === "palmmeadows@okhdfcbank", "resident can't see UPI");
    return s.upiId;
  });
  await check("admin creates due for a specific flat", async () => {
    const res: any = await admin.c.dues.create.mutate({
      title: "QA Water Bill",
      amount: 750,
      dueDate: new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10),
      flatId: r1.user.flatId,
    });
    assert(res.count === 1, `count=${res.count}`);
    return "1 due";
  });
  await check("admin sends due to ALL residents", async () => {
    const res: any = await admin.c.dues.create.mutate({
      title: "QA Festival Fund",
      amount: 500,
      dueDate: new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10),
      applyToAll: true,
    });
    assert(res.count >= 1, `count=${res.count}`);
    return `${res.count} flats charged`;
  });
  let paidDueId = "";
  await check("resident pays via UPI + attaches screenshot", async () => {
    const mine: any[] = await r1.c.dues.mine.query();
    const pending = mine.find((d) => d.status !== "paid" && d.title?.startsWith("QA"));
    assert(pending, "no QA pending due for resident");
    paidDueId = pending.id;
    const res: any = await r1.c.dues.submitUpiPayment.mutate({ dueId: pending.id, proofImage: PNG_1x1 });
    assert(res.status === "paid", `status=${res.status}`);
    assert(res.hasProof === true, "hasProof not set");
    return "paid with proof";
  });
  await check("admin views the payment screenshot", async () => {
    const res: any = await admin.c.dues.proof.query({ dueId: paidDueId });
    assert(res.proofImage && res.proofImage.startsWith("data:image"), "proof image missing");
    return `proof ${res.proofImage.length} chars`;
  });
  await check("double-submit blocked", async () => {
    let blocked = false;
    try {
      await r1.c.dues.submitUpiPayment.mutate({ dueId: paidDueId, proofImage: PNG_1x1 });
    } catch {
      blocked = true;
    }
    assert(blocked, "paying an already-paid due should fail");
    return "CONFLICT enforced";
  });

  const pass = rows.filter((r) => r.ok).length;
  console.log(`\n  TOTAL: ${pass}/${rows.length} passed\n`);
}
main().then(() => setTimeout(() => process.exit(0), 200)).catch((e) => {
  console.error("CRASHED:", e?.message ?? e);
  process.exit(1);
});
