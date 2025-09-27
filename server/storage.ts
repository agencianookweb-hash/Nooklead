import {
  users,
  companies,
  leads,
  sales,
  campaigns,
  interactions,
  rankings,
  goals,
  achievements,
  notifications,
  teams,
  massCampaigns,
  campaignContacts,
  phoneBlacklist,
  phoneValidations,
  phoneValidationCache,
  listValidations,
  campaignLogs,
  type User,
  type UpsertUser,
  type Company,
  type Lead,
  type Sale,
  type Campaign,
  type Interaction,
  type MassCampaign,
  type CampaignContact,
  type PhoneBlacklist,
  type PhoneValidation,
  type PhoneValidationCache,
  type ListValidation,
  type CampaignLog,
  type InsertCompany,
  type InsertLead,
  type InsertSale,
  type InsertCampaign,
  type InsertInteraction,
  type InsertMassCampaign,
  type InsertCampaignContact,
  type InsertPhoneBlacklist,
  type InsertPhoneValidation,
  type InsertPhoneValidationCache,
  type InsertListValidation,
  type InsertCampaignLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, count, sql, sum } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  searchCompanies(filters: {
    setor?: string;
    size?: string;
    uf?: string;
    faturamento?: string;
    search?: string;
  }): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Lead operations
  getLeads(userId?: string): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead>;
  getLeadById(id: string): Promise<Lead | undefined>;
  
  // Sales operations
  getSales(userId?: string): Promise<Sale[]>;
  getPendingSales(): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(id: string, updates: Partial<Sale>): Promise<Sale>;
  
  // Campaign operations
  getCampaigns(userId?: string): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  
  // Interaction operations
  getInteractions(leadId: string): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  
  // Gamification operations
  getUserRankings(period?: string): Promise<any[]>;
  updateUserPoints(userId: string, points: number): Promise<void>;
  
  // Dashboard operations
  getDashboardStats(userId: string): Promise<any>;
  getTeamStats(managerId: string): Promise<any>;
  
  // Team management operations
  getTeamMembers(managerId?: string): Promise<User[]>;
  createTeamMember(userData: { email: string; firstName: string; lastName: string; phone?: string; managerId: string; teamId?: string; monthlyGoal: number }): Promise<User>;
  updateTeamMember(userId: string, updates: Partial<User>): Promise<User>;
  deactivateTeamMember(userId: string): Promise<void>;
  
  // Onboarding operations
  createCompanyOnboarding(data: {
    companyName: string;
    cnpj: string;
    businessSector: string;
    companySize: string;
    managerName: string;
    managerCpf: string;
    managerEmail: string;
    managerPhone: string;
    cep: string;
    address: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    salesGoal: number;
    teamSize: number;
    description?: string;
  }): Promise<{ company: Company; user: User }>;

  // Mass Campaign operations
  getMassCampaigns(userId?: string): Promise<MassCampaign[]>;
  getMassCampaignById(id: string): Promise<MassCampaign | undefined>;
  createMassCampaign(campaign: InsertMassCampaign): Promise<MassCampaign>;
  updateMassCampaign(id: string, updates: Partial<MassCampaign>): Promise<MassCampaign>;
  deleteMassCampaign(id: string): Promise<void>;

  // Campaign Contacts operations
  getCampaignContacts(campaignId: string): Promise<CampaignContact[]>;
  createCampaignContact(contact: InsertCampaignContact): Promise<CampaignContact>;
  createCampaignContactsBulk(contacts: InsertCampaignContact[]): Promise<CampaignContact[]>;
  updateCampaignContact(id: string, updates: Partial<CampaignContact>): Promise<CampaignContact>;
  getCampaignContactsByValidationStatus(campaignId: string, status: string): Promise<CampaignContact[]>;

  // Phone Blacklist operations
  getBlacklistedPhones(): Promise<PhoneBlacklist[]>;
  isPhoneBlacklisted(phone: string): Promise<boolean>;
  arePhonesBulkBlacklisted(phones: string[]): Promise<Set<string>>;
  addToBlacklist(blacklistEntry: InsertPhoneBlacklist): Promise<PhoneBlacklist>;
  removeFromBlacklist(id: string): Promise<void>;
  getBlacklistByCategory(category: string): Promise<PhoneBlacklist[]>;

  // Phone Validation operations - tracks each validation event for quota/cost tracking  
  recordValidationEvent(validation: InsertPhoneValidation): Promise<PhoneValidation>;
  bulkRecordValidationEvents(validations: InsertPhoneValidation[]): Promise<void>;
  getValidationsByDateRange(startDate: Date, endDate: Date): Promise<PhoneValidation[]>;
  getValidationCostsByUser(userId: string, startDate: Date, endDate: Date): Promise<{ totalCost: number; totalValidations: number }>;
  
  // Phone Validation Cache operations - stores latest result per phone for performance
  getCachedValidation(phone: string): Promise<PhoneValidationCache | null>;
  saveCachedValidation(validation: InsertPhoneValidationCache): Promise<PhoneValidationCache>;
  clearExpiredCache(): Promise<number>;
  clearExpiredValidations(): Promise<number>;

  // List Validation operations
  getListValidations(campaignId: string): Promise<ListValidation[]>;
  createListValidation(validation: InsertListValidation): Promise<ListValidation>;
  updateListValidation(id: string, updates: Partial<ListValidation>): Promise<ListValidation>;

  // Campaign Logs operations
  getCampaignLogs(campaignId: string): Promise<CampaignLog[]>;
  createCampaignLog(log: InsertCampaignLog): Promise<CampaignLog>;
  getCampaignLogsByContact(contactId: string): Promise<CampaignLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Company operations
  async searchCompanies(filters: {
    setor?: string;
    size?: string;
    uf?: string;
    faturamento?: string;
    search?: string;
  }): Promise<Company[]> {
    let query = db.select().from(companies);
    
    const conditions = [];
    
    if (filters.setor && filters.setor !== "Todos os setores") {
      conditions.push(eq(companies.setor, filters.setor));
    }
    
    if (filters.size && filters.size !== "Todos os portes") {
      conditions.push(eq(companies.size, filters.size));
    }
    
    if (filters.uf && filters.uf !== "Todos os estados") {
      conditions.push(eq(companies.uf, filters.uf));
    }
    
    if (filters.search) {
      conditions.push(ilike(companies.razaoSocial, `%${filters.search}%`));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.limit(50);
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  // Lead operations
  async getLeads(userId?: string): Promise<Lead[]> {
    if (userId) {
      return await db.select().from(leads)
        .where(eq(leads.userId, userId))
        .orderBy(desc(leads.createdAt));
    }
    
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.status, status));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const [updatedLead] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updatedLead;
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  // Sales operations
  async getSales(userId?: string): Promise<Sale[]> {
    if (userId) {
      return await db.select().from(sales)
        .where(eq(sales.userId, userId))
        .orderBy(desc(sales.createdAt));
    }
    
    return await db.select().from(sales).orderBy(desc(sales.createdAt));
  }

  async getPendingSales(): Promise<Sale[]> {
    return await db
      .select()
      .from(sales)
      .where(eq(sales.status, "PENDENTE_APROVACAO"))
      .orderBy(desc(sales.createdAt));
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db.insert(sales).values(sale).returning();
    return newSale;
  }

  async updateSale(id: string, updates: Partial<Sale>): Promise<Sale> {
    const [updatedSale] = await db
      .update(sales)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning();
    return updatedSale;
  }

  // Campaign operations
  async getCampaigns(userId?: string): Promise<Campaign[]> {
    if (userId) {
      return await db.select().from(campaigns)
        .where(eq(campaigns.userId, userId))
        .orderBy(desc(campaigns.createdAt));
    }
    
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  // Interaction operations
  async getInteractions(leadId: string): Promise<Interaction[]> {
    return await db
      .select()
      .from(interactions)
      .where(eq(interactions.leadId, leadId))
      .orderBy(desc(interactions.createdAt));
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const [newInteraction] = await db.insert(interactions).values(interaction).returning();
    return newInteraction;
  }

  // Gamification operations
  async getUserRankings(period = "2024-01"): Promise<any[]> {
    return await db
      .select({
        user: users,
        ranking: rankings,
      })
      .from(rankings)
      .leftJoin(users, eq(rankings.userId, users.id))
      .where(eq(rankings.period, period))
      .orderBy(rankings.position);
  }

  async updateUserPoints(userId: string, points: number): Promise<void> {
    await db
      .update(users)
      .set({
        totalPoints: sql`${users.totalPoints} + ${points}`,
        monthlyPoints: sql`${users.monthlyPoints} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Dashboard operations
  async getDashboardStats(userId: string): Promise<any> {
    const leadsCount = await db
      .select({ count: count() })
      .from(leads)
      .where(eq(leads.userId, userId));

    const salesCount = await db
      .select({ count: count() })
      .from(sales)
      .where(and(eq(sales.userId, userId), eq(sales.status, "APROVADA")));

    const revenue = await db
      .select({ total: sum(sales.value) })
      .from(sales)
      .where(and(eq(sales.userId, userId), eq(sales.status, "APROVADA")));

    return {
      leadsGenerated: leadsCount[0]?.count || 0,
      salesClosed: salesCount[0]?.count || 0,
      totalRevenue: revenue[0]?.total || 0,
      conversionRate: leadsCount[0]?.count > 0 ? (salesCount[0]?.count / leadsCount[0]?.count) * 100 : 0,
    };
  }

  async getTeamStats(managerId: string): Promise<any> {
    const teamMembers = await db
      .select()
      .from(users)
      .where(eq(users.managerId, managerId));

    const teamIds = teamMembers.map(member => member.id);

    if (teamIds.length === 0) {
      return {
        activeMembers: 0,
        totalRevenue: 0,
        goalAttainment: 0,
      };
    }

    const revenue = await db
      .select({ total: sum(sales.value) })
      .from(sales)
      .where(and(
        sql`${sales.userId} = ANY(${teamIds})`,
        eq(sales.status, "APROVADA")
      ));

    return {
      activeMembers: teamMembers.length,
      totalRevenue: revenue[0]?.total || 0,
      goalAttainment: 87, // Calculate based on actual goals
    };
  }

  // Team management operations
  async getTeamMembers(managerId?: string): Promise<User[]> {
    if (managerId) {
      return await db
        .select()
        .from(users)
        .where(and(
          eq(users.managerId, managerId),
          eq(users.isActive, true)
        ));
    }
    
    return await db
      .select()
      .from(users)
      .where(eq(users.isActive, true));
  }

  async createTeamMember(userData: { 
    email: string; 
    firstName: string; 
    lastName: string; 
    phone?: string; 
    managerId: string; 
    teamId?: string; 
    monthlyGoal: number;
  }): Promise<User> {
    // Generate a unique ID for the new user
    const userId = Math.random().toString(36).substr(2, 9);
    
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: "VENDEDOR",
        managerId: userData.managerId,
        teamId: userData.teamId,
        monthlyGoal: userData.monthlyGoal,
        isActive: true,
        totalPoints: 0,
        monthlyPoints: 0,
      })
      .returning();
    
    return user;
  }

  async updateTeamMember(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async deactivateTeamMember(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Onboarding operations
  async createCompanyOnboarding(data: {
    companyName: string;
    cnpj: string;
    businessSector: string;
    companySize: string;
    managerName: string;
    managerCpf: string;
    managerEmail: string;
    managerPhone: string;
    cep: string;
    address: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    salesGoal: number;
    teamSize: number;
    description?: string;
  }): Promise<{ company: Company; user: User }> {
    // Generate unique IDs
    const companyId = Math.random().toString(36).substr(2, 9);
    const managerId = Math.random().toString(36).substr(2, 9);

    // Clean CNPJ and CPF (remove formatting)
    const cleanCnpj = data.cnpj.replace(/\D/g, '');
    const cleanCpf = data.managerCpf.replace(/\D/g, '');

    // Create company
    const [company] = await db
      .insert(companies)
      .values({
        id: companyId,
        cnpj: cleanCnpj,
        razaoSocial: data.companyName,
        nomeFantasia: data.companyName,
        setor: data.businessSector,
        size: data.companySize as "MEI" | "ME" | "EPP" | "GRANDE",
        cep: data.cep.replace(/\D/g, ''),
        logradouro: data.address,
        numero: data.number,
        complemento: data.complement,
        bairro: data.neighborhood,
        cidade: data.city,
        uf: data.state,
      })
      .returning();

    // Split manager name
    const nameParts = data.managerName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create manager user
    const [user] = await db
      .insert(users)
      .values({
        id: managerId,
        email: data.managerEmail,
        firstName,
        lastName,
        phone: data.managerPhone,
        role: "GESTOR",
        isActive: true,
        totalPoints: 0,
        monthlyPoints: 0,
        monthlyGoal: data.salesGoal,
      })
      .returning();

    return { company, user };
  }

  // Mass Campaign operations
  async getMassCampaigns(userId?: string): Promise<MassCampaign[]> {
    if (userId) {
      return await db.select().from(massCampaigns)
        .where(eq(massCampaigns.userId, userId))
        .orderBy(desc(massCampaigns.createdAt));
    }
    
    return await db.select().from(massCampaigns).orderBy(desc(massCampaigns.createdAt));
  }

  async getMassCampaignById(id: string): Promise<MassCampaign | undefined> {
    const [campaign] = await db.select().from(massCampaigns).where(eq(massCampaigns.id, id));
    return campaign;
  }

  async createMassCampaign(campaign: InsertMassCampaign): Promise<MassCampaign> {
    const [newCampaign] = await db.insert(massCampaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateMassCampaign(id: string, updates: Partial<MassCampaign>): Promise<MassCampaign> {
    const [updatedCampaign] = await db
      .update(massCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(massCampaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  async deleteMassCampaign(id: string): Promise<void> {
    await db.delete(massCampaigns).where(eq(massCampaigns.id, id));
  }

  // Campaign Contacts operations
  async getCampaignContacts(campaignId: string): Promise<CampaignContact[]> {
    return await db
      .select()
      .from(campaignContacts)
      .where(eq(campaignContacts.campaignId, campaignId))
      .orderBy(desc(campaignContacts.createdAt));
  }

  async createCampaignContact(contact: InsertCampaignContact): Promise<CampaignContact> {
    const [newContact] = await db.insert(campaignContacts).values(contact).returning();
    return newContact;
  }

  async createCampaignContactsBulk(contacts: InsertCampaignContact[]): Promise<CampaignContact[]> {
    const batchSize = 500; // Process in batches to avoid PostgreSQL parameter limits
    const results: CampaignContact[] = [];
    
    // Process contacts in batches within a transaction
    await db.transaction(async (tx) => {
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        const batchResults = await tx.insert(campaignContacts).values(batch).returning();
        results.push(...batchResults);
      }
    });
    
    return results;
  }

  async updateCampaignContact(id: string, updates: Partial<CampaignContact>): Promise<CampaignContact> {
    const [updatedContact] = await db
      .update(campaignContacts)
      .set(updates)
      .where(eq(campaignContacts.id, id))
      .returning();
    return updatedContact;
  }

  async getCampaignContactsByValidationStatus(campaignId: string, status: string): Promise<CampaignContact[]> {
    return await db
      .select()
      .from(campaignContacts)
      .where(and(
        eq(campaignContacts.campaignId, campaignId),
        eq(campaignContacts.phoneValidationStatus, status)
      ));
  }

  // Phone Blacklist operations
  async getBlacklistedPhones(): Promise<PhoneBlacklist[]> {
    return await db.select().from(phoneBlacklist).orderBy(desc(phoneBlacklist.createdAt));
  }

  async isPhoneBlacklisted(phone: string): Promise<boolean> {
    const [result] = await db
      .select({ count: count() })
      .from(phoneBlacklist)
      .where(eq(phoneBlacklist.phone, phone));
    return (result?.count || 0) > 0;
  }

  async arePhonesBulkBlacklisted(phones: string[]): Promise<Set<string>> {
    if (phones.length === 0) return new Set();
    
    const blacklistedPhones = await db
      .select({ phone: phoneBlacklist.phone })
      .from(phoneBlacklist)
      .where(sql`${phoneBlacklist.phone} = ANY(${phones})`);
    
    return new Set(blacklistedPhones.map(row => row.phone));
  }

  async addToBlacklist(blacklistEntry: InsertPhoneBlacklist): Promise<PhoneBlacklist> {
    const [newEntry] = await db.insert(phoneBlacklist).values(blacklistEntry).returning();
    return newEntry;
  }

  async removeFromBlacklist(id: string): Promise<void> {
    await db.delete(phoneBlacklist).where(eq(phoneBlacklist.id, id));
  }

  async getBlacklistByCategory(category: string): Promise<PhoneBlacklist[]> {
    return await db
      .select()
      .from(phoneBlacklist)
      .where(eq(phoneBlacklist.category, category))
      .orderBy(desc(phoneBlacklist.createdAt));
  }

  // Phone Validation Event Tracking - records each validation for quota/cost counting
  async recordValidationEvent(validation: InsertPhoneValidation): Promise<PhoneValidation> {
    const [newValidation] = await db
      .insert(phoneValidations)
      .values(validation) // Always insert new record - no conflict handling
      .returning();
    return newValidation;
  }

  async bulkRecordValidationEvents(validations: InsertPhoneValidation[]): Promise<void> {
    if (validations.length === 0) return;
    
    // Process in batches to avoid parameter limits - each validation is a separate event
    const batchSize = 500;
    for (let i = 0; i < validations.length; i += batchSize) {
      const batch = validations.slice(i, i + batchSize);
      await db.insert(phoneValidations).values(batch); // Insert all events
    }
  }

  async getValidationsByDateRange(startDate: Date, endDate: Date): Promise<PhoneValidation[]> {
    return await db
      .select()
      .from(phoneValidations)
      .where(
        and(
          sql`${phoneValidations.createdAt} >= ${startDate}`,
          sql`${phoneValidations.createdAt} <= ${endDate}`
        )
      )
      .orderBy(desc(phoneValidations.createdAt));
  }

  async getValidationCostsByUser(userId: string, startDate: Date, endDate: Date): Promise<{ totalCost: number; totalValidations: number }> {
    const [result] = await db
      .select({
        totalCost: sum(phoneValidations.validationCost),
        totalValidations: count(phoneValidations.id), // Count ALL events, not unique phones
      })
      .from(phoneValidations)
      .where(
        and(
          eq(phoneValidations.validatedBy, userId),
          sql`${phoneValidations.createdAt} >= ${startDate}`,
          sql`${phoneValidations.createdAt} <= ${endDate}`
        )
      );
    
    return {
      totalCost: parseFloat(result?.totalCost || "0"),
      totalValidations: result?.totalValidations || 0,
    };
  }

  // Phone Validation Cache - for performance optimization
  async getCachedValidation(phone: string): Promise<PhoneValidationCache | null> {
    const [cached] = await db
      .select()
      .from(phoneValidationCache)
      .where(eq(phoneValidationCache.phone, phone))
      .limit(1);
    
    // Check if cache is expired
    if (cached && cached.expiresAt && new Date() > cached.expiresAt) {
      // Delete expired cache entry
      await db.delete(phoneValidationCache).where(eq(phoneValidationCache.phone, phone));
      return null;
    }
    
    return cached || null;
  }

  async saveCachedValidation(validation: InsertPhoneValidationCache): Promise<PhoneValidationCache> {
    const [cached] = await db
      .insert(phoneValidationCache)
      .values({
        ...validation,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: phoneValidationCache.phone,
        set: {
          ...validation,
          updatedAt: new Date(),
        }
      })
      .returning();
    return cached;
  }

  async clearExpiredCache(): Promise<number> {
    const result = await db
      .delete(phoneValidationCache)
      .where(sql`${phoneValidationCache.expiresAt} < NOW()`)
      .returning({ id: phoneValidationCache.id });
    
    return result.length;
  }

  async clearExpiredValidations(): Promise<number> {
    // Clear expired cache entries (alias for clearExpiredCache for backward compatibility)
    return await this.clearExpiredCache();
  }

  // List Validation operations
  async getListValidations(campaignId: string): Promise<ListValidation[]> {
    return await db
      .select()
      .from(listValidations)
      .where(eq(listValidations.campaignId, campaignId))
      .orderBy(desc(listValidations.createdAt));
  }

  async createListValidation(validation: InsertListValidation): Promise<ListValidation> {
    const [newValidation] = await db.insert(listValidations).values(validation).returning();
    return newValidation;
  }

  async updateListValidation(id: string, updates: Partial<ListValidation>): Promise<ListValidation> {
    const [updatedValidation] = await db
      .update(listValidations)
      .set(updates)
      .where(eq(listValidations.id, id))
      .returning();
    return updatedValidation;
  }

  // Campaign Logs operations
  async getCampaignLogs(campaignId: string): Promise<CampaignLog[]> {
    return await db
      .select()
      .from(campaignLogs)
      .where(eq(campaignLogs.campaignId, campaignId))
      .orderBy(desc(campaignLogs.timestamp));
  }

  async createCampaignLog(log: InsertCampaignLog): Promise<CampaignLog> {
    const [newLog] = await db.insert(campaignLogs).values(log).returning();
    return newLog;
  }

  async getCampaignLogsByContact(contactId: string): Promise<CampaignLog[]> {
    return await db
      .select()
      .from(campaignLogs)
      .where(eq(campaignLogs.contactId, contactId))
      .orderBy(desc(campaignLogs.timestamp));
  }
}

export const storage = new DatabaseStorage();
