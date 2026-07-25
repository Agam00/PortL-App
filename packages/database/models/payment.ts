import { pgTable, pgEnum, uuid, varchar, numeric, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { duesTable } from "./due";

export const paymentStatusEnum = pgEnum("payment_status", ["created", "success", "failed"]);

export const paymentsTable = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),

  dueId: uuid("due_id")
    .notNull()
    .references(() => duesTable.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),

  provider: varchar("provider", { length: 30 }).notNull().default("razorpay"),
  providerRefId: varchar("provider_ref_id", { length: 120 }),
  status: paymentStatusEnum("status").notNull().default("created"),

  // UPI manual flow: resident's payment screenshot (base64 data URL) + admin verification.
  proofImage: text("proof_image"),
  verified: boolean("verified").notNull().default(false),

  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectPayment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
