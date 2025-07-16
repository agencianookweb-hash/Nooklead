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
  type User,
  type UpsertUser,
  type Company,
  type Lead,
  type Sale,
  type Campaign,
  type Interaction,
  type InsertCompany,
  type InsertLead,
  type InsertSale,
  type InsertCampaign,
  type InsertInteraction,
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
    let query = db.select().from(leads).orderBy(desc(leads.createdAt));
    
    if (userId) {
      query = query.where(eq(leads.userId, userId));
    }
    
    return await query;
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
    let query = db.select().from(sales).orderBy(desc(sales.createdAt));
    
    if (userId) {
      query = query.where(eq(sales.userId, userId));
    }
    
    return await query;
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
    let query = db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
    
    if (userId) {
      query = query.where(eq(campaigns.userId, userId));
    }
    
    return await query;
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
}

export const storage = new DatabaseStorage();
