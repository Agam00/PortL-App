import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import type { SelectFlat, SelectUser } from "./schema";
import {
  societiesTable,
  towersTable,
  flatsTable,
  usersTable,
  visitorsTable,
  visitorLogsTable,
  noticesTable,
  noticeReactionsTable,
  noticeCommentsTable,
  pollsTable,
  pollOptionsTable,
  pollVotesTable,
  complaintsTable,
  complaintCommentsTable,
  amenitiesTable,
  amenityBookingsTable,
  duesTable,
  staffDirectoryTable,
  postsTable,
  postCommentsTable,
  postLikesTable,
  refreshTokensTable,
  paymentsTable,
  notificationsTable,
  pushTokensTable,
} from "./schema";

const DEMO_PASSWORD = "Portl@123";

function one<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new Error("Expected insert to return a row");
  return row;
}

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000);
const daysFromNow = (d: number) => new Date(now + d * 86400_000);
const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const monthStr = () => new Date().toISOString().slice(0, 7);

async function reset() {
  await db.delete(notificationsTable);
  await db.delete(pushTokensTable);
  await db.delete(paymentsTable);
  await db.delete(duesTable);
  await db.delete(amenityBookingsTable);
  await db.delete(amenitiesTable);
  await db.delete(staffDirectoryTable);
  await db.delete(postLikesTable);
  await db.delete(postCommentsTable);
  await db.delete(postsTable);
  await db.delete(complaintCommentsTable);
  await db.delete(complaintsTable);
  await db.delete(pollVotesTable);
  await db.delete(pollOptionsTable);
  await db.delete(pollsTable);
  await db.delete(noticeCommentsTable);
  await db.delete(noticeReactionsTable);
  await db.delete(noticesTable);
  await db.delete(visitorLogsTable);
  await db.delete(visitorsTable);
  await db.delete(refreshTokensTable);
  await db.delete(usersTable);
  await db.delete(flatsTable);
  await db.delete(towersTable);
  await db.delete(societiesTable);
}

