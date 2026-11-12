import { boolean, integer, jsonb, pgTable, serial, text, timestamp, customType } from 'drizzle-orm/pg-core';

// bytea column for images kept in the database when Cloudinary isn't set up (dev / fallback)
const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });

/* Two generations of content tables live in the same database:
   • site_v2_*  — the multi-page site (Home, Services, Work + case studies, About, Contact). Everything below
                  that the code reads and writes (siteSettings, sections, drafts, versions) points here.
   • the original single-page tables (site_settings, sections, drafts, versions) — still read and written by
     the one-page site that is live until the multi-page version is published. This code only READS them
     (legacy* below), once, to fill site_v2_* when they are empty (see src/lib/pages.ts → fromLegacy).
   So the preview and the live site can share one database without touching each other's content. */

/** One row (id = 1): every site-wide setting (logo, colours, WhatsApp, socials, SEO…) as JSON, one key per field. */
export const siteSettings = pgTable('site_v2_settings', {
  id: integer('id').primaryKey().default(1),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Every page's sections, in order (`page` = home | services | work | about | contact; case studies are
 *  page "cases", one row each). `data` holds the section's fields; texts are {ar, en}. */
export const sections = pgTable('site_v2_sections', {
  id: text('id').primaryKey(),
  page: text('page').notNull().default('home'),
  type: text('type').notNull(),
  position: integer('position').notNull(),
  hidden: boolean('hidden').notNull().default(false),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Uploaded images/videos. provider 'cloudinary' → url is Cloudinary's; 'db' → bytes are here, served at /media-db/<id>/<name>. */
export const media = pgTable('media', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  url: text('url').notNull(),
  filename: text('filename').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  bytes: bytea('bytes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminUsers = pgTable('admin_user', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  sessionVersion: integer('session_version').notNull().default(1),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Failed sign-in counters, per email and per IP (key "email:…" / "ip:…") — for the lockout. */
export const loginAttempts = pgTable('login_attempts', {
  key: text('key').primaryKey(),
  fails: integer('fails').notNull().default(0),
  firstFailAt: timestamp('first_fail_at', { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
});

/** Audit log + undo: every change stores who/what/when and the whole content as it was BEFORE the change. */
export const versions = pgTable('site_v2_versions', {
  id: serial('id').primaryKey(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  userEmail: text('user_email'),
  action: text('action').notNull(),
  detail: text('detail'),
  snapshot: jsonb('snapshot').$type<ContentSnapshot>().notNull(),
});

/** The live editor's unpublished work (one row, id = 1): the whole content as the admin is editing it.
 *  Saved automatically while editing so a refresh loses nothing; «نشر» copies it to the tables above and deletes it. */
export const drafts = pgTable('site_v2_drafts', {
  id: integer('id').primaryKey().default(1),
  data: jsonb('data').$type<ContentSnapshot>().notNull(),
  userEmail: text('user_email'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* The one-page site's tables — read only here (never written by this code). */
export const legacySiteSettings = pgTable('site_settings', {
  id: integer('id').primaryKey().default(1),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const legacySections = pgTable('sections', {
  id: text('id').primaryKey(),
  page: text('page').notNull().default('home'),
  type: text('type').notNull(),
  position: integer('position').notNull(),
  hidden: boolean('hidden').notNull().default(false),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** `page` is which page the section belongs to (missing = "home", the one-page site's rows). */
export type SectionRow = { id: string; type: string; hidden: boolean; data: Record<string, unknown>; page?: string };
export type ContentSnapshot = { settings: Record<string, unknown>; sections: SectionRow[] };
