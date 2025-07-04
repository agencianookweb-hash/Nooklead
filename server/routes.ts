import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLeadSchema, insertSaleSchema, insertCompanySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company routes
  app.get('/api/companies/search', isAuthenticated, async (req, res) => {
    try {
      const { setor, size, uf, faturamento, search } = req.query;
      const companies = await storage.searchCompanies({
        setor: setor as string,
        size: size as string,
        uf: uf as string,
        faturamento: faturamento as string,
        search: search as string,
      });
      res.json(companies);
    } catch (error) {
      console.error("Error searching companies:", error);
      res.status(500).json({ message: "Failed to search companies" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validatedData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // Lead routes
  app.get('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role || 'VENDEDOR';
      
      // Gestores and admins can see all leads, vendedores only their own
      const leads = userRole === 'VENDEDOR' 
        ? await storage.getLeads(userId)
        : await storage.getLeads();
        
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.post('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertLeadSchema.parse({
        ...req.body,
        userId,
      });
      const lead = await storage.createLead(validatedData);
      
      // Award points for lead generation
      await storage.updateUserPoints(userId, 1);
      
      res.json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.put('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user owns the lead or is a manager
      const existingLead = await storage.getLeadById(id);
      if (!existingLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      const userRole = req.user.claims.role || 'VENDEDOR';
      if (userRole === 'VENDEDOR' && existingLead.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this lead" });
      }
      
      const lead = await storage.updateLead(id, req.body);
      
      // Award points for status changes
      const pointsMap: Record<string, number> = {
        CONTATADO: 2,
        INTERESSE: 5,
        PROPOSTA_ENVIADA: 10,
      };
      
      if (req.body.status && pointsMap[req.body.status]) {
        await storage.updateUserPoints(existingLead.userId, pointsMap[req.body.status]);
      }
      
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // Sales routes
  app.get('/api/sales', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role || 'VENDEDOR';
      
      const sales = userRole === 'VENDEDOR' 
        ? await storage.getSales(userId)
        : await storage.getSales();
        
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.get('/api/sales/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user.claims.role || 'VENDEDOR';
      if (userRole === 'VENDEDOR') {
        return res.status(403).json({ message: "Not authorized to view pending sales" });
      }
      
      const sales = await storage.getPendingSales();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching pending sales:", error);
      res.status(500).json({ message: "Failed to fetch pending sales" });
    }
  });

  app.post('/api/sales', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertSaleSchema.parse({
        ...req.body,
        userId,
      });
      const sale = await storage.createSale(validatedData);
      res.json(sale);
    } catch (error) {
      console.error("Error creating sale:", error);
      res.status(500).json({ message: "Failed to create sale" });
    }
  });

  app.put('/api/sales/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role || 'VENDEDOR';
      
      if (userRole === 'VENDEDOR') {
        return res.status(403).json({ message: "Not authorized to approve sales" });
      }
      
      const sale = await storage.updateSale(id, {
        status: "APROVADA",
        approvedBy: userId,
        approvedAt: new Date(),
      });
      
      // Award points for approved sale
      const pointsValue = Math.floor(Number(sale.value) * 0.001) + 50; // Base 50 + 0.1% of value
      await storage.updateUserPoints(sale.userId, pointsValue);
      
      res.json(sale);
    } catch (error) {
      console.error("Error approving sale:", error);
      res.status(500).json({ message: "Failed to approve sale" });
    }
  });

  app.put('/api/sales/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role || 'VENDEDOR';
      
      if (userRole === 'VENDEDOR') {
        return res.status(403).json({ message: "Not authorized to reject sales" });
      }
      
      const { reason } = req.body;
      const sale = await storage.updateSale(id, {
        status: "REJEITADA",
        approvedBy: userId,
        approvedAt: new Date(),
        rejectionReason: reason,
      });
      
      res.json(sale);
    } catch (error) {
      console.error("Error rejecting sale:", error);
      res.status(500).json({ message: "Failed to reject sale" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/team-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = req.user.claims.role || 'VENDEDOR';
      
      if (userRole === 'VENDEDOR') {
        return res.status(403).json({ message: "Not authorized to view team stats" });
      }
      
      const stats = await storage.getTeamStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching team stats:", error);
      res.status(500).json({ message: "Failed to fetch team stats" });
    }
  });

  // Manager Dashboard routes
  app.get('/api/manager/team-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Fetch user role from database since it may not be in JWT claims
      const user = await storage.getUser(userId);
      if (!user || !['GESTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Not authorized to view manager dashboard" });
      }
      
      const { period = '30d' } = req.query;
      const stats = await storage.getTeamStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching manager team stats:", error);
      res.status(500).json({ message: "Failed to fetch manager team stats" });
    }
  });

  // Rankings routes
  app.get('/api/rankings', isAuthenticated, async (req, res) => {
    try {
      const { period } = req.query;
      const rankings = await storage.getUserRankings(period as string);
      res.json(rankings);
    } catch (error) {
      console.error("Error fetching rankings:", error);
      res.status(500).json({ message: "Failed to fetch rankings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