async function main() {
  console.log("Resetting database...");
  await reset();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Seeding society, towers, flats...");
  const society = one(
    await db
      .insert(societiesTable)
      .values({
        name: "Palm Meadows Residency",
        address: "Sarjapur Main Road, Bengaluru 560103",
        city: "Bengaluru",
        upiId: "agamxpro69@oksbi",
        upiName: "Palm Meadows Residency",
      })
      .returning(),
  );

  const towerDefs = [
    { name: "Maple", code: "A" },
    { name: "Orchid", code: "B" },
    { name: "Cedar", code: "C" },
  ];
  const towers = [];
  for (const t of towerDefs) {
    towers.push(one(await db.insert(towersTable).values({ societyId: society.id, ...t }).returning()));
  }

  // 8 flats per tower (floors 1–4, units 01/02).
  const flatByNumber = new Map<string, SelectFlat>();
  for (const tower of towers) {
    for (let floor = 1; floor <= 4; floor++) {
      for (const unit of ["01", "02"]) {
        const number = `${tower.code}-${floor}${unit}`;
        const type = unit === "02" || floor === 4 ? "3BHK" : "2BHK";
        const flat = one(
          await db.insert(flatsTable).values({ towerId: tower.id, flatNumber: number, floor, type }).returning(),
        );
        flatByNumber.set(number, flat);
      }
    }
  }
  const flatId = (n: string) => {
    const f = flatByNumber.get(n);
    if (!f) throw new Error(`No flat ${n}`);
    return f.id;
  };

  console.log("Seeding users...");
  const admin = one(
    await db
      .insert(usersTable)
      .values({ fullName: "Asha Nair", email: "admin@portl.dev", phone: "+919845000100", passwordHash, role: "admin", societyId: society.id })
      .returning(),
  );

  const guardDefs = [
    { fullName: "Ramesh Kumar", email: "guard1@portl.dev", phone: "+919845000201" },
    { fullName: "Suresh Yadav", email: "guard2@portl.dev", phone: "+919845000202" },
    { fullName: "Imran Shaikh", email: "guard3@portl.dev", phone: "+919845000203" },
  ];
  const guards: SelectUser[] = [];
  for (const g of guardDefs) {
    guards.push(one(await db.insert(usersTable).values({ ...g, passwordHash, role: "guard", societyId: society.id }).returning()));
  }
  const guard1 = guards[0]!;

  const residentDefs = [
    { name: "Priya Sharma", flat: "A-101", phone: "+919845012001" },
    { name: "Rahul Verma", flat: "A-102", phone: "+919972043118" },
    { name: "Ananya Iyer", flat: "A-201", phone: "+918050119274" },
    { name: "Vikram Singh", flat: "A-202", phone: "+919886530147" },
    { name: "Neha Gupta", flat: "A-301", phone: "+917676204893" },
    { name: "Arjun Nair", flat: "A-302", phone: "+919900117845" },
    { name: "Kavita Rao", flat: "A-401", phone: "+919480276310" },
    { name: "Sanjay Mehta", flat: "B-101", phone: "+919148850392" },
    { name: "Meera Krishnan", flat: "B-102", phone: "+917022619074" },
    { name: "Aditya Kulkarni", flat: "B-201", phone: "+919632508817" },
    { name: "Divya Menon", flat: "B-202", phone: "+918762340951" },
    { name: "Rohan Kapoor", flat: "B-301", phone: "+919845771260" },
    { name: "Sneha Reddy", flat: "B-302", phone: "+917338890124" },
    { name: "Karan Malhotra", flat: "C-101", phone: "+919611452038" },
    { name: "Pooja Bhat", flat: "C-102", phone: "+918884019657" },
    { name: "Farhan Ali", flat: "C-201", phone: "+919035678420" },
    { name: "Ishaan Joshi", flat: "C-202", phone: "+917829140563" },
    { name: "Lakshmi Pillai", flat: "C-301", phone: "+919449803271" },
  ];
  const residents: SelectUser[] = [];
  for (const [i, def] of residentDefs.entries()) {
    residents.push(
      one(
        await db
          .insert(usersTable)
          .values({ fullName: def.name, email: `resident${i + 1}@portl.dev`, phone: def.phone, passwordHash, role: "resident", societyId: society.id, flatId: flatId(def.flat) })
          .returning(),
      ),
    );
  }
  const R = (i: number) => {
    const r = residents[i];
    if (!r) throw new Error(`No resident ${i}`);
    return r;
  };

  console.log("Seeding visitors + gate logs...");
  // pending (awaiting resident approval)
  await db.insert(visitorsTable).values([
    { societyId: society.id, flatId: flatId("A-101"), name: "Swiggy Delivery", phone: "+919900112201", type: "delivery", source: "guard_initiated", status: "pending", requestedByGuardId: guard1.id },
    { societyId: society.id, flatId: flatId("A-102"), name: "Zomato Delivery", phone: "+919900112202", type: "delivery", source: "guard_initiated", status: "pending", requestedByGuardId: guard1.id },
  ]);

  // currently inside (checked-in) + entry logs
  const guestIn = one(
    await db.insert(visitorsTable).values({ societyId: society.id, flatId: flatId("A-201"), name: "Rohan (Friend)", phone: "+919900112203", type: "guest", source: "guard_initiated", status: "checked_in", requestedByGuardId: guard1.id, decidedByUserId: R(2).id, decidedAt: hoursAgo(2) }).returning(),
  );
  const maidIn = one(
    await db.insert(visitorsTable).values({ societyId: society.id, flatId: flatId("B-102"), name: "Meena (House Help)", phone: "+919900112204", type: "service", source: "guard_initiated", status: "checked_in", requestedByGuardId: guards[1]!.id, decidedByUserId: R(8).id, decidedAt: hoursAgo(3) }).returning(),
  );
  await db.insert(visitorLogsTable).values([
    { visitorId: guestIn.id, guardId: guard1.id, action: "entry", occurredAt: hoursAgo(2) },
    { visitorId: maidIn.id, guardId: guards[1]!.id, action: "entry", occurredAt: hoursAgo(3) },
  ]);

  // checked-out (history) + entry & exit logs
  const cabOut = one(
    await db.insert(visitorsTable).values({ societyId: society.id, flatId: flatId("C-101"), name: "Uber Cab", phone: "+919900112205", type: "cab", source: "resident_preapproved", status: "checked_out", decidedByUserId: R(13).id, decidedAt: hoursAgo(6), validFrom: hoursAgo(7), validUntil: hoursAgo(1) }).returning(),
  );
  const guestOut = one(
    await db.insert(visitorsTable).values({ societyId: society.id, flatId: flatId("B-202"), name: "Deepak (Cousin)", phone: "+919900112206", type: "guest", source: "guard_initiated", status: "checked_out", requestedByGuardId: guard1.id, decidedByUserId: R(10).id, decidedAt: hoursAgo(5) }).returning(),
  );
  await db.insert(visitorLogsTable).values([
    { visitorId: cabOut.id, guardId: guard1.id, action: "entry", occurredAt: hoursAgo(6) },
    { visitorId: cabOut.id, guardId: guards[2]!.id, action: "exit", occurredAt: hoursAgo(1) },
    { visitorId: guestOut.id, guardId: guard1.id, action: "entry", occurredAt: hoursAgo(5) },
    { visitorId: guestOut.id, guardId: guard1.id, action: "exit", occurredAt: hoursAgo(2) },
  ]);

  // approved pre-approvals (incl. a keep-at-gate parcel with a collection code) + one expired + one rejected
  await db.insert(visitorsTable).values([
    { societyId: society.id, flatId: flatId("A-202"), name: "Ola Cab", phone: "+919900112207", type: "cab", source: "resident_preapproved", status: "approved", decidedByUserId: R(3).id, decidedAt: hoursAgo(1), validFrom: hoursAgo(1), validUntil: daysFromNow(1), passCode: "205147" },
    { societyId: society.id, flatId: flatId("A-101"), name: "Amazon Delivery", phone: "+919900112208", type: "delivery", source: "resident_preapproved", status: "approved", decidedByUserId: R(0).id, decidedAt: hoursAgo(1), validFrom: hoursAgo(1), validUntil: daysFromNow(1), passCode: "731908" },
    { societyId: society.id, flatId: flatId("A-301"), name: "Flipkart Delivery", phone: "+919900112209", type: "delivery", source: "resident_preapproved", status: "approved", keepAtGate: true, decidedByUserId: R(4).id, decidedAt: hoursAgo(1), validFrom: hoursAgo(1), validUntil: daysFromNow(1), passCode: "394182" },
    { societyId: society.id, flatId: flatId("B-101"), name: "BESCOM Electrician", phone: "+919900112210", type: "service", source: "resident_preapproved", status: "approved", decidedByUserId: R(7).id, decidedAt: hoursAgo(2), validFrom: hoursAgo(2), validUntil: daysFromNow(1), passCode: "660421" },
    { societyId: society.id, flatId: flatId("B-301"), name: "BigBasket Delivery", phone: "+919900112211", type: "delivery", source: "resident_preapproved", status: "expired", decidedByUserId: R(11).id, decidedAt: hoursAgo(30), validFrom: hoursAgo(30), validUntil: hoursAgo(20) },
    { societyId: society.id, flatId: flatId("B-201"), name: "Unknown Salesperson", phone: "+919900112212", type: "guest", source: "guard_initiated", status: "rejected", requestedByGuardId: guards[1]!.id, decidedByUserId: R(9).id, decidedAt: hoursAgo(4) },
  ]);

  console.log("Seeding notices...");
  const notices = await db
    .insert(noticesTable)
    .values([
      { societyId: society.id, authorId: admin.id, title: "Water supply maintenance on Saturday", body: "Water supply will be interrupted from 10 AM to 2 PM on Saturday for overhead tank cleaning. Please store water accordingly.", targetScope: "all" },
      { societyId: society.id, authorId: admin.id, title: "Diwali celebration in the Clubhouse 🪔", body: "Join us for the society Diwali celebration on the 30th, 6 PM onwards at the Clubhouse. Snacks, rangoli contest and games for kids!", targetScope: "all" },
      { societyId: society.id, authorId: admin.id, title: "New visitor parking rules from Monday", body: "Visitor vehicles must park only in the marked visitor bay near the main gate. Kindly inform your guests.", targetScope: "all" },
      { societyId: society.id, authorId: admin.id, title: "Annual General Meeting — 10th Aug, 6 PM", body: "The society AGM will be held in the Clubhouse. Agenda: budget review, security upgrade, and amenity proposals.", targetScope: "all" },
      { societyId: society.id, authorId: admin.id, title: "Lift servicing in Orchid on Wednesday", body: "Lift B in Orchid tower will be serviced on Wednesday from 11 AM to 1 PM. Please use the stairs during this window.", targetScope: "all" },
    ])
    .returning();
  const diwali = notices[1]!;
  await db.insert(noticeReactionsTable).values([
    { noticeId: diwali.id, userId: R(0).id, reaction: "like" },
    { noticeId: diwali.id, userId: R(1).id, reaction: "like" },
    { noticeId: diwali.id, userId: R(5).id, reaction: "like" },
  ]);
  await db.insert(noticeCommentsTable).values({ noticeId: diwali.id, authorId: R(2).id, body: "Looking forward to it! Can we have a potluck too?" });

  console.log("Seeding polls...");
  const poll1 = one(
    await db.insert(pollsTable).values({ societyId: society.id, createdByUserId: admin.id, question: "Preferred day for the monthly society meeting?", description: "Pick the day that works best for most residents.", multiSelect: false, closesAt: daysFromNow(5) }).returning(),
  );
  const p1opts = await db.insert(pollOptionsTable).values([
    { pollId: poll1.id, label: "Saturday" },
    { pollId: poll1.id, label: "Sunday" },
    { pollId: poll1.id, label: "Weekday evening" },
  ]).returning();
  await db.insert(pollVotesTable).values([
    { pollId: poll1.id, optionId: p1opts[0]!.id, userId: R(0).id },
    { pollId: poll1.id, optionId: p1opts[1]!.id, userId: R(1).id },
    { pollId: poll1.id, optionId: p1opts[1]!.id, userId: R(2).id },
    { pollId: poll1.id, optionId: p1opts[0]!.id, userId: R(3).id },
    { pollId: poll1.id, optionId: p1opts[2]!.id, userId: R(4).id },
  ]);

  const poll2 = one(
    await db.insert(pollsTable).values({ societyId: society.id, createdByUserId: admin.id, question: "Which new amenity should we add next?", description: "You can pick more than one.", multiSelect: true, closesAt: daysFromNow(8) }).returning(),
  );
  const p2opts = await db.insert(pollOptionsTable).values([
    { pollId: poll2.id, label: "Gymnasium" },
    { pollId: poll2.id, label: "Kids' Play Area" },
    { pollId: poll2.id, label: "EV Charging" },
    { pollId: poll2.id, label: "Co-working Space" },
  ]).returning();
  await db.insert(pollVotesTable).values([
    { pollId: poll2.id, optionId: p2opts[0]!.id, userId: R(0).id },
    { pollId: poll2.id, optionId: p2opts[2]!.id, userId: R(0).id },
    { pollId: poll2.id, optionId: p2opts[1]!.id, userId: R(5).id },
    { pollId: poll2.id, optionId: p2opts[2]!.id, userId: R(6).id },
  ]);

  console.log("Seeding complaints...");
  const c1 = one(await db.insert(complaintsTable).values({ societyId: society.id, raisedByUserId: R(3).id, category: "Plumbing", title: "Leaking pipe under bathroom sink", description: "There's a persistent leak under the bathroom sink since two days.", status: "open", priority: "medium" }).returning());
  await db.insert(complaintCommentsTable).values({ complaintId: c1.id, authorId: admin.id, body: "Noted — we'll send a plumber within 24 hours." });

  const c3 = one(await db.insert(complaintsTable).values({ societyId: society.id, raisedByUserId: R(0).id, category: "Security", title: "Gate camera light flickering at night", description: "The CCTV camera near the main gate seems to flicker after 10 PM.", status: "in_progress", priority: "medium", assignedToUserId: admin.id }).returning());
  await db.insert(complaintCommentsTable).values({ complaintId: c3.id, authorId: admin.id, body: "Thanks for flagging — the electrician will look at it this week." });

  await db.insert(complaintsTable).values([
    { societyId: society.id, raisedByUserId: R(4).id, category: "Electrical", title: "Parking area light not working", description: "The light near the parking entrance has been out for a week.", status: "resolved", priority: "low", assignedToUserId: admin.id, resolvedAt: hoursAgo(20) },
    { societyId: society.id, raisedByUserId: R(7).id, category: "Housekeeping", title: "Garbage not collected on 1st floor, Orchid", description: "Wet waste wasn't collected yesterday on the Orchid 1st floor.", status: "open", priority: "high" },
    { societyId: society.id, raisedByUserId: R(8).id, category: "Lift", title: "Lift making noise in Orchid", description: "Lift B makes a grinding noise between floors 2 and 3.", status: "in_progress", priority: "medium", assignedToUserId: admin.id },
    { societyId: society.id, raisedByUserId: R(13).id, category: "Parking", title: "Unauthorized vehicle in my slot", description: "A white hatchback keeps parking in slot C-101.", status: "resolved", priority: "medium", assignedToUserId: admin.id, resolvedAt: hoursAgo(48) },
  ]);

  console.log("Seeding amenities + bookings...");
  const amenityDefs = [
    { name: "Clubhouse", description: "Indoor games, seating area and event hall.", capacity: 30, openTime: "08:00", closeTime: "22:00" },
    { name: "Swimming Pool", description: "Open-air pool; children under 12 need adult supervision.", capacity: 15, openTime: "06:00", closeTime: "20:00" },
    { name: "Gymnasium", description: "Cardio and weights, air-conditioned.", capacity: 12, openTime: "05:00", closeTime: "23:00" },
    { name: "Tennis Court", description: "Floodlit synthetic court.", capacity: 4, openTime: "06:00", closeTime: "21:00" },
    { name: "Party Hall", description: "Air-conditioned hall for private events.", capacity: 60, openTime: "10:00", closeTime: "23:00" },
  ];
  const amenities = [];
  for (const a of amenityDefs) {
    amenities.push(one(await db.insert(amenitiesTable).values({ societyId: society.id, slotMinutes: 60, ...a }).returning()));
  }
  const clubhouse = amenities[0]!;
  const pool = amenities[1]!;
  await db.insert(amenityBookingsTable).values([
    { amenityId: clubhouse.id, flatId: flatId("A-302"), bookedByUserId: R(5).id, date: dateStr(new Date()), slotStart: "18:00", slotEnd: "19:00", status: "confirmed" },
    { amenityId: clubhouse.id, flatId: flatId("A-101"), bookedByUserId: R(0).id, date: dateStr(daysFromNow(2)), slotStart: "19:00", slotEnd: "20:00", status: "confirmed" },
    { amenityId: pool.id, flatId: flatId("B-102"), bookedByUserId: R(8).id, date: dateStr(daysFromNow(1)), slotStart: "07:00", slotEnd: "08:00", status: "confirmed" },
    // a past booking (history) and a cancelled one
    { amenityId: clubhouse.id, flatId: flatId("C-101"), bookedByUserId: R(13).id, date: dateStr(daysFromNow(-2)), slotStart: "17:00", slotEnd: "18:00", status: "confirmed" },
    { amenityId: pool.id, flatId: flatId("A-201"), bookedByUserId: R(2).id, date: dateStr(daysFromNow(3)), slotStart: "18:00", slotEnd: "19:00", status: "cancelled" },
  ]);

  console.log("Seeding dues...");
  await db.insert(duesTable).values([
    { flatId: flatId("A-101"), period: monthStr(), title: "Maintenance – " + monthStr(), amount: "3200.00", status: "pending", dueDate: dateStr(daysFromNow(12)) },
    { flatId: flatId("A-401"), period: monthStr(), title: "Maintenance – " + monthStr(), amount: "2500.00", status: "pending", dueDate: dateStr(daysFromNow(12)) },
    { flatId: flatId("A-201"), period: monthStr(), title: "Maintenance – " + monthStr(), amount: "2500.00", status: "pending", dueDate: dateStr(daysFromNow(12)) },
    { flatId: flatId("B-301"), period: monthStr(), title: "Maintenance – " + monthStr(), amount: "3500.00", status: "pending", dueDate: dateStr(daysFromNow(12)) },
    { flatId: flatId("C-201"), period: monthStr(), title: "Diwali Community Fund", amount: "1000.00", status: "pending", dueDate: dateStr(daysFromNow(6)) },
    // overdue (past due date, still pending → shows OVERDUE)
    { flatId: flatId("B-101"), period: monthStr(), title: "Maintenance – " + monthStr(), amount: "2800.00", status: "pending", dueDate: dateStr(daysFromNow(-3)) },
  ]);

  console.log("Seeding staff directory...");
  await db.insert(staffDirectoryTable).values([
    { societyId: society.id, name: "Manoj Kumar", category: "Plumber", phone: "+919845220011", isVerifiedByAdmin: true, addedByUserId: admin.id },
    { societyId: society.id, name: "Deepak Rana", category: "Electrician", phone: "+919845220012", isVerifiedByAdmin: true, addedByUserId: admin.id },
    { societyId: society.id, name: "Ravi Shetty", category: "Carpenter", phone: "+919845220013", isVerifiedByAdmin: true, addedByUserId: admin.id },
    { societyId: society.id, name: "Lakshmi Bai", category: "Housekeeping", phone: "+919845220014", isVerifiedByAdmin: true, addedByUserId: admin.id },
    { societyId: society.id, name: "Ganesh M", category: "Gardener", phone: "+919845220015", isVerifiedByAdmin: false, addedByUserId: admin.id },
    { societyId: society.id, name: "Sunita (Milk & Groceries)", category: "Grocery", phone: "+919845220016", isVerifiedByAdmin: false, addedByUserId: admin.id },
  ]);

  console.log("Seeding community feed...");
  const pinned = one(await db.insert(postsTable).values({ societyId: society.id, authorId: admin.id, body: "Reminder: guest vehicles must park only in the visitor bay near the gate. Repeated violations will be towed. Thanks for cooperating! 🚗", pinnedAt: hoursAgo(20) }).returning());
  const post1 = one(await db.insert(postsTable).values({ societyId: society.id, authorId: R(0).id, body: "Lost a set of keys near the Maple lobby this evening 🔑 If anyone finds them, please DM me!" }).returning());
  const post2 = one(await db.insert(postsTable).values({ societyId: society.id, authorId: R(1).id, body: "Anyone up for a friendly cricket match at the common ground this Sunday morning? 🏏" }).returning());
  const post3 = one(await db.insert(postsTable).values({ societyId: society.id, authorId: R(8).id, body: "Selling a barely-used treadmill, moving out next month. DM if interested 🏃" }).returning());
  await db.insert(postCommentsTable).values([
    { postId: post1.id, authorId: R(2).id, body: "I think I saw a keychain near the mailboxes — check with security!" },
    { postId: post2.id, authorId: R(5).id, body: "Count me in! I'll bring the bat." },
    { postId: post3.id, authorId: R(4).id, body: "Interested — what's the price?" },
  ]);
  await db.insert(postLikesTable).values([
    { postId: pinned.id, userId: R(0).id },
    { postId: post1.id, userId: R(1).id },
    { postId: post1.id, userId: R(3).id },
    { postId: post2.id, userId: R(0).id },
    { postId: post2.id, userId: R(6).id },
    { postId: post2.id, userId: R(2).id },
  ]);

  console.log("\nSeed complete.\n");
  console.log("Demo credentials (password for all: " + DEMO_PASSWORD + ")");
  console.log("  admin:     admin@portl.dev  (Asha Nair)");
  console.log("  guards:    guard1@portl.dev / guard2@portl.dev / guard3@portl.dev");
  console.log("  residents: resident1@portl.dev … resident18@portl.dev");
  console.log("  e.g. resident1@portl.dev = Priya Sharma, flat A-101");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
