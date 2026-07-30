import { env } from "cloudflare:workers";

export type AppEnv = {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
  IMAGE_API_KEY?: string;
  IMAGE_API_BASE_URL?: string;
  ADMIN_EMAILS?: string;
};

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  balanceCents: number;
  role: string;
};

export type Pricing = {
  standardPriceCents: number;
  proPriceCents: number;
  agentCommissionPercent: number;
};

export const DEFAULT_PRICING: Pricing = {
  standardPriceCents: 12,
  proPriceCents: 32,
  agentCommissionPercent: 20,
};

export function getAppEnv(): AppEnv {
  return env as unknown as AppEnv;
}

export async function initializeDatabase(db: D1Database) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        balance_cents INTEGER NOT NULL DEFAULT 500,
        role TEXT NOT NULL DEFAULT 'student',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS agent_applications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        campus_name TEXT NOT NULL,
        contact TEXT NOT NULL,
        desired_slug TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS agent_sites (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        campus_name TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        standard_price_cents INTEGER NOT NULL,
        pro_price_cents INTEGER NOT NULL,
        commission_percent INTEGER NOT NULL DEFAULT 20,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS generations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subsite_id TEXT,
        prompt TEXT NOT NULL,
        plan TEXT NOT NULL,
        size TEXT NOT NULL,
        price_cents INTEGER NOT NULL,
        agent_commission_cents INTEGER NOT NULL DEFAULT 0,
        image_key TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS generations_user_idx ON generations (user_id, created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS generations_subsite_idx ON generations (subsite_id, created_at)",
    ),
  ]);
}

export async function getOrCreateUser(
  db: D1Database,
  email: string,
  displayName: string,
): Promise<AppUser> {
  await initializeDatabase(db);
  const existing = await db
    .prepare(
      "SELECT id, email, display_name, balance_cents, role FROM users WHERE email = ?",
    )
    .bind(email)
    .first<{
      id: string;
      email: string;
      display_name: string;
      balance_cents: number;
      role: string;
    }>();

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      displayName: existing.display_name,
      balanceCents: existing.balance_cents,
      role: existing.role,
    };
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO users (id, email, display_name, balance_cents, role) VALUES (?, ?, ?, 500, 'student')",
    )
    .bind(id, email, displayName)
    .run();
  return { id, email, displayName, balanceCents: 500, role: "student" };
}

export async function getPricing(db: D1Database): Promise<Pricing> {
  await initializeDatabase(db);
  const result = await db
    .prepare(
      "SELECT key, value FROM settings WHERE key IN ('standard_price_cents', 'pro_price_cents', 'agent_commission_percent')",
    )
    .all<{ key: string; value: string }>();
  const values = Object.fromEntries(
    (result.results ?? []).map((row: { key: string; value: string }) => [
      row.key,
      Number(row.value),
    ]),
  );
  return {
    standardPriceCents:
      values.standard_price_cents || DEFAULT_PRICING.standardPriceCents,
    proPriceCents: values.pro_price_cents || DEFAULT_PRICING.proPriceCents,
    agentCommissionPercent:
      values.agent_commission_percent ||
      DEFAULT_PRICING.agentCommissionPercent,
  };
}

export async function requireAdmin(
  db: D1Database,
  email: string,
): Promise<boolean> {
  await initializeDatabase(db);
  const configured = (getAppEnv().ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length > 0) return configured.includes(email.toLowerCase());

  const owner = await db
    .prepare("SELECT value FROM settings WHERE key = 'owner_email'")
    .first<{ value: string }>();
  if (owner) return owner.value.toLowerCase() === email.toLowerCase();

  await db
    .prepare(
      "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('owner_email', ?, CURRENT_TIMESTAMP)",
    )
    .bind(email)
    .run();
  const claimed = await db
    .prepare("SELECT value FROM settings WHERE key = 'owner_email'")
    .first<{ value: string }>();
  return claimed?.value.toLowerCase() === email.toLowerCase();
}

export function money(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}
