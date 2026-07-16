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
  pollsTable,
  pollOptionsTable,
  pollVotesTable,
  complaintsTable,
  amenitiesTable,
  amenityBookingsTable,
  duesTable,
  staffDirectoryTable,
  refreshTokensTable,
  paymentsTable,
  notificationsTable,
  pushTokensTable,
  complaintCommentsTable,
} from "./schema";

const DEMO_PASSWORD = "Portl@123";

/** `.returning()` always yields at least one row for a single-row insert; this just satisfies noUncheckedIndexedAccess. */
function one<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new Error("Expected insert to return a row");
  return row;
}

async function reset() {
  // Delete children before parents to respect FK constraints.
  await db.delete(notificationsTable);
  await db.delete(pushTokensTable);
  await db.delete(paymentsTable);
  await db.delete(duesTable);
  await db.delete(amenityBookingsTable);
  await db.delete(amenitiesTable);
  await db.delete(staffDirectoryTable);
  await db.delete(complaintCommentsTable);
  await db.delete(complaintsTable);
  await db.delete(pollVotesTable);
  await db.delete(pollOptionsTable);
  await db.delete(pollsTable);
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
      .values({ name: "Palm Meadows", address: "12 Lakeview Road", city: "Bengaluru" })
      .returning(),
  );

  const towerA = one(
    await db
      .insert(towersTable)
      .values({ societyId: society.id, name: "Tower A", code: "A" })
      .returning(),
  );
  const towerB = one(
    await db
      .insert(towersTable)
      .values({ societyId: society.id, name: "Tower B", code: "B" })
      .returning(),
  );

  const flatDefs = [
    { tower: towerA, number: "A-101", floor: 1, type: "2BHK" },
    { tower: towerA, number: "A-102", floor: 1, type: "3BHK" },
    { tower: towerA, number: "A-201", floor: 2, type: "2BHK" },
    { tower: towerA, number: "A-202", floor: 2, type: "3BHK" },
    { tower: towerA, number: "A-301", floor: 3, type: "2BHK" },
    { tower: towerB, number: "B-101", floor: 1, type: "2BHK" },
    { tower: towerB, number: "B-102", floor: 1, type: "3BHK" },
    { tower: towerB, number: "B-201", floor: 2, type: "2BHK" },
    { tower: towerB, number: "B-202", floor: 2, type: "3BHK" },
    { tower: towerB, number: "B-301", floor: 3, type: "2BHK" },
  ];

  const flats: SelectFlat[] = [];
  for (const def of flatDefs) {
    const flat = one(
      await db
        .insert(flatsTable)
        .values({
          towerId: def.tower.id,
          flatNumber: def.number,
          floor: def.floor,
          type: def.type,
        })
        .returning(),
    );
    flats.push(flat);
  }

  console.log("Seeding users (admin, guards, residents)...");
  const admin = one(
    await db
      .insert(usersTable)
      .values({
        fullName: "Asha Admin",
        email: "admin@portl.dev",
        phone: "+911000000001",
        passwordHash,
        role: "admin",
        societyId: society.id,
      })
      .returning(),
  );

  const guard1 = one(
    await db
      .insert(usersTable)
      .values({
        fullName: "Ramesh Kumar",
        email: "guard1@portl.dev",
        phone: "+911000000002",
        passwordHash,
        role: "guard",
        societyId: society.id,
      })
      .returning(),
  );

  const guard2 = one(
    await db
      .insert(usersTable)
      .values({
        fullName: "Suresh Yadav",
        email: "guard2@portl.dev",
        phone: "+911000000003",
        passwordHash,
        role: "guard",
        societyId: society.id,
      })
      .returning(),
  );

  const residentDefs = [
    { name: "Priya Sharma", flatIndex: 0 },
    { name: "Rahul Verma", flatIndex: 1 },
    { name: "Anita Desai", flatIndex: 2 },
    { name: "Vikram Singh", flatIndex: 3 },
    { name: "Neha Gupta", flatIndex: 4 },
    { name: "Arjun Nair", flatIndex: 5 },
    { name: "Kavita Rao", flatIndex: 6 },
    { name: "Sanjay Mehta", flatIndex: 7 },
  ];

  const residents: SelectUser[] = [];
  for (const [i, def] of residentDefs.entries()) {
    const flat = flats[def.flatIndex];
    if (!flat) throw new Error(`No seeded flat at index ${def.flatIndex}`);

    const resident = one(
      await db
        .insert(usersTable)
        .values({
          fullName: def.name,
          email: `resident${i + 1}@portl.dev`,
          phone: `+91100000001${i}`,
          passwordHash,
          role: "resident",
          societyId: society.id,
          flatId: flat.id,
        })
        .returning(),
    );
    residents.push(resident);
  }
  // flats[8] and flats[9] are intentionally left vacant for demo variety.

  function resident(index: number) {
    const r = residents[index];
    if (!r) throw new Error(`No seeded resident at index ${index}`);
    return r;
  }

  console.log("Seeding visitors + visitor logs...");
  await db.insert(visitorsTable).values({
    societyId: society.id,
    flatId: resident(0).flatId!,
    name: "Swiggy Delivery",
    phone: "+919999900001",
    type: "delivery",
    source: "guard_initiated",
    status: "pending",
    requestedByGuardId: guard1.id,
  });

  const approvedVisitor = one(
    await db
      .insert(visitorsTable)
      .values({
        societyId: society.id,
        flatId: resident(1).flatId!,
        name: "Rohan (Friend)",
        phone: "+919999900002",
        type: "guest",
        source: "guard_initiated",
        status: "checked_in",
        requestedByGuardId: guard1.id,
        decidedByUserId: resident(1).id,
        decidedAt: new Date(),
      })
      .returning(),
  );

  await db.insert(visitorLogsTable).values({
    visitorId: approvedVisitor.id,
    guardId: guard1.id,
    action: "entry",
  });

  await db.insert(visitorsTable).values({
    societyId: society.id,
    flatId: resident(2).flatId!,
    name: "Ola Cab",
    phone: "+919999900003",
    type: "cab",
    source: "resident_preapproved",
    status: "approved",
    decidedByUserId: resident(2).id,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 1000 * 60 * 60 * 6),
    decidedAt: new Date(),
  });

  // Extra fixture on resident(0) (the demo login) so every screen has real data on
  // first login, without needing to hop roles or create data first: a pre-approval
  // ready to test Cancel on, plus the pending Swiggy delivery above ready to
  // approve/reject.
  await db.insert(visitorsTable).values({
    societyId: society.id,
    flatId: resident(0).flatId!,
    name: "Amazon Delivery",
    phone: "+919999900004",
    type: "delivery",
    source: "resident_preapproved",
    status: "approved",
    decidedByUserId: resident(0).id,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24),
    decidedAt: new Date(),
  });

  console.log("Seeding notices...");
  await db.insert(noticesTable).values([
    {
      societyId: society.id,
      authorId: admin.id,
      title: "Water supply maintenance on Saturday",
      body: "Water supply will be interrupted from 10 AM to 2 PM on Saturday for tank cleaning.",
      targetScope: "all",
    },
    {
      societyId: society.id,
      authorId: admin.id,
      title: "Annual Day celebration next month",
      body: "Save the date! Society Annual Day will be celebrated in the clubhouse. Details soon.",
      targetScope: "all",
    },
  ]);

  console.log("Seeding poll + votes...");
  const poll = one(
    await db
      .insert(pollsTable)
      .values({
        societyId: society.id,
        createdByUserId: admin.id,
        question: "Preferred day for the monthly society meeting?",
        description: "Pick the day that works best for most residents.",
        multiSelect: false,
        closesAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      })
      .returning(),
  );

  const pollOptions = await db
    .insert(pollOptionsTable)
    .values([
      { pollId: poll.id, label: "Saturday" },
      { pollId: poll.id, label: "Sunday" },
    ])
    .returning();
  const optionSat = pollOptions[0];
  const optionSun = pollOptions[1];
  if (!optionSat || !optionSun) throw new Error("Expected 2 poll options to be inserted");

  await db.insert(pollVotesTable).values([
    { pollId: poll.id, optionId: optionSat.id, userId: resident(0).id },
    { pollId: poll.id, optionId: optionSat.id, userId: resident(1).id },
    { pollId: poll.id, optionId: optionSun.id, userId: resident(2).id },
  ]);

  console.log("Seeding complaints...");
  const openComplaint = one(
    await db
      .insert(complaintsTable)
      .values({
        societyId: society.id,
        raisedByUserId: resident(3).id,
        category: "Plumbing",
        title: "Leaking pipe in bathroom",
        description: "There's a persistent leak under the bathroom sink.",
        status: "open",
        priority: "medium",
      })
      .returning(),
  );

  await db.insert(complaintCommentsTable).values({
    complaintId: openComplaint.id,
    authorId: admin.id,
    body: "We've noted this and will send a plumber within 24 hours.",
  });

  await db.insert(complaintsTable).values({
    societyId: society.id,
    raisedByUserId: resident(4).id,
    category: "Electrical",
    title: "Common area light not working",
    description: "The light near the parking entrance has been out for a week.",
    status: "resolved",
    priority: "low",
    assignedToUserId: admin.id,
    resolvedAt: new Date(),
  });

  // Ticket on resident(0) (the demo login) with an existing reply thread, so testing
  // "add a comment" doesn't require raising a fresh ticket first.
  const residentOneComplaint = one(
    await db
      .insert(complaintsTable)
      .values({
        societyId: society.id,
        raisedByUserId: resident(0).id,
        category: "Security",
        title: "Gate camera light flickering at night",
        description: "The CCTV camera near the main gate seems to be flickering after 10 PM.",
        status: "in_progress",
        priority: "medium",
        assignedToUserId: admin.id,
      })
      .returning(),
  );

  await db.insert(complaintCommentsTable).values({
    complaintId: residentOneComplaint.id,
    authorId: admin.id,
    body: "Thanks for flagging — we've asked the electrician to take a look this week.",
  });

  console.log("Seeding amenities + booking...");
  const clubhouse = one(
    await db
      .insert(amenitiesTable)
      .values({
        societyId: society.id,
        name: "Clubhouse",
        description: "Indoor games, seating area, and event hall.",
        capacity: 30,
        openTime: "08:00",
        closeTime: "22:00",
        slotMinutes: 60,
      })
      .returning(),
  );

  await db.insert(amenitiesTable).values({
    societyId: society.id,
    name: "Swimming Pool",
    description: "Open-air pool, adult supervision required for children.",
    capacity: 15,
    openTime: "06:00",
    closeTime: "20:00",
    slotMinutes: 60,
  });

  await db.insert(amenityBookingsTable).values({
    amenityId: clubhouse.id,
    flatId: resident(5).flatId!,
    bookedByUserId: resident(5).id,
    date: new Date().toISOString().slice(0, 10),
    slotStart: "18:00",
    slotEnd: "19:00",
    status: "confirmed",
  });

  // Booking on resident(0) (the demo login) so "My Bookings" isn't empty on first login.
  await db.insert(amenityBookingsTable).values({
    amenityId: clubhouse.id,
    flatId: resident(0).flatId!,
    bookedByUserId: resident(0).id,
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
    slotStart: "19:00",
    slotEnd: "20:00",
    status: "confirmed",
  });

  console.log("Seeding dues...");
  await db.insert(duesTable).values({
    flatId: resident(6).flatId!,
    period: new Date().toISOString().slice(0, 7),
    amount: "2500.00",
    status: "pending",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString().slice(0, 10),
  });

  // Due on resident(0) (the demo login) so the Dues screen isn't empty on first login.
  await db.insert(duesTable).values({
    flatId: resident(0).flatId!,
    period: new Date().toISOString().slice(0, 7),
    amount: "3200.00",
    status: "pending",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString().slice(0, 10),
  });

  console.log("Seeding staff directory...");
  await db.insert(staffDirectoryTable).values([
    {
      societyId: society.id,
      name: "Manoj (Plumber)",
      category: "plumber",
      phone: "+919888800001",
      isVerifiedByAdmin: true,
      addedByUserId: admin.id,
    },
    {
      societyId: society.id,
      name: "Deepak (Electrician)",
      category: "electrician",
      phone: "+919888800002",
      isVerifiedByAdmin: true,
      addedByUserId: admin.id,
    },
    {
      societyId: society.id,
      name: "Sunita (Milk Delivery)",
      category: "other",
      phone: "+919888800003",
      isVerifiedByAdmin: false,
      addedByUserId: admin.id,
    },
  ]);

  const firstFlat = flats[0];
  if (!firstFlat) throw new Error("Expected at least one seeded flat");

  console.log("\nSeed complete.\n");
  console.log("Demo credentials (all use the same password):");
  console.log(`  password: ${DEMO_PASSWORD}\n`);
  console.log(`  admin:     ${admin.phone} / ${admin.email}`);
  console.log(`  guard 1:   ${guard1.phone} / ${guard1.email}`);
  console.log(`  guard 2:   ${guard2.phone} / ${guard2.email}`);
  console.log(
    `  resident:  ${resident(0).phone} / ${resident(0).email} (flat ${firstFlat.flatNumber})`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
