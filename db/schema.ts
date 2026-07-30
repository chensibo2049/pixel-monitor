import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  balanceCents: integer("balance_cents").notNull().default(500),
  role: text("role").notNull().default("student"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const agentApplications = sqliteTable("agent_applications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  campusName: text("campus_name").notNull(),
  contact: text("contact").notNull(),
  desiredSlug: text("desired_slug").notNull(),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const agentSites = sqliteTable("agent_sites", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  slug: text("slug").notNull().unique(),
  campusName: text("campus_name").notNull(),
  brandName: text("brand_name").notNull(),
  standardPriceCents: integer("standard_price_cents").notNull(),
  proPriceCents: integer("pro_price_cents").notNull(),
  commissionPercent: integer("commission_percent").notNull().default(20),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const generations = sqliteTable("generations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  subsiteId: text("subsite_id"),
  prompt: text("prompt").notNull(),
  plan: text("plan").notNull(),
  size: text("size").notNull(),
  priceCents: integer("price_cents").notNull(),
  agentCommissionCents: integer("agent_commission_cents").notNull().default(0),
  imageKey: text("image_key"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
