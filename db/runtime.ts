import BetterSqlite3, { type Database as BetterSqliteDatabase } from "better-sqlite3";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_LOGO_PROMPT,
  parseLogoPosition,
  type LogoPosition,
} from "../app/lib/brand-profile";

type SqlValue = string | number | bigint | Buffer | null;

class LocalPreparedQuery {
  private params: SqlValue[] = [];

  constructor(
    private database: BetterSqliteDatabase,
    private sql: string,
  ) {}

  bind(...params: SqlValue[]) {
    this.params = params;
    return this;
  }

  run() {
    const result = this.database.prepare(this.sql).run(...this.params);
    return { success: true, meta: { changes: result.changes } };
  }

  first<T>() {
    return (this.database.prepare(this.sql).get(...this.params) as T | undefined) ?? null;
  }

  all<T>() {
    return {
      success: true,
      results: this.database.prepare(this.sql).all(...this.params) as T[],
    };
  }
}

export class LocalDatabase {
  constructor(private database: BetterSqliteDatabase) {}

  prepare(sql: string) {
    return new LocalPreparedQuery(this.database, sql);
  }

  batch(queries: LocalPreparedQuery[]) {
    const execute = this.database.transaction(() => queries.map((query) => query.run()));
    return execute();
  }

  transaction<T>(operation: () => T) {
    return this.database.transaction(operation)();
  }

  backup(destination: string) {
    return this.database.backup(destination);
  }
}

export type AppEnv = {
  DB: LocalDatabase;
  IMAGE_API_KEY?: string;
  IMAGE_API_BASE_URL?: string;
  ADMIN_EMAILS?: string;
  AUTH_SECRET: string;
  DATA_DIR: string;
};

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  balanceCents: number;
  role: string;
  originSubsiteId: string | null;
};

export type UserBrandProfile = {
  hasLogo: boolean;
  logoFileName: string | null;
  logoMimeType: string | null;
  defaultPrompt: string;
  defaultPosition: LogoPosition;
  useByDefault: boolean;
  updatedAt: string | null;
};

export type AttributedSubsite = {
  id: string;
  slug: string;
  campusName: string;
  brandName: string;
  standardPriceCents: number;
  proPriceCents: number;
  standardPackPriceCents: number;
  proPackPriceCents: number;
  commissionPercent: number;
  permanent: boolean;
};

export type Pricing = {
  standardPriceCents: number;
  proPriceCents: number;
  standardPackPriceCents: number;
  proPackPriceCents: number;
  editDiscountPercent: number;
  agentCommissionPercent: number;
};

export class InsufficientBalanceError extends Error {
  constructor() {
    super("INSUFFICIENT_BALANCE");
  }
}

export const DEFAULT_PRICING: Pricing = {
  standardPriceCents: 12,
  proPriceCents: 32,
  standardPackPriceCents: 30,
  proPackPriceCents: 100,
  editDiscountPercent: 50,
  agentCommissionPercent: 20,
};

export const WELCOME_BALANCE_CENTS = 30;

const globalDatabase = globalThis as unknown as {
  pixelMonitorDatabase?: LocalDatabase;
  pixelMonitorInitialization?: Promise<void>;
  pixelMonitorBackupPromise?: Promise<void>;
  pixelMonitorLastBackupAt?: number;
  pixelMonitorCleanupPromise?: Promise<void>;
  pixelMonitorLastCleanupAt?: number;
};

function dataDirectory() {
  return process.env.DATA_DIR ?? path.join(process.cwd(), "data");
}

function getDatabase() {
  if (globalDatabase.pixelMonitorDatabase) return globalDatabase.pixelMonitorDatabase;
  const directory = dataDirectory();
  mkdirSync(directory, { recursive: true });
  const nativeDatabase = new BetterSqlite3(path.join(directory, "pixel-monitor.db"));
  nativeDatabase.pragma("journal_mode = WAL");
  nativeDatabase.pragma("foreign_keys = ON");
  globalDatabase.pixelMonitorDatabase = new LocalDatabase(nativeDatabase);
  return globalDatabase.pixelMonitorDatabase;
}

