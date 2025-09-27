import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  pgEnum,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role", { enum: ["VENDEDOR", "GESTOR", "ADMIN", "SUPER_ADMIN"] }).default("VENDEDOR"),
  isActive: boolean("is_active").default(true),
  phone: varchar("phone"),
  totalPoints: integer("total_points").default(0),
  monthlyPoints: integer("monthly_points").default(0),
  monthlyGoal: integer("monthly_goal").default(0),
  teamId: varchar("team_id"),
  managerId: varchar("manager_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().notNull().default("gen_random_uuid()"),
  name: varchar("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().notNull().default("gen_random_uuid()"),
  cnpj: varchar("cnpj").unique().notNull(),
  razaoSocial: varchar("razao_social").notNull(),
  nomeFantasia: varchar("nome_fantasia"),
  setor: varchar("setor"),
  cnae: varchar("cnae"),
  size: text("size", { enum: ["MEI", "ME", "EPP", "GRANDE"] }),
  status: text("status", { enum: ["ATIVA", "SUSPENSA", "INAPTA", "BAIXADA"] }).default("ATIVA"),
  faturamento: decimal("faturamento", { precision: 15, scale: 2 }),
  email: varchar("email"),
  phone: varchar("phone"),
  website: varchar("website"),
  cep: varchar("cep"),
  logradouro: varchar("logradouro"),
  numero: varchar("numero"),
  complemento: varchar("complemento"),
  bairro: varchar("bairro"),
  cidade: varchar("cidade"),
  uf: varchar("uf"),
  dataAbertura: timestamp("data_abertura"),
  capitalSocial: decimal("capital_social", { precision: 15, scale: 2 }),
  naturezaJuridica: varchar("natureza_juridica"),
  numeroFuncionarios: integer("numero_funcionarios"),
  ramo: varchar("ramo"),
  segmento: varchar("segmento"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().notNull().default("gen_random_uuid()"),
  status: text("status", { 
    enum: ["NOVO", "CONTATADO", "INTERESSE", "PROPOSTA_ENVIADA", "NEGOCIACAO", "FECHADO_GANHO", "FECHADO_PERDIDO"] 
  }).default("NOVO"),
  source: text("source", { 
    enum: ["BUSCA_CNPJ", "INDICACAO", "INBOUND", "EVENTO", "CAMPANHA", "OUTROS"] 
  }).default("BUSCA_CNPJ"),
  priority: text("priority", { enum: ["BAIXA", "MEDIA", "ALTA", "URGENTE"] }).default("MEDIA"),
  estimatedValue: decimal("estimated_value", { precision: 15, scale: 2 }),
  closingDate: timestamp("closing_date"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  companyId: varchar("company_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const interactions = pgTable("interactions", {
  id: varchar("id").primaryKey().notNull().default("gen_random_uuid()"),
  type: text("type", { enum: ["WHATSAPP", "EMAIL", "LIGACAO", "REUNIAO", "PROPOSTA", "CONTRATO", "OUTROS"] }).notNull(),
  status: text("status", { enum: ["ENVIADO", "ENTREGUE", "VISUALIZADO", "RESPONDIDO", "FALHADO"] }).default("ENVIADO"),
  subject: varchar("subject"),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  viewedAt: timestamp("viewed_at"),
  respondedAt: timestamp("responded_at"),
  leadId: varchar("lead_id").notNull(),
  userId: varchar("user_id").notNull(),
  campaignId: varchar("campaign_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().notNull().default("gen_random_uuid()"),
  name: varchar("name").notNull(),
  type: text("type", { enum: ["WHATSAPP", "EMAIL", "SMS", "HIBRIDA"] }).notNull(),
  status: text("status", { 
    enum: ["RASCUNHO", "AGENDADA", "EXECUTANDO", "PAUSADA", "FINALIZADA", "CANCELADA"] 
  }).default("RASCUNHO"),
  subject: varchar("subject"),
  template: text("template").notNull(),
  segmentation: jsonb("segmentation"),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  totalSent: integer("total_sent").default(0),
  totalDelivered: integer("total_delivered").default(0),
  totalViewed: integer("total_viewed").default(0),
  totalResponded: integer("total_responded").default(0),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().notNull().default("gen_random_uuid()"),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  closingDate: timestamp("closing_date").notNull(),
  status: text("status", { 
    enum: ["PENDENTE_APROVACAO", "APROVADA", "REJEITADA", "EM_ANALISE"] 
  }).default("PENDENTE_APROVACAO"),
  proofUrl: varchar("proof_url"),
  proofType: varchar("proof_type"),
  productService: varchar("product_service"),
  description: text("description"),
  points: integer("points").default(0),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  leadId: varchar("lead_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rankings = pgTable("rankings", {
  id: varchar("id").primaryKey().notNull().default("gen_random_uuid()"),
  period: varchar("period").notNull(), // "2024-01", "2024-Q1", "2024"
  periodType: varchar("period_type").notNull(), // "monthly", "quarterly", "yearly"
  totalPoints: integer("total_points").notNull(),
  totalSales: integer("total_sales").notNull(),
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).notNull(),
  position: integer("position").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().notNull().default("gen_random_uuid()"),
  title: varchar("title").notNull(),
  description: text("description"),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).default("0"),
  unit: varchar("unit").notNull(), // "leads", "sales", "revenue"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().notNull().default("gen_random_uuid()"),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  icon: varchar("icon"),
  points: integer("points").default(0),
  userId: varchar("user_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().notNull().default("gen_random_uuid()"),
  type: text("type", { 
    enum: ["LEAD_NOVO", "LEAD_INTERESSE", "VENDA_APROVADA", "RANKING_ATUALIZADO", "META_ATINGIDA", "CAMPANHA_FINALIZADA"] 
  }).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  metadata: jsonb("metadata"),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mass Messaging Module Tables

// Campanhas de Disparo em Massa
export const massCampaigns = pgTable("mass_campaigns", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  channel: text("channel", { enum: ["WHATSAPP", "EMAIL", "SMS"] }).default("WHATSAPP"),
  messageTemplate: text("message_template"),
  status: text("status", { 
    enum: ["DRAFT", "VALIDATING", "SCHEDULED", "RUNNING", "PAUSED", "COMPLETED", "STOPPED"] 
  }).default("DRAFT"),
  totalRecords: integer("total_records").default(0),
  sentCount: integer("sent_count").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  sendRate: integer("send_rate").default(50), // msgs per hour
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  workingHours: jsonb("working_hours"),
  validationCost: decimal("validation_cost", { precision: 10, scale: 4 }).default("0"),
  sendingCost: decimal("sending_cost", { precision: 10, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lista de Contatos da Campanha
export const campaignContacts = pgTable("campaign_contacts", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => massCampaigns.id, { onDelete: "cascade" }),
  cnpj: varchar("cnpj"),
  razaoSocial: varchar("razao_social"),
  nomeFantasia: varchar("nome_fantasia"),
  phone: varchar("phone"),
  setor: varchar("setor"),
  cidade: varchar("cidade"),
  customData: jsonb("custom_data"),
  
  // Status de Validação WhatsApp
  phoneValidationStatus: text("phone_validation_status", { 
    enum: ["VALID_WHATSAPP", "VALID_NO_WHATSAPP", "INVALID", "BLACKLISTED", "ERROR"] 
  }),
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  blacklistCategory: text("blacklist_category", { 
    enum: ["CONTABILIDADE", "PUBLICO", "SAUDE", "CALLCENTER", "EDUCACAO", "FINANCEIRO", "RELIGIOSO", "OPTOUT"] 
  }),
  blacklistReason: text("blacklist_reason"),
  validationTimestamp: timestamp("validation_timestamp"),
  validationCost: decimal("validation_cost", { precision: 10, scale: 4 }),
  
  // Status de Envio
  sendStatus: text("send_status", { 
    enum: ["PENDING", "SENT", "DELIVERED", "READ", "REPLIED", "FAILED"] 
  }).default("PENDING"),
  sendTimestamp: timestamp("send_timestamp"),
  deliveryTimestamp: timestamp("delivery_timestamp"),
  readTimestamp: timestamp("read_timestamp"),
  replyTimestamp: timestamp("reply_timestamp"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Sistema de Blacklist
export const phoneBlacklist = pgTable("phone_blacklist", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  phone: varchar("phone").unique().notNull(),
  category: text("category", { 
    enum: ["CONTABILIDADE", "PUBLICO", "SAUDE", "CALLCENTER", "EDUCACAO", "FINANCEIRO", "RELIGIOSO", "OPTOUT"] 
  }).notNull(),
  reason: text("reason"),
  cnpj: varchar("cnpj"),
  companyName: varchar("company_name"),
  addedBy: varchar("added_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  autoDetected: boolean("auto_detected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Validação de Listas
export const listValidations = pgTable("list_validations", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => massCampaigns.id, { onDelete: "cascade" }),
  filename: varchar("filename").notNull(),
  totalRecords: integer("total_records").default(0),
  validRecords: integer("valid_records").default(0),
  invalidRecords: integer("invalid_records").default(0),
  blacklistedRecords: integer("blacklisted_records").default(0),
  errorRecords: integer("error_records").default(0),
  validationReport: jsonb("validation_report"),
  status: text("status", { enum: ["PROCESSING", "COMPLETED", "FAILED"] }).default("PROCESSING"),
  processingTime: integer("processing_time"), // seconds
  totalCost: decimal("total_cost", { precision: 10, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Logs de Execução
export const campaignLogs = pgTable("campaign_logs", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => massCampaigns.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").references(() => campaignContacts.id, { onDelete: "cascade" }),
  eventType: text("event_type", { 
    enum: ["SENT", "DELIVERED", "READ", "REPLIED", "FAILED", "PAUSED", "STOPPED", "RESUMED"] 
  }).notNull(),
  message: text("message"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Histórico de Validações de Números WhatsApp (cada validação = 1 registro)
export const phoneValidations = pgTable("phone_validations", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  phone: varchar("phone").notNull(), // Removed unique constraint - track each validation event
  validationStatus: text("validation_status", { 
    enum: ["VALID_WHATSAPP", "VALID_NO_WHATSAPP", "INVALID", "BLACKLISTED", "ERROR"] 
  }).notNull(),
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  
  // Metadados da validação
  validationProvider: varchar("validation_provider"), // 'whatsapp_api', 'maytapi', 'format_only'
  validationCost: decimal("validation_cost", { precision: 10, scale: 4 }).default("0"),
  responseData: jsonb("response_data"), // Dados brutos da resposta da API
  errorMessage: text("error_message"),
  
  // Rastreamento de validação individual
  validatedBy: varchar("validated_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  fromCache: boolean("from_cache").default(false), // Se foi resultado do cache ou API call
  campaignId: varchar("campaign_id"), // Opcional: link to campaign if bulk validation
  batchId: varchar("batch_id"), // Opcional: group bulk validations
  createdAt: timestamp("created_at").defaultNow(),
});

// Cache separado para resultados recentes (otimização de performance)
export const phoneValidationCache = pgTable("phone_validation_cache", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  phone: varchar("phone").unique().notNull(),
  validationStatus: text("validation_status", { 
    enum: ["VALID_WHATSAPP", "VALID_NO_WHATSAPP", "INVALID", "BLACKLISTED", "ERROR"] 
  }).notNull(),
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  validationProvider: varchar("validation_provider"),
  responseData: jsonb("response_data"),
  expiresAt: timestamp("expires_at"), // Cache expiration
  lastValidatedAt: timestamp("last_validated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  manager: one(users, { fields: [users.managerId], references: [users.id] }),
  subordinates: many(users),
  leads: many(leads),
  interactions: many(interactions),
  sales: many(sales),
  campaigns: many(campaigns),
  massCampaigns: many(massCampaigns),
  phoneBlacklist: many(phoneBlacklist),
  phoneValidations: many(phoneValidations),
  rankings: many(rankings),
  goals: many(goals),
  achievements: many(achievements),
  notifications: many(notifications),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  users: many(users),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  leads: many(leads),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  company: one(companies, { fields: [leads.companyId], references: [companies.id] }),
  user: one(users, { fields: [leads.userId], references: [users.id] }),
  interactions: many(interactions),
  sales: many(sales),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  lead: one(leads, { fields: [interactions.leadId], references: [leads.id] }),
  user: one(users, { fields: [interactions.userId], references: [users.id] }),
  campaign: one(campaigns, { fields: [interactions.campaignId], references: [campaigns.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, { fields: [campaigns.userId], references: [users.id] }),
  interactions: many(interactions),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  lead: one(leads, { fields: [sales.leadId], references: [leads.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id] }),
}));

export const rankingsRelations = relations(rankings, ({ one }) => ({
  user: one(users, { fields: [rankings.userId], references: [users.id] }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, { fields: [achievements.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// Mass Messaging Module Relations
export const massCampaignsRelations = relations(massCampaigns, ({ one, many }) => ({
  user: one(users, { fields: [massCampaigns.userId], references: [users.id] }),
  contacts: many(campaignContacts),
  validations: many(listValidations),
  logs: many(campaignLogs),
}));

export const campaignContactsRelations = relations(campaignContacts, ({ one }) => ({
  campaign: one(massCampaigns, { fields: [campaignContacts.campaignId], references: [massCampaigns.id] }),
}));

export const phoneBlacklistRelations = relations(phoneBlacklist, ({ one }) => ({
  addedByUser: one(users, { fields: [phoneBlacklist.addedBy], references: [users.id] }),
}));

export const listValidationsRelations = relations(listValidations, ({ one }) => ({
  campaign: one(massCampaigns, { fields: [listValidations.campaignId], references: [massCampaigns.id] }),
}));

export const campaignLogsRelations = relations(campaignLogs, ({ one }) => ({
  campaign: one(massCampaigns, { fields: [campaignLogs.campaignId], references: [massCampaigns.id] }),
  contact: one(campaignContacts, { fields: [campaignLogs.contactId], references: [campaignContacts.id] }),
}));

export const phoneValidationsRelations = relations(phoneValidations, ({ one }) => ({
  validatedByUser: one(users, { fields: [phoneValidations.validatedBy], references: [users.id] }),
}));

export const phoneValidationCacheRelations = relations(phoneValidationCache, ({ one }) => ({
  // No direct user relation for cache table
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Mass Messaging Module Schemas
export const insertMassCampaignSchema = createInsertSchema(massCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignContactSchema = createInsertSchema(campaignContacts).omit({
  id: true,
  createdAt: true,
});

export const insertPhoneBlacklistSchema = createInsertSchema(phoneBlacklist).omit({
  id: true,
  createdAt: true,
});

export const insertListValidationSchema = createInsertSchema(listValidations).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignLogSchema = createInsertSchema(campaignLogs).omit({
  id: true,
  timestamp: true,
});

export const insertPhoneValidationSchema = createInsertSchema(phoneValidations).omit({
  id: true,
  createdAt: true,
});

export const insertPhoneValidationCacheSchema = createInsertSchema(phoneValidationCache).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type Ranking = typeof rankings.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;

// Mass Messaging Module Types
export type MassCampaign = typeof massCampaigns.$inferSelect;
export type CampaignContact = typeof campaignContacts.$inferSelect;
export type PhoneBlacklist = typeof phoneBlacklist.$inferSelect;
export type ListValidation = typeof listValidations.$inferSelect;
export type CampaignLog = typeof campaignLogs.$inferSelect;
export type PhoneValidation = typeof phoneValidations.$inferSelect;
export type PhoneValidationCache = typeof phoneValidationCache.$inferSelect;

export type InsertMassCampaign = z.infer<typeof insertMassCampaignSchema>;
export type InsertCampaignContact = z.infer<typeof insertCampaignContactSchema>;
export type InsertPhoneBlacklist = z.infer<typeof insertPhoneBlacklistSchema>;
export type InsertListValidation = z.infer<typeof insertListValidationSchema>;
export type InsertCampaignLog = z.infer<typeof insertCampaignLogSchema>;
export type InsertPhoneValidation = z.infer<typeof insertPhoneValidationSchema>;
export type InsertPhoneValidationCache = z.infer<typeof insertPhoneValidationCacheSchema>;
