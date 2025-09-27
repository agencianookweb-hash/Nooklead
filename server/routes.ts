import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLeadSchema, insertSaleSchema, insertCompanySchema, insertMassCampaignSchema, insertCampaignContactSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import csv from "csv-parser";
import * as XLSX from "xlsx";
import { lookup } from "mime-types";
import { createReadStream } from "fs";
import path from "path";

// Helper functions for file processing
async function parseCSVFile(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    
    bufferStream
      .pipe(csv({
        headers: ['name', 'phone', 'email', 'company'], // Expected CSV headers
      }))
      .on('data', (data: any) => {
        if (data.phone && data.phone.trim()) {
          results.push({
            name: data.name?.trim() || '',
            phone: data.phone.trim(),
            email: data.email?.trim() || '',
            company: data.company?.trim() || '',
          });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function parseXLSXFile(buffer: Buffer): Promise<any[]> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    header: ['name', 'phone', 'email', 'company'],
    range: 1, // Skip header row
  });
  
  return jsonData
    .filter((row: any) => row.phone && row.phone.toString().trim())
    .map((row: any) => ({
      name: row.name?.toString().trim() || '',
      phone: row.phone.toString().trim(),
      email: row.email?.toString().trim() || '',
      company: row.company?.toString().trim() || '',
    }));
}

async function parseTXTFile(buffer: Buffer): Promise<any[]> {
  const content = buffer.toString('utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    const parts = line.split(',').map(part => part.trim());
    return {
      name: parts[0] || '',
      phone: parts[1] || '',
      email: parts[2] || '',
      company: parts[3] || '',
    };
  }).filter(contact => contact.phone);
}

// Phone number validation helper
function isValidBrazilianPhone(phone: string): boolean {
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Brazilian phone formats:
  // Mobile: 11 digits (with area code) - (XX) 9XXXX-XXXX
  // Landline: 10 digits (with area code) - (XX) XXXX-XXXX
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

// Format phone number to standard format
function formatBrazilianPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 11) {
    // Mobile format: +55 (XX) 9XXXX-XXXX
    return `+55${cleanPhone}`;
  } else if (cleanPhone.length === 10) {
    // Landline format: +55 (XX) XXXX-XXXX  
    return `+55${cleanPhone}`;
  }
  
  return phone; // Return original if can't format
}

