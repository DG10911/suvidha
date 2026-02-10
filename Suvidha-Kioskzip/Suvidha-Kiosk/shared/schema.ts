import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, numeric, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  phone: text("phone"),
  aadhaar: text("aadhaar"),
  suvidhaId: text("suvidha_id").unique(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const faceProfiles = pgTable("face_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  faceImage: text("face_image").notNull(),
  faceHash: text("face_hash").notNull(),
  faceDescriptor: text("face_descriptor"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const qrTokens = pgTable("qr_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  payload: text("payload").notNull(),
  revoked: boolean("revoked").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  complaintId: text("complaint_id").notNull().unique(),
  userId: varchar("user_id").references(() => users.id),
  service: text("service").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("submitted"),
  urgency: text("urgency").notNull().default("medium"),
  slaDeadline: timestamp("sla_deadline"),
  assignedTo: text("assigned_to"),
  resolution: text("resolution"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  locationAddress: text("location_address"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const complaintTimeline = pgTable("complaint_timeline", {
  id: serial("id").primaryKey(),
  complaintId: text("complaint_id").notNull(),
  status: text("status").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  type: text("type").notNull(),
  service: text("service"),
  amount: text("amount"),
  referenceId: text("reference_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  actionLink: text("action_link"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const linkedServices = pgTable("linked_services", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceName: text("service_name").notNull(),
  consumerId: text("consumer_id"),
  connected: boolean("connected").default(false),
});

export const walletAccounts = pgTable("wallet_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method"),
  description: text("description"),
  referenceId: text("reference_id"),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  office: text("office").notNull(),
  purpose: text("purpose").notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  tokenNumber: text("token_number"),
  status: text("status").notNull().default("booked"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  complaintId: text("complaint_id"),
  service: text("service").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("general"),
  priority: text("priority").notNull().default("normal"),
  active: boolean("active").default(true),
  startDate: timestamp("start_date").default(sql`CURRENT_TIMESTAMP`),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const emergencyLogs = pgTable("emergency_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  serviceType: text("service_type").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("initiated"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const govtSchemes = pgTable("govt_schemes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ministry: text("ministry").notNull(),
  category: text("category").notNull().default("general"),
  summary: text("summary").notNull(),
  eligibility: text("eligibility").notNull(),
  benefits: text("benefits").notNull(),
  howToApply: text("how_to_apply").notNull(),
  documentsRequired: text("documents_required").notNull(),
  websiteUrl: text("website_url"),
  lastDate: text("last_date"),
  isNew: boolean("is_new").default(true),
  active: boolean("active").default(true),
  launchDate: timestamp("launch_date").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const certificateApplications = pgTable("certificate_applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  applicationId: text("application_id").notNull().unique(),
  certificateType: text("certificate_type").notNull(),
  applicantName: text("applicant_name").notNull(),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  dateOfBirth: text("date_of_birth"),
  address: text("address"),
  purpose: text("purpose"),
  additionalDetails: text("additional_details"),
  status: text("status").notNull().default("submitted"),
  remarks: text("remarks"),
  expectedDate: text("expected_date"),
  fee: text("fee"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const rtiApplications = pgTable("rti_applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  rtiId: text("rti_id").notNull().unique(),
  department: text("department").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  applicantName: text("applicant_name").notNull(),
  applicantAddress: text("applicant_address").notNull(),
  bplStatus: boolean("bpl_status").default(false),
  fee: text("fee").notNull().default("10"),
  status: text("status").notNull().default("submitted"),
  responseDate: text("response_date"),
  response: text("response"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type GovtScheme = typeof govtSchemes.$inferSelect;
export type CertificateApplication = typeof certificateApplications.$inferSelect;
export type RtiApplication = typeof rtiApplications.$inferSelect;
export type FaceProfile = typeof faceProfiles.$inferSelect;
export type QrToken = typeof qrTokens.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;
export type ComplaintTimeline = typeof complaintTimeline.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type LinkedService = typeof linkedServices.$inferSelect;
export type WalletAccount = typeof walletAccounts.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type EmergencyLog = typeof emergencyLogs.$inferSelect;

export * from "./models/chat";