export function getAppEnv(): AppEnv {
  const configuredSecret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!configuredSecret || configuredSecret.length < 32)) {
    throw new Error("生产环境必须配置至少 32 个字符的 AUTH_SECRET。");
  }
  return {
    DB: getDatabase(),
    IMAGE_API_KEY: process.env.IMAGE_API_KEY,
    IMAGE_API_BASE_URL: process.env.IMAGE_API_BASE_URL,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    AUTH_SECRET: configuredSecret ?? "local-development-secret-change-before-deploy",
    DATA_DIR: dataDirectory(),
  };
}

export async function initializeDatabase(db: LocalDatabase) {
  if (!globalDatabase.pixelMonitorInitialization) {
    globalDatabase.pixelMonitorInitialization = (async () => {
      await mkdir(dataDirectory(), { recursive: true });
      db.batch([
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
        password_hash TEXT,
        balance_cents INTEGER NOT NULL DEFAULT 30,
        role TEXT NOT NULL DEFAULT 'student',
        origin_subsite_id TEXT REFERENCES agent_sites(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS agent_applications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slug TEXT NOT NULL UNIQUE,
        campus_name TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        standard_price_cents INTEGER NOT NULL,
        pro_price_cents INTEGER NOT NULL,
        standard_pack_price_cents INTEGER NOT NULL DEFAULT 30,
        pro_pack_price_cents INTEGER NOT NULL DEFAULT 100,
        commission_percent INTEGER NOT NULL DEFAULT 20,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS generations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subsite_id TEXT REFERENCES agent_sites(id) ON DELETE SET NULL,
        prompt TEXT NOT NULL,
        plan TEXT NOT NULL,
        operation TEXT NOT NULL DEFAULT 'generate',
        size TEXT NOT NULL,
        image_count INTEGER NOT NULL DEFAULT 1,
        price_cents INTEGER NOT NULL,
        agent_commission_cents INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS generation_assets (
        id TEXT PRIMARY KEY,
        generation_id TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'image/webp',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(generation_id, position)
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS user_brand_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        logo_file_name TEXT,
        logo_mime_type TEXT,
        default_prompt TEXT NOT NULL DEFAULT '${DEFAULT_LOGO_PROMPT}',
        default_position TEXT NOT NULL DEFAULT 'top-left',
        use_by_default INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        request_count INTEGER NOT NULL DEFAULT 0,
        window_started_at INTEGER NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'info',
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, is_read, created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS generations_user_idx ON generations (user_id, created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS generations_subsite_idx ON generations (subsite_id, created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS generation_assets_generation_idx ON generation_assets (generation_id, position)",
    ),
      ]);
      ensureColumn(db, "agent_sites", "standard_pack_price_cents", "INTEGER NOT NULL DEFAULT 30");
      ensureColumn(db, "agent_sites", "pro_pack_price_cents", "INTEGER NOT NULL DEFAULT 100");
      ensureColumn(db, "users", "origin_subsite_id", "TEXT REFERENCES agent_sites(id) ON DELETE SET NULL");
      db.prepare("CREATE INDEX IF NOT EXISTS users_origin_subsite_idx ON users (origin_subsite_id)").run();
    })().catch((error) => {
      globalDatabase.pixelMonitorInitialization = undefined;
      throw error;
    });
  }
  await globalDatabase.pixelMonitorInitialization;
  await maybeBackupDatabase(db);
  await maybeCleanupStaleData(db);
}

function ensureColumn(
  db: LocalDatabase,
  table: string,
  column: string,
  definition: string,
) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (!columns.results.some((item) => item.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

export async function getOrCreateUser(
  db: LocalDatabase,
  email: string,
  displayName: string,
): Promise<AppUser> {
  await initializeDatabase(db);
  const existing = db
    .prepare(
      "SELECT id, email, display_name, balance_cents, role, origin_subsite_id FROM users WHERE email = ?",
    )
    .bind(email)
    .first<{
      id: string;
      email: string;
      display_name: string;
      balance_cents: number;
      role: string;
      origin_subsite_id: string | null;
    }>();

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      displayName: existing.display_name,
      balanceCents: existing.balance_cents,
      role: existing.role,
      originSubsiteId: existing.origin_subsite_id,
    };
  }

  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO users (id, email, display_name, balance_cents, role) VALUES (?, ?, ?, ?, 'student')",
  )
    .bind(id, email, displayName, WELCOME_BALANCE_CENTS)
    .run();
  return { id, email, displayName, balanceCents: WELCOME_BALANCE_CENTS, role: "student", originSubsiteId: null };
}

export function getAttributedSubsite(
  db: LocalDatabase,
  userId: string,
  claimedSlug?: string | null,
): AttributedSubsite | null {
  const select = `SELECT s.id, s.slug, s.campus_name, s.brand_name,
      s.standard_price_cents, s.pro_price_cents,
      s.standard_pack_price_cents, s.pro_pack_price_cents,
      s.commission_percent
    FROM agent_sites s`;
  const permanent = db.prepare(
    `${select} JOIN users u ON u.origin_subsite_id = s.id
     WHERE u.id = ? AND s.status = 'active' LIMIT 1`,
  ).bind(userId).first<{
    id: string; slug: string; campus_name: string; brand_name: string;
    standard_price_cents: number; pro_price_cents: number;
    standard_pack_price_cents: number; pro_pack_price_cents: number;
    commission_percent: number;
  }>();
  const site = permanent ?? (claimedSlug
    ? db.prepare(`${select} WHERE s.slug = ? AND s.status = 'active' LIMIT 1`)
        .bind(claimedSlug).first<{
          id: string; slug: string; campus_name: string; brand_name: string;
          standard_price_cents: number; pro_price_cents: number;
          standard_pack_price_cents: number; pro_pack_price_cents: number;
          commission_percent: number;
        }>()
    : null);
  if (!site) return null;
  return {
    id: site.id,
    slug: site.slug,
    campusName: site.campus_name,
    brandName: site.brand_name,
    standardPriceCents: site.standard_price_cents,
    proPriceCents: site.pro_price_cents,
    standardPackPriceCents: site.standard_pack_price_cents,
    proPackPriceCents: site.pro_pack_price_cents,
    commissionPercent: site.commission_percent,
    permanent: Boolean(permanent),
  };
}

export function createPaidGeneration(
  db: LocalDatabase,
  input: {
    id: string;
    userId: string;
    subsiteId?: string | null;
    prompt: string;
    plan: string;
    operation: string;
    size: string;
    imageCount: number;
    priceCents: number;
    commissionCents?: number;
  },
) {
  db.transaction(() => {
    const debit = db.prepare(
      "UPDATE users SET balance_cents = balance_cents - ? WHERE id = ? AND balance_cents >= ?",
    ).bind(input.priceCents, input.userId, input.priceCents).run();
    if (!debit.meta.changes) throw new InsufficientBalanceError();
    db.prepare(
      `INSERT INTO generations
        (id, user_id, subsite_id, prompt, plan, operation, size, image_count, price_cents, agent_commission_cents, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    ).bind(
      input.id,
      input.userId,
      input.subsiteId ?? null,
      input.prompt,
      input.plan,
      input.operation,
      input.size,
      input.imageCount,
      input.priceCents,
      input.commissionCents ?? 0,
    ).run();
  });
}

export function failGenerationAndRefund(
  db: LocalDatabase,
  generationId: string,
  userId: string,
  priceCents: number,
  message: string,
) {
  db.transaction(() => {
    const failed = db.prepare(
      "UPDATE generations SET status = 'failed', error_message = ? WHERE id = ? AND status = 'pending'",
    ).bind(message.slice(0, 300), generationId).run();
    if (failed.meta.changes) {
      db.prepare("UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?")
        .bind(priceCents, userId).run();
    }
  });
}

export async function getPricing(db: LocalDatabase): Promise<Pricing> {
  await initializeDatabase(db);
  const result = db
    .prepare(
      `SELECT key, value FROM settings WHERE key IN (
        'standard_price_cents', 'pro_price_cents',
        'standard_pack_price_cents', 'pro_pack_price_cents',
        'edit_discount_percent', 'agent_commission_percent'
      )`,
    )
    .all<{ key: string; value: string }>();
  const values = Object.fromEntries(
    result.results.map((row) => [row.key, Number(row.value)]),
  );
  return {
    standardPriceCents:
      values.standard_price_cents || DEFAULT_PRICING.standardPriceCents,
    proPriceCents: values.pro_price_cents || DEFAULT_PRICING.proPriceCents,
    standardPackPriceCents:
      values.standard_pack_price_cents || DEFAULT_PRICING.standardPackPriceCents,
    proPackPriceCents:
      values.pro_pack_price_cents || DEFAULT_PRICING.proPackPriceCents,
    editDiscountPercent:
      values.edit_discount_percent || DEFAULT_PRICING.editDiscountPercent,
    agentCommissionPercent:
      values.agent_commission_percent || DEFAULT_PRICING.agentCommissionPercent,
  };
}

export async function requireAdmin(
  db: LocalDatabase,
  email: string,
): Promise<boolean> {
  await initializeDatabase(db);
  const configured = (getAppEnv().ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length > 0) return configured.includes(email.toLowerCase());

  const owner = db
    .prepare("SELECT value FROM settings WHERE key = 'owner_email'")
    .first<{ value: string }>();
  if (owner) return owner.value.toLowerCase() === email.toLowerCase();

  db.prepare(
    "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('owner_email', ?, CURRENT_TIMESTAMP)",
  )
    .bind(email)
    .run();
  const claimed = db
    .prepare("SELECT value FROM settings WHERE key = 'owner_email'")
    .first<{ value: string }>();
  return claimed?.value.toLowerCase() === email.toLowerCase();
}

export async function saveGeneratedAsset(
  generationId: string,
  position: number,
  bytes: Uint8Array,
  extension = "webp",
) {
  const imageDirectory = path.join(dataDirectory(), "images");
  await mkdir(imageDirectory, { recursive: true });
  const fileName = `${generationId}-${position}.${extension}`;
  await writeFile(path.join(imageDirectory, fileName), bytes);
  return fileName;
}

export async function readGeneratedAsset(fileName: string) {
  if (path.basename(fileName) !== fileName) return null;
  try {
    return await readFile(path.join(dataDirectory(), "images", fileName));
  } catch {
    return null;
  }
}

export async function deleteGeneratedAssets(db: LocalDatabase, generationId: string) {
  const imageDirectory = path.join(dataDirectory(), "images");
  const records = db.prepare(
    "SELECT file_name FROM generation_assets WHERE generation_id = ?",
  ).bind(generationId).all<{ file_name: string }>();
  db.prepare("DELETE FROM generation_assets WHERE generation_id = ?").bind(generationId).run();
  const known = new Set(records.results.map((record) => record.file_name));
  const files = await readdir(imageDirectory).catch(() => [] as string[]);
  for (const fileName of files) {
    if (known.has(fileName) || fileName.startsWith(`${generationId}-`)) {
      await rm(path.join(imageDirectory, fileName), { force: true });
    }
  }
}

export function getUserBrandProfile(db: LocalDatabase, userId: string): UserBrandProfile {
  const row = db.prepare(
    `SELECT logo_file_name, logo_mime_type, default_prompt, default_position, use_by_default, updated_at
     FROM user_brand_profiles WHERE user_id = ?`,
  ).bind(userId).first<{
    logo_file_name: string | null;
    logo_mime_type: string | null;
    default_prompt: string;
    default_position: string;
    use_by_default: number;
    updated_at: string;
  }>();
  return {
    hasLogo: Boolean(row?.logo_file_name),
    logoFileName: row?.logo_file_name ?? null,
    logoMimeType: row?.logo_mime_type ?? null,
    defaultPrompt: row?.default_prompt || DEFAULT_LOGO_PROMPT,
    defaultPosition: parseLogoPosition(row?.default_position),
    useByDefault: row ? Boolean(row.use_by_default) : true,
    updatedAt: row?.updated_at ?? null,
  };
}

export async function saveUserBrandProfile(
  db: LocalDatabase,
  userId: string,
  input: {
    defaultPrompt: string;
    defaultPosition: LogoPosition;
    useByDefault: boolean;
    normalizedLogo?: Uint8Array;
    removeLogo?: boolean;
  },
) {
  const existing = getUserBrandProfile(db, userId);
  const brandDirectory = path.join(dataDirectory(), "brand-assets");
  await mkdir(brandDirectory, { recursive: true });
  let nextFileName = input.removeLogo ? null : existing.logoFileName;
  let nextMimeType = input.removeLogo ? null : existing.logoMimeType;
  let createdFileName: string | null = null;
  if (input.normalizedLogo) {
    createdFileName = `${userId}-${crypto.randomUUID()}.png`;
    await writeFile(path.join(brandDirectory, createdFileName), input.normalizedLogo);
    nextFileName = createdFileName;
    nextMimeType = "image/png";
  }

  try {
    db.prepare(
      `INSERT INTO user_brand_profiles
        (user_id, logo_file_name, logo_mime_type, default_prompt, default_position, use_by_default, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         logo_file_name = excluded.logo_file_name,
         logo_mime_type = excluded.logo_mime_type,
         default_prompt = excluded.default_prompt,
         default_position = excluded.default_position,
         use_by_default = excluded.use_by_default,
         updated_at = CURRENT_TIMESTAMP`,
    ).bind(
      userId,
      nextFileName,
      nextMimeType,
      input.defaultPrompt,
      input.defaultPosition,
      input.useByDefault ? 1 : 0,
    ).run();
  } catch (error) {
    if (createdFileName) await rm(path.join(brandDirectory, createdFileName), { force: true });
    throw error;
  }

  if (
    existing.logoFileName &&
    path.basename(existing.logoFileName) === existing.logoFileName &&
    existing.logoFileName !== nextFileName
  ) {
    await rm(path.join(brandDirectory, existing.logoFileName), { force: true });
  }
  return getUserBrandProfile(db, userId);
}

export async function readUserBrandAsset(fileName: string) {
  if (path.basename(fileName) !== fileName) return null;
  try {
    return await readFile(path.join(dataDirectory(), "brand-assets", fileName));
  } catch {
    return null;
  }
}

export function consumeRateLimit(
  db: LocalDatabase,
  scope: string,
  subject: string,
  limit: number,
  windowMs: number,
) {
  const key = `${scope}:${createHash("sha256").update(subject).digest("hex")}`;
  const now = Date.now();
  return db.transaction(() => {
    const existing = db.prepare(
      "SELECT request_count, window_started_at FROM rate_limits WHERE key = ?",
    ).bind(key).first<{ request_count: number; window_started_at: number }>();
    if (!existing || now - existing.window_started_at >= windowMs) {
      db.prepare(
        `INSERT INTO rate_limits (key, request_count, window_started_at) VALUES (?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET request_count = 1, window_started_at = excluded.window_started_at`,
      ).bind(key, now).run();
      return true;
    }
    if (existing.request_count >= limit) return false;
    db.prepare("UPDATE rate_limits SET request_count = request_count + 1 WHERE key = ?")
      .bind(key).run();
    return true;
  });
}

export function requestClientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function maybeBackupDatabase(db: LocalDatabase) {
  const now = Date.now();
  if (globalDatabase.pixelMonitorLastBackupAt && now - globalDatabase.pixelMonitorLastBackupAt < 60 * 60 * 1000) return;
  if (!globalDatabase.pixelMonitorBackupPromise) {
    globalDatabase.pixelMonitorBackupPromise = (async () => {
      const backupDirectory = path.join(dataDirectory(), "backups");
      await mkdir(backupDirectory, { recursive: true });
      const existing = (await readdir(backupDirectory).catch(() => [] as string[]))
        .filter((name) => /^pixel-monitor-.*\.db$/.test(name))
        .sort()
        .reverse();
      const latest = existing[0];
      if (latest) {
        const latestInfo = await stat(path.join(backupDirectory, latest)).catch(() => null);
        if (latestInfo && now - latestInfo.mtimeMs < 24 * 60 * 60 * 1000) {
          globalDatabase.pixelMonitorLastBackupAt = now;
          return;
        }
      }
      const stamp = new Date(now).toISOString().replace(/[:.]/g, "-");
      await db.backup(path.join(backupDirectory, `pixel-monitor-${stamp}.db`));
      const backups = (await readdir(backupDirectory))
        .filter((name) => /^pixel-monitor-.*\.db$/.test(name))
        .sort()
        .reverse();
      for (const obsolete of backups.slice(14)) {
        await rm(path.join(backupDirectory, obsolete), { force: true });
      }
      globalDatabase.pixelMonitorLastBackupAt = now;
    })().catch((error) => {
      console.error("SQLite 自动备份失败", error);
    }).finally(() => {
      globalDatabase.pixelMonitorBackupPromise = undefined;
    });
  }
  await globalDatabase.pixelMonitorBackupPromise;
}

async function maybeCleanupStaleData(db: LocalDatabase) {
  const now = Date.now();
  if (globalDatabase.pixelMonitorLastCleanupAt && now - globalDatabase.pixelMonitorLastCleanupAt < 60 * 60 * 1000) return;
  if (!globalDatabase.pixelMonitorCleanupPromise) {
    globalDatabase.pixelMonitorCleanupPromise = (async () => {
      const stale = db.prepare(
        `SELECT id, user_id, price_cents
         FROM generations
         WHERE status = 'pending' AND created_at < datetime('now', '-2 hours')`,
      ).all<{ id: string; user_id: string; price_cents: number }>();
      for (const generation of stale.results) {
        failGenerationAndRefund(
          db,
          generation.id,
          generation.user_id,
          generation.price_cents,
          "生成任务超时，系统自动关闭订单并退款。",
        );
        await deleteGeneratedAssets(db, generation.id);
      }

      const imageDirectory = path.join(dataDirectory(), "images");
      const recorded = new Set(
        db.prepare("SELECT file_name FROM generation_assets")
          .all<{ file_name: string }>()
          .results.map((asset) => asset.file_name),
      );
      const files = await readdir(imageDirectory).catch(() => [] as string[]);
      for (const fileName of files) {
        if (recorded.has(fileName)) continue;
        const filePath = path.join(imageDirectory, fileName);
        const fileInfo = await stat(filePath).catch(() => null);
        if (fileInfo && now - fileInfo.mtimeMs > 24 * 60 * 60 * 1000) {
          await rm(filePath, { force: true });
        }
      }
      const brandDirectory = path.join(dataDirectory(), "brand-assets");
      const recordedBrandAssets = new Set(
        db.prepare("SELECT logo_file_name FROM user_brand_profiles WHERE logo_file_name IS NOT NULL")
          .all<{ logo_file_name: string }>()
          .results.map((asset) => asset.logo_file_name),
      );
      const brandFiles = await readdir(brandDirectory).catch(() => [] as string[]);
      for (const fileName of brandFiles) {
        if (recordedBrandAssets.has(fileName)) continue;
        const filePath = path.join(brandDirectory, fileName);
        const fileInfo = await stat(filePath).catch(() => null);
        if (fileInfo && now - fileInfo.mtimeMs > 24 * 60 * 60 * 1000) {
          await rm(filePath, { force: true });
        }
      }
      db.prepare(
        "DELETE FROM rate_limits WHERE window_started_at < ?",
      ).bind(now - 7 * 24 * 60 * 60 * 1000).run();
      globalDatabase.pixelMonitorLastCleanupAt = now;
    })().catch((error) => {
      console.error("过期任务与孤儿图片清理失败", error);
    }).finally(() => {
      globalDatabase.pixelMonitorCleanupPromise = undefined;
    });
  }
  await globalDatabase.pixelMonitorCleanupPromise;
}

export function money(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function points(value: number) {
  return `${value} 积分`;
}
