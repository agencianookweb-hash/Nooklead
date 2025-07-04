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

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  manager: one(users, { fields: [users.managerId], references: [users.id] }),
  subordinates: many(users),
  leads: many(leads),
  interactions: many(interactions),
  sales: many(sales),
  campaigns: many(campaigns),
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