// Process contacts list with validation and blacklist checking
async function processContactsList(contacts: any[], campaignId: string): Promise<{
  validContacts: any[];
  invalidContacts: any[];
  duplicates: any[];
  blacklisted: any[];
}> {
  const validContacts: any[] = [];
  const invalidContacts: any[] = [];
  const duplicates: any[] = [];
  const blacklisted: any[] = [];
  const phoneSet = new Set<string>();
  
  // First pass: validate and format all phone numbers
  const validFormattedContacts: Array<{
    contact: any;
    formattedPhone: string;
  }> = [];
  
  for (const contact of contacts) {
    const { name, phone, email, company } = contact;
    
    // Validate phone number
    if (!isValidBrazilianPhone(phone)) {
      invalidContacts.push({ ...contact, reason: 'Número de telefone inválido' });
      continue;
    }
    
    const formattedPhone = formatBrazilianPhone(phone);
    
    // Check for duplicates within the file
    if (phoneSet.has(formattedPhone)) {
      duplicates.push({ ...contact, reason: 'Número duplicado no arquivo' });
      continue;
    }
    
    phoneSet.add(formattedPhone);
    validFormattedContacts.push({ contact, formattedPhone });
  }
  
  // Bulk blacklist check for all unique formatted phones
  const uniquePhones = Array.from(phoneSet);
  const blacklistedPhonesSet = await storage.arePhonesBulkBlacklisted(uniquePhones);
  
  // Second pass: separate blacklisted from valid contacts
  for (const { contact, formattedPhone } of validFormattedContacts) {
    if (blacklistedPhonesSet.has(formattedPhone)) {
      blacklisted.push({ ...contact, reason: 'Número na blacklist' });
    } else {
      validContacts.push({
        campaignId,
        name: contact.name || 'Sem nome',
        phone: formattedPhone,
        email: contact.email || null,
        company: contact.company || null,
        phoneValidationStatus: 'PENDING',
        messageStatus: 'PENDING',
      });
    }
  }
  
  return { validContacts, invalidContacts, duplicates, blacklisted };
}

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

  // Team management routes
  app.get('/api/team/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user is authorized to manage team
      const user = await storage.getUser(userId);
      if (!user || !['GESTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Not authorized to manage team" });
      }
      
      const members = await storage.getTeamMembers(userId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post('/api/team/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user is authorized to manage team
      const user = await storage.getUser(userId);
      if (!user || !['GESTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Not authorized to manage team" });
      }
      
      const { email, firstName, lastName, phone, monthlyGoal } = req.body;
      
      if (!email || !firstName || !lastName || !monthlyGoal) {
        return res.status(400).json({ message: "Email, first name, last name and monthly goal are required" });
      }
      
      const newMember = await storage.createTeamMember({
        email,
        firstName,
        lastName,
        phone,
        managerId: userId,
        monthlyGoal: parseInt(monthlyGoal),
      });
      
      res.status(201).json(newMember);
    } catch (error) {
      console.error("Error creating team member:", error);
      res.status(500).json({ message: "Failed to create team member" });
    }
  });

  app.patch('/api/team/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { memberId } = req.params;
      
      // Check if user is authorized to manage team
      const user = await storage.getUser(userId);
      if (!user || !['GESTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Not authorized to manage team" });
      }
      
      const updates = req.body;
      const updatedMember = await storage.updateTeamMember(memberId, updates);
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.delete('/api/team/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { memberId } = req.params;
      
      // Check if user is authorized to manage team
      const user = await storage.getUser(userId);
      if (!user || !['GESTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Not authorized to manage team" });
      }
      
      await storage.deactivateTeamMember(memberId);
      res.json({ message: "Team member deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating team member:", error);
      res.status(500).json({ message: "Failed to deactivate team member" });
    }
  });

  // Configure multer for file uploads
  const storage_config = multer.memoryStorage();
  const upload = multer({ 
    storage: storage_config,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
      const fileType = lookup(file.originalname) || file.mimetype;
      
      if (allowedTypes.includes(fileType) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.txt')) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de arquivo não suportado. Use CSV, XLSX ou TXT.'));
      }
    }
  });

  // Mass Campaign routes
  app.get('/api/mass-campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.user?.claims?.role || 'VENDEDOR';
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Vendedores only see their own campaigns, others see all
      const campaigns = userRole === 'VENDEDOR' 
        ? await storage.getMassCampaigns(userId)
        : await storage.getMassCampaigns();
        
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching mass campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get('/api/mass-campaigns/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getMassCampaignById(id);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching mass campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.post('/api/mass-campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const validatedData = insertMassCampaignSchema.parse({
        ...req.body,
        userId,
      });
      
      const campaign = await storage.createMassCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating mass campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.patch('/api/mass-campaigns/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const campaign = await storage.updateMassCampaign(id, updates);
      res.json(campaign);
    } catch (error) {
      console.error("Error updating mass campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete('/api/mass-campaigns/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMassCampaign(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting mass campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // File upload and processing routes
  app.post('/api/mass-campaigns/:id/upload-contacts', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const { id: campaignId } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      // Verify campaign exists
      const campaign = await storage.getMassCampaignById(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campanha não encontrada" });
      }

      // Create list validation record
      const validation = await storage.createListValidation({
        campaignId,
        filename: file.originalname,
        status: 'PROCESSING',
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        errorRecords: 0,
        blacklistedRecords: 0,
      });

      // Process file based on type
      let contacts: any[] = [];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      try {
        if (fileExtension === '.csv' || file.mimetype === 'text/csv') {
          contacts = await parseCSVFile(file.buffer);
        } else if (fileExtension === '.xlsx' || file.mimetype.includes('spreadsheet')) {
          contacts = await parseXLSXFile(file.buffer);
        } else if (fileExtension === '.txt' || file.mimetype === 'text/plain') {
          contacts = await parseTXTFile(file.buffer);
        } else {
          throw new Error('Formato de arquivo não suportado');
        }

        // Validate record count limit
        if (contacts.length > 50000) {
          throw new Error('Arquivo excede o limite de 50.000 registros');
        }

        // Process and validate contacts
        const processedContacts = await processContactsList(contacts, campaignId);
        
        // Save contacts in batches
        if (processedContacts.validContacts.length > 0) {
          await storage.createCampaignContactsBulk(processedContacts.validContacts);
        }

        // Update validation record with results
        await storage.updateListValidation(validation.id, {
          status: 'COMPLETED',
          totalRecords: contacts.length,
          validRecords: processedContacts.validContacts.length,
          invalidRecords: processedContacts.invalidContacts.length,
          errorRecords: processedContacts.duplicates.length,
          blacklistedRecords: processedContacts.blacklisted.length,
          validationReport: {
            summary: "Arquivo processado com sucesso",
            validContacts: processedContacts.validContacts.length,
            invalidContacts: processedContacts.invalidContacts.length,
            duplicates: processedContacts.duplicates.length,
            blacklisted: processedContacts.blacklisted.length,
          },
        });

        res.json({
          message: "Arquivo processado com sucesso",
          validation: {
            ...validation,
            totalRecords: contacts.length,
            validRecords: processedContacts.validContacts.length,
            invalidRecords: processedContacts.invalidContacts.length,
            duplicateRecords: processedContacts.duplicates.length,
            blacklistedRecords: processedContacts.blacklisted.length,
          }
        });

      } catch (processingError) {
        // Update validation record with error
        await storage.updateListValidation(validation.id, {
          status: 'FAILED',
          validationReport: {
            error: processingError instanceof Error ? processingError.message : 'Erro desconhecido',
            status: 'failed',
          },
        });
        
        throw processingError;
      }

    } catch (error) {
      console.error("Error processing file upload:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Falha ao processar arquivo"
      });
    }
  });

  // Campaign contacts routes
  app.get('/api/mass-campaigns/:id/contacts', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const contacts = await storage.getCampaignContacts(id);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching campaign contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  // Phone blacklist routes
  app.get('/api/blacklist', isAuthenticated, async (req, res) => {
    try {
      const blacklist = await storage.getBlacklistedPhones();
      res.json(blacklist);
    } catch (error) {
      console.error("Error fetching blacklist:", error);
      res.status(500).json({ message: "Failed to fetch blacklist" });
    }
  });

  app.post('/api/blacklist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const entry = await storage.addToBlacklist({
        ...req.body,
        userId,
      });
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error adding to blacklist:", error);
      res.status(500).json({ message: "Failed to add to blacklist" });
    }
  });

  app.delete('/api/blacklist/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removeFromBlacklist(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing from blacklist:", error);
      res.status(500).json({ message: "Failed to remove from blacklist" });
    }
  });

  // List validation routes
  app.get('/api/mass-campaigns/:id/validations', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const validations = await storage.getListValidations(id);
      res.json(validations);
    } catch (error) {
      console.error("Error fetching validations:", error);
      res.status(500).json({ message: "Failed to fetch validations" });
    }
  });

  // Campaign logs routes
  app.get('/api/mass-campaigns/:id/logs', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const logs = await storage.getCampaignLogs(id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching campaign logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Onboarding routes
  app.post('/api/onboarding', async (req, res) => {
    try {
      const {
        companyName,
        cnpj,
        businessSector,
        companySize,
        managerName,
        managerCpf,
        managerEmail,
        managerPhone,
        cep,
        address,
        number,
        complement,
        neighborhood,
        city,
        state,
        salesGoal,
        teamSize,
        description,
      } = req.body;

      // Validation
      if (!companyName || !cnpj || !businessSector || !companySize ||
          !managerName || !managerCpf || !managerEmail || !managerPhone ||
          !cep || !address || !number || !neighborhood || !city || !state ||
          !salesGoal || !teamSize) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const result = await storage.createCompanyOnboarding({
        companyName,
        cnpj,
        businessSector,
        companySize,
        managerName,
        managerCpf,
        managerEmail,
        managerPhone,
        cep,
        address,
        number,
        complement,
        neighborhood,
        city,
        state,
        salesGoal: parseInt(salesGoal),
        teamSize: parseInt(teamSize),
        description,
      });

      res.status(201).json({
        message: "Company onboarding completed successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error processing onboarding:", error);
      res.status(500).json({ message: "Failed to process onboarding" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
