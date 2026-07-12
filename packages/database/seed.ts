import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
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
  const [society] = await db
    .insert(societiesTable)
    .values({ name: "Palm Meadows", address: "12 Lakeview Road", city: "Bengaluru" })
    .returning();

  const [towerA] = await db
    .insert(towersTable)
    .values({ societyId: society.id, name: "Tower A", code: "A" })
    .returning();
  const [towerB] = await db
    .insert(towersTable)
    .values({ societyId: society.id, name: "Tower B", code: "B" })
    .returning();

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

  const flats = [];
  for (const def of flatDefs) {
    const [flat] = await db
      .insert(flatsTable)
      .values({
        towerId: def.tower.id,
        flatNumber: def.number,
        floor: def.floor,
        type: def.type,
      })
      .returning();
    flats.push(flat);
  }

  console.log("Seeding users (admin, guards, residents)...");
  const [admin] = await db
    .insert(usersTable)
    .values({
      fullName: "Asha Admin",
      email: "admin@portl.dev",
      phone: "+911000000001",
      passwordHash,
      role: "admin",
      societyId: society.id,
    })
    .returning();

  const [guard1] = await db
    .insert(usersTable)
    .values({
      fullName: "Ramesh Kumar",
      email: "guard1@portl.dev",
      phone: "+911000000002",
      passwordHash,
      role: "guard",
      societyId: society.id,
    })
    .returning();

  const [guard2] = await db
    .insert(usersTable)
    .values({
      fullName: "Suresh Yadav",
      email: "guard2@portl.dev",
      phone: "+911000000003",
      passwordHash,
      role: "guard",
      societyId: society.id,
    })
    .returning();

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

  const residents = [];
  for (let i = 0; i < residentDefs.length; i++) {
    const def = residentDefs[i];
    const [resident] = await db
      .insert(usersTable)
      .values({
        fullName: def.name,
        email: `resident${i + 1}@portl.dev`,
        phone: `+91100000001${i}`,
        passwordHash,
        role: "resident",
        societyId: society.id,
        flatId: flats[def.flatIndex].id,
      })
      .returning();
    residents.push(resident);
  }
  // flats[8] and flats[9] are intentionally left vacant for demo variety.

  console.log("Seeding visitors + visitor logs...");
  await db.insert(visitorsTable).values({
    societyId: society.id,
    flatId: residents[0].flatId!,
    name: "Swiggy Delivery",
    phone: "+919999900001",
    type: "delivery",
    source: "guard_initiated",
    status: "pending",
    requestedByGuardId: guard1.id,
  });

  const [approvedVisitor] = await db
    .insert(visitorsTable)
    .values({
      societyId: society.id,
      flatId: residents[1].flatId!,
      name: "Rohan (Friend)",
      phone: "+919999900002",
      type: "guest",
      source: "guard_initiated",
      status: "checked_in",
      requestedByGuardId: guard1.id,
      decidedByUserId: residents[1].id,
      decidedAt: new Date(),
    })
    .returning();

  await db.insert(visitorLogsTable).values({
    visitorId: approvedVisitor.id,
    guardId: guard1.id,
    action: "entry",
  });

  await db.insert(visitorsTable).values({
    societyId: society.id,
    flatId: residents[2].flatId!,
    name: "Ola Cab",
    phone: "+919999900003",
    type: "cab",
    source: "resident_preapproved",
    status: "approved",
    decidedByUserId: residents[2].id,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 1000 * 60 * 60 * 6),
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
  const [poll] = await db
    .insert(pollsTable)
    .values({
      societyId: society.id,
      createdByUserId: admin.id,
      question: "Preferred day for the monthly society meeting?",
      description: "Pick the day that works best for most residents.",
      multiSelect: false,
      closesAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    })
    .returning();

  const [optionSat, optionSun] = await db
    .insert(pollOptionsTable)
    .values([
      { pollId: poll.id, label: "Saturday" },
      { pollId: poll.id, label: "Sunday" },
    ])
    .returning();

  await db.insert(pollVotesTable).values([
    { pollId: poll.id, optionId: optionSat.id, userId: residents[0].id },
    { pollId: poll.id, optionId: optionSat.id, userId: residents[1].id },
    { pollId: poll.id, optionId: optionSun.id, userId: residents[2].id },
  ]);

  console.log("Seeding complaints...");
  const [openComplaint] = await db
    .insert(complaintsTable)
    .values({
      societyId: society.id,
      raisedByUserId: residents[3].id,
      category: "Plumbing",
      title: "Leaking pipe in bathroom",
      description: "There's a persistent leak under the bathroom sink.",
      status: "open",
      priority: "medium",
    })
    .returning();

  await db.insert(complaintCommentsTable).values({
    complaintId: openComplaint.id,
    authorId: admin.id,
    body: "We've noted this and will send a plumber within 24 hours.",
  });

  await db.insert(complaintsTable).values({
    societyId: society.id,
    raisedByUserId: residents[4].id,
    category: "Electrical",
    title: "Common area light not working",
    description: "The light near the parking entrance has been out for a week.",
    status: "resolved",
    priority: "low",
    assignedToUserId: admin.id,
    resolvedAt: new Date(),
  });

  console.log("Seeding amenities + booking...");
  const [clubhouse] = await db
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
    .returning();

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
    flatId: residents[5].flatId!,
    bookedByUserId: residents[5].id,
    date: new Date().toISOString().slice(0, 10),
    slotStart: "18:00",
    slotEnd: "19:00",
    status: "confirmed",
  });

  console.log("Seeding dues...");
  await db.insert(duesTable).values({
    flatId: residents[6].flatId!,
    period: new Date().toISOString().slice(0, 7),
    amount: "2500.00",
    status: "pending",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString().slice(0, 10),
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

  console.log("\nSeed complete.\n");
  console.log("Demo credentials (all use the same password):");
  console.log(`  password: ${DEMO_PASSWORD}\n`);
  console.log(`  admin:     ${admin.phone} / ${admin.email}`);
  console.log(`  guard 1:   ${guard1.phone} / ${guard1.email}`);
  console.log(`  guard 2:   ${guard2.phone} / ${guard2.email}`);
  console.log(
    `  resident:  ${residents[0].phone} / ${residents[0].email} (flat ${flats[0].flatNumber})`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
