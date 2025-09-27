import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { campaignEngine } from "./campaignEngine";
import { insertLeadSchema, insertSaleSchema, insertCompanySchema, insertMassCampaignSchema, insertCampaignContactSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import csv from "csv-parser";
import * as XLSX from "xlsx";
import { lookup } from "mime-types";
import { createReadStream } from "fs";
import path from "path";

// Blacklist categorization system
const cnaeBlacklistMapping: Record<string, string> = {
  // Contabilidade
  '6920-6': 'CONTABILIDADE', // Atividades de contabilidade
  '6911-2': 'CONTABILIDADE', // Atividades jurídicas
  '6920-6/01': 'CONTABILIDADE',
  '6920-6/02': 'CONTABILIDADE',
  
  // Órgãos Públicos  
  '8411-6': 'PUBLICO', // Administração pública geral
  '8412-4': 'PUBLICO', // Regulação de atividades de saúde
  '8413-2': 'PUBLICO', // Regulação de outros serviços
  '8421-3': 'PUBLICO', // Relações exteriores
  
  // Saúde
  '8610-1': 'SAUDE', // Atividades de atendimento hospitalar
  '8630-5': 'SAUDE', // Atividade médica ambulatorial
  '8640-2': 'SAUDE', // Atividades de complementação diagnóstica
  '8650-0': 'SAUDE', // Atividades de profissionais da nutrição
  '8660-7': 'SAUDE', // Atividades de apoio à gestão de saúde
  
  // Educação
  '8513-9': 'EDUCACAO', // Ensino fundamental
  '8520-1': 'EDUCACAO', // Ensino médio
  '8531-7': 'EDUCACAO', // Educação superior
  '8541-4': 'EDUCACAO', // Educação profissional
  '8550-3': 'EDUCACAO', // Atividades de apoio à educação
  
  // Call Centers
  '8220-2': 'CALLCENTER', // Atividades de teleatendimento
  '6190-6': 'CALLCENTER', // Outras atividades de telecomunicações
  
  // Bancos/Financeiras
  '6421-2': 'FINANCEIRO', // Bancos comerciais
  '6422-1': 'FINANCEIRO', // Bancos múltiplos
  '6423-9': 'FINANCEIRO', // Caixas econômicas
  '6424-7': 'FINANCEIRO', // Bancos de investimento
  '6431-0': 'FINANCEIRO', // Bancos múltiplos cooperativos
  '6440-9': 'FINANCEIRO', // Arrendamento mercantil
  '6450-6': 'FINANCEIRO', // Sociedades de crédito
  
  // Religiosas
  '9491-0': 'RELIGIOSO', // Atividades de organizações religiosas
  '9499-5': 'RELIGIOSO', // Atividades associativas não especificadas
};

const blacklistKeywords: Record<string, string[]> = {
  CONTABILIDADE: [
    'contabil', 'contador', 'contadoria', 'escritorio contabil',
    'assessoria contabil', 'consultoria contabil', 'crc', 'contábil',
    'escritório contábil', 'consultoria', 'assessoria', 'audit'
  ],
  PUBLICO: [
    'prefeitura', 'camara', 'secretaria', 'municipio', 'estado',
    'governo', 'tribunal', 'cartorio', 'detran', 'receita',
    'câmara', 'município', 'cartório', 'público', 'municipal',
    'procon', 'defensoria', 'tribunal de contas', 'procuradoria',
    'assembleia legislativa', 'senado', 'congresso', 'supremo',
    'ministério', 'agência reguladora', 'autarquia', 'fundação pública'
  ],
  SAUDE: [
    'hospital', 'clinica', 'laboratorio', 'consultorio', 'pronto socorro',
    'upa', 'sus', 'unimed', 'amil', 'bradesco saude', 'clínica',
    'laboratório', 'consultório', 'médico', 'odonto', 'saúde'
  ],
  EDUCACAO: [
    'escola', 'colegio', 'universidade', 'faculdade', 'instituto',
    'curso', 'educacional', 'ensino', 'pedagogico', 'colégio',
    'pedagógico', 'educação', 'creche', 'berçário'
  ],
  CALLCENTER: [
    'call center', 'teleatendimento', 'telemarketing', 'sac',
    'atendimento', 'contact center', 'outsourcing', 'cobrança',
    'telecobrança', 'central de atendimento'
  ],
  FINANCEIRO: [
    'banco', 'financeira', 'credito', 'emprestimo', 'financiamento',
    'crédito', 'empréstimo', 'cartão', 'seguro', 'corretora',
    'investimento', 'financeiro'
  ],
  RELIGIOSO: [
    'igreja', 'templo', 'paroquia', 'diocese', 'congregacao',
    'assembleia', 'batista', 'evangelica', 'catolica', 'congregação',
    'evangélica', 'católica', 'cristã', 'pastor', 'padre'
  ]
};

// WhatsApp validation configuration
const VALIDATION_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const VALIDATION_COSTS = {
  FORMAT_ONLY: 0,
  WHATSAPP_API: 0.01, // $0.01 per validation
  MAYTAPI: 0.005, // $0.005 per validation
} as const;

// Daily validation limits per user role
const DAILY_VALIDATION_LIMITS = {
  VENDEDOR: 1000,
  GESTOR: 5000,
  ADMIN: 10000,
  SUPER_ADMIN: 50000,
} as const;

// Automatic blacklist detection functions
function detectBlacklistByCnae(cnae: string): string | null {
  if (!cnae) return null;
  
  // Clean CNAE format (remove dots, slashes, etc)
  const cleanCnae = cnae.replace(/[^\d-]/g, '');
  
  // Check exact match first
  if (cnaeBlacklistMapping[cleanCnae]) {
    return cnaeBlacklistMapping[cleanCnae];
  }
  
  // Check partial match (main group)
  const mainGroup = cleanCnae.split('-')[0] + '-' + cleanCnae.split('-')[1]?.charAt(0);
  if (cnaeBlacklistMapping[mainGroup]) {
    return cnaeBlacklistMapping[mainGroup];
  }
  
  return null;
}

function detectBlacklistByKeywords(companyName: string): string | null {
  if (!companyName) return null;
  
  const normalizedName = companyName.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents
  
  for (const [category, keywords] of Object.entries(blacklistKeywords)) {
    for (const keyword of keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return null;
}

function detectBlacklistCategory(companyData: { cnae?: string; name?: string; razaoSocial?: string }): {
  category: string | null;
  reason: string | null;
  autoDetected: boolean;
} {
  // Note: CNAE detection disabled - CNAE data not available in upload pipeline
  // TODO: Re-enable when CNAE data is available in contact upload
  
  // Try keyword detection
  const companyName = companyData.name || companyData.razaoSocial || '';
  if (companyName) {
    const keywordCategory = detectBlacklistByKeywords(companyName);
    if (keywordCategory) {
      return {
        category: keywordCategory,
        reason: `Detectado automaticamente por palavra-chave no nome: ${companyName}`,
        autoDetected: true
      };
    }
  }
  
  return {
    category: null,
    reason: null,
    autoDetected: false
  };
}

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
async function processContactsList(contacts: any[], campaignId: string, userId?: string): Promise<{
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
  
  // Second pass: automatic blacklist detection and categorization
  const autoDetectedBlacklist: Array<{
    phone: string;
    category: string;
    reason: string;
    companyName: string;
    autoDetected: boolean;
  }> = [];
  
  for (const { contact, formattedPhone } of validFormattedContacts) {
    // Check if already in blacklist
    if (blacklistedPhonesSet.has(formattedPhone)) {
      blacklisted.push({ ...contact, reason: 'Número na blacklist' });
      continue;
    }
    
    // Automatic blacklist detection
    const detection = detectBlacklistCategory({
      name: contact.company || contact.name,
    });
    
    if (detection.category) {
      // Add to blacklist automatically
      autoDetectedBlacklist.push({
        phone: formattedPhone,
        category: detection.category,
        reason: detection.reason || 'Detectado automaticamente',
        companyName: contact.company || contact.name,
        autoDetected: true,
      });
      
      blacklisted.push({ 
        ...contact, 
        reason: `Blacklist automática: ${detection.category} - ${detection.reason}`
      });
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
  
  // Store auto-detected blacklist entries (but don't await to not slow down processing)
  if (autoDetectedBlacklist.length > 0 && userId) {
    // Process in background - don't await to maintain performance
    setImmediate(async () => {
      try {
        for (const entry of autoDetectedBlacklist) {
          await storage.addToBlacklist({
            phone: entry.phone,
            category: entry.category as "CONTABILIDADE" | "PUBLICO" | "SAUDE" | "CALLCENTER" | "EDUCACAO" | "FINANCEIRO" | "RELIGIOSO" | "OPTOUT",
            addedBy: userId,
            reason: entry.reason,
            companyName: entry.companyName,
            autoDetected: entry.autoDetected,
          });
        }
      } catch (error) {
        console.error('Error saving auto-detected blacklist entries:', error);
      }
    });
  }
  
  return { validContacts, invalidContacts, duplicates, blacklisted };
}

// WhatsApp validation service functions
async function checkDailyValidationLimit(userId: string, userRole: string): Promise<{ canValidate: boolean; remaining: number; limit: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dailyStats = await storage.getValidationCostsByUser(userId, today, tomorrow);
  const limit = DAILY_VALIDATION_LIMITS[userRole as keyof typeof DAILY_VALIDATION_LIMITS] || DAILY_VALIDATION_LIMITS.VENDEDOR;
  const remaining = Math.max(0, limit - dailyStats.totalValidations);

  return {
    canValidate: remaining > 0,
    remaining,
    limit
  };
}

// Mock WhatsApp Business API validation (replace with real API in production)
async function validatePhoneWithWhatsAppAPI(phone: string): Promise<{
  status: 'VALID_WHATSAPP' | 'VALID_NO_WHATSAPP' | 'INVALID';
  whatsappEnabled: boolean;
  cost: number;
  provider: string;
  responseData: any;
}> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

  const cleanPhone = phone.replace(/\D/g, '');
  
  // Mock validation logic - replace with real WhatsApp Business API
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return {
      status: 'INVALID',
      whatsappEnabled: false,
      cost: VALIDATION_COSTS.WHATSAPP_API,
      provider: 'whatsapp_api',
      responseData: { error: 'Invalid phone number format' }
    };
  }

  // Simulate different scenarios based on phone number patterns
  const lastDigit = parseInt(cleanPhone.slice(-1));
  const hasWhatsApp = lastDigit % 3 !== 0; // ~67% have WhatsApp
  const isValid = lastDigit !== 0; // ~90% are valid numbers

  if (!isValid) {
    return {
      status: 'INVALID',
      whatsappEnabled: false,
      cost: VALIDATION_COSTS.WHATSAPP_API,
      provider: 'whatsapp_api',
      responseData: { error: 'Phone number not in service' }
    };
  }

  return {
    status: hasWhatsApp ? 'VALID_WHATSAPP' : 'VALID_NO_WHATSAPP',
    whatsappEnabled: hasWhatsApp,
    cost: VALIDATION_COSTS.WHATSAPP_API,
    provider: 'whatsapp_api',
    responseData: {
      phone: phone,
      whatsapp_enabled: hasWhatsApp,
      is_business: Math.random() > 0.8, // ~20% business accounts
      profile_name: hasWhatsApp ? `User ${cleanPhone.slice(-4)}` : null
    }
  };
}

// Main phone validation function with quota enforcement and proper event tracking
async function validatePhoneNumber(phone: string, userId: string, userRole: string, forceRefresh = false, batchId?: string): Promise<{
  phone: string;
  status: 'VALID_WHATSAPP' | 'VALID_NO_WHATSAPP' | 'INVALID' | 'BLACKLISTED' | 'ERROR';
  whatsappEnabled: boolean;
  cost: number;
  fromCache: boolean;
  expiresAt?: Date;
  responseData?: any;
  errorMessage?: string;
}> {
  const formattedPhone = formatBrazilianPhone(phone);
  
  try {
    // Check if phone is blacklisted first (free operation)
    const isBlacklisted = await storage.isPhoneBlacklisted(formattedPhone);
    if (isBlacklisted) {
      await storage.recordValidationEvent({
        phone: formattedPhone,
        validationStatus: 'BLACKLISTED',
        whatsappEnabled: false,
        validationProvider: 'blacklist_check',
        validationCost: "0",
        validatedBy: userId,
        fromCache: false,
        batchId,
      });

      return {
        phone: formattedPhone,
        status: 'BLACKLISTED',
        whatsappEnabled: false,
        cost: 0,
        fromCache: false,
        errorMessage: 'Phone number is blacklisted'
      };
    }

    // Check cache first (unless force refresh) - free operation
    if (!forceRefresh) {
      const cachedValidation = await storage.getCachedValidation(formattedPhone);
      if (cachedValidation) {
        await storage.recordValidationEvent({
          phone: formattedPhone,
          validationStatus: cachedValidation.validationStatus,
          whatsappEnabled: cachedValidation.whatsappEnabled,
          validationProvider: cachedValidation.validationProvider || 'cache',
          validationCost: "0", // Cache hits are free
          validatedBy: userId,
          fromCache: true,
          batchId,
        });

        return {
          phone: formattedPhone,
          status: cachedValidation.validationStatus as any,
          whatsappEnabled: cachedValidation.whatsappEnabled || false,
          cost: 0,
          fromCache: true,
          expiresAt: cachedValidation.expiresAt || undefined,
          responseData: cachedValidation.responseData
        };
      }
    }

    // Basic format validation (free operation)
    if (!isValidBrazilianPhone(phone)) {
      const expiresAt = new Date(Date.now() + VALIDATION_CACHE_TTL);
      
      await storage.recordValidationEvent({
        phone: formattedPhone,
        validationStatus: 'INVALID',
        whatsappEnabled: false,
        validationProvider: 'format_only',
        validationCost: "0",
        errorMessage: 'Invalid phone number format',
        validatedBy: userId,
        fromCache: false,
        batchId,
      });

      await storage.saveCachedValidation({
        phone: formattedPhone,
        validationStatus: 'INVALID',
        whatsappEnabled: false,
        validationProvider: 'format_only',
        expiresAt,
      });

      return {
        phone: formattedPhone,
        status: 'INVALID',
        whatsappEnabled: false,
        cost: 0,
        fromCache: false,
        errorMessage: 'Invalid phone number format'
      };
    }

    // CHECK QUOTA before making costly API call
    const { canValidate, remaining } = await checkDailyValidationLimit(userId, userRole);
    if (!canValidate || remaining <= 0) {
      throw new Error(`Daily validation limit exceeded. You have ${remaining} validations remaining today.`);
    }

    // Call WhatsApp API validation (COSTS QUOTA - ENFORCE LIMIT HERE)
    const apiResult = await validatePhoneWithWhatsAppAPI(formattedPhone);
    const expiresAt = new Date(Date.now() + VALIDATION_CACHE_TTL);

    // Record API call as validation event (PAID - counts toward quota)
    await storage.recordValidationEvent({
      phone: formattedPhone,
      validationStatus: apiResult.status,
      whatsappEnabled: apiResult.whatsappEnabled,
      validationProvider: apiResult.provider,
      validationCost: apiResult.cost.toString(),
      responseData: apiResult.responseData,
      validatedBy: userId,
      fromCache: false,
      batchId,
    });

    // Save to cache for future performance
    await storage.saveCachedValidation({
      phone: formattedPhone,
      validationStatus: apiResult.status,
      whatsappEnabled: apiResult.whatsappEnabled,
      validationProvider: apiResult.provider,
      responseData: apiResult.responseData,
      expiresAt,
    });

    return {
      phone: formattedPhone,
      status: apiResult.status,
      whatsappEnabled: apiResult.whatsappEnabled,
      cost: apiResult.cost,
      fromCache: false,
      expiresAt,
      responseData: apiResult.responseData
    };

  } catch (error) {
    console.error('Error validating phone number:', error);
    
    // Record error as validation event
    await storage.recordValidationEvent({
      phone: formattedPhone,
      validationStatus: 'ERROR',
      whatsappEnabled: false,
      validationProvider: 'error',
      validationCost: "0",
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      validatedBy: userId,
      fromCache: false,
      batchId,
    });

    return {
      phone: formattedPhone,
      status: 'ERROR',
      whatsappEnabled: false,
      cost: 0,
      fromCache: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

// Bulk phone validation with robust quota enforcement - atomic operation
async function validatePhonesBulk(phones: string[], userId: string, userRole: string, campaignId?: string): Promise<{
  validations: Array<{
    phone: string;
    status: string;
    whatsappEnabled: boolean;
    cost: number;
    fromCache: boolean;
  }>;
  totalCost: number;
  summary: {
    total: number;
    valid_whatsapp: number;
    valid_no_whatsapp: number;
    invalid: number;
    blacklisted: number;
    errors: number;
    fromCache: number;
  };
  quotaInfo: {
    remaining: number;
    limit: number;
    canValidate: boolean;
  };
  skipped: number;
}> {
  // Generate unique batch ID for tracking
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Check daily limits BEFORE processing
  const { canValidate, remaining, limit } = await checkDailyValidationLimit(userId, userRole);
  
  if (!canValidate) {
    throw new Error(`Daily validation limit exceeded. You have 0 validations remaining today.`);
  }

  if (phones.length === 0) {
    throw new Error('No phone numbers provided for validation.');
  }

  // Pre-compute potential API costs to avoid quota overruns
  const estimatedApiCalls = await estimateBulkApiCalls(phones, userId);
  
  // Hard limit: only process what fits within remaining quota
  let allowedCount = remaining;
  if (estimatedApiCalls > remaining) {
    console.warn(`Bulk validation limited: ${estimatedApiCalls} estimated API calls exceeds ${remaining} remaining quota`);
    allowedCount = remaining;
  }

  const phonesToValidate = phones.slice(0, allowedCount);
  const skippedCount = phones.length - phonesToValidate.length;
  
  if (phonesToValidate.length === 0) {
    throw new Error(`Cannot process any validations: ${estimatedApiCalls} required but only ${remaining} remaining in daily quota.`);
  }

  // Process validations sequentially with real-time quota checking
  const validations = [];
  let currentQuotaRemaining = remaining;
  
  for (const phone of phonesToValidate) {
    // Double-check quota before each potentially costly operation
    if (currentQuotaRemaining <= 0) {
      console.warn(`Stopping bulk validation: quota exhausted at ${validations.length}/${phonesToValidate.length} processed`);
      break;
    }

    try {
      const result = await validatePhoneNumber(phone, userId, userRole, false, batchId);
      validations.push(result);
      
      // Update remaining quota (API calls reduce it, cache hits don't)
      if (!result.fromCache && result.cost > 0) {
        currentQuotaRemaining--;
      }
    } catch (quotaError: any) {
      // If quota exceeded, stop processing but return partial results
      console.warn(`Quota exceeded during bulk validation: ${quotaError?.message || 'Unknown error'}`);
      break;
    }
  }

  const totalCost = validations.reduce((sum, v) => sum + v.cost, 0);
  
  const summary = {
    total: validations.length,
    valid_whatsapp: validations.filter(v => v.status === 'VALID_WHATSAPP').length,
    valid_no_whatsapp: validations.filter(v => v.status === 'VALID_NO_WHATSAPP').length,
    invalid: validations.filter(v => v.status === 'INVALID').length,
    blacklisted: validations.filter(v => v.status === 'BLACKLISTED').length,
    errors: validations.filter(v => v.status === 'ERROR').length,
    fromCache: validations.filter(v => v.fromCache).length,
  };

  // Get final quota info
  const finalQuota = await checkDailyValidationLimit(userId, userRole);

  return {
    validations: validations.map(v => ({
      phone: v.phone,
      status: v.status,
      whatsappEnabled: v.whatsappEnabled,
      cost: v.cost,
      fromCache: v.fromCache
    })),
    totalCost,
    summary,
    quotaInfo: finalQuota,
    skipped: skippedCount + (phonesToValidate.length - validations.length)
  };
}

// Estimate potential API calls for quota pre-checking
async function estimateBulkApiCalls(phones: string[], userId: string): Promise<number> {
  let estimatedApiCalls = 0;
  
  for (const phone of phones) {
    const formattedPhone = formatBrazilianPhone(phone);
    
    // Check if blacklisted (free)
    const isBlacklisted = await storage.isPhoneBlacklisted(formattedPhone);
    if (isBlacklisted) continue;
    
    // Check if cached (free)
    const cached = await storage.getCachedValidation(formattedPhone);
    if (cached) continue;
    
    // Check if invalid format (free)
    if (!isValidBrazilianPhone(phone)) continue;
    
    // This would require an API call (costs quota)
    estimatedApiCalls++;
  }
  
  return estimatedApiCalls;
}

// Validation with quota checking to prevent overruns
async function validatePhoneNumberWithQuotaCheck(
  phone: string, 
  userId: string, 
  forceRefresh = false, 
  batchId?: string,
  quotaRemaining?: number
): Promise<{
  phone: string;
  status: 'VALID_WHATSAPP' | 'VALID_NO_WHATSAPP' | 'INVALID' | 'BLACKLISTED' | 'ERROR';
  whatsappEnabled: boolean;
  cost: number;
  fromCache: boolean;
  expiresAt?: Date;
  responseData?: any;
  errorMessage?: string;
}> {
  const formattedPhone = formatBrazilianPhone(phone);
  
  try {
    // Check if phone is blacklisted first (free)
    const isBlacklisted = await storage.isPhoneBlacklisted(formattedPhone);
    if (isBlacklisted) {
      await storage.recordValidationEvent({
        phone: formattedPhone,
        validationStatus: 'BLACKLISTED',
        whatsappEnabled: false,
        validationProvider: 'blacklist_check',
        validationCost: "0",
        validatedBy: userId,
        fromCache: false,
        batchId,
      });

      return {
        phone: formattedPhone,
        status: 'BLACKLISTED',
        whatsappEnabled: false,
        cost: 0,
        fromCache: false,
        errorMessage: 'Phone number is blacklisted'
      };
    }

    // Check cache first (unless force refresh) - free
    if (!forceRefresh) {
      const cachedValidation = await storage.getCachedValidation(formattedPhone);
      if (cachedValidation) {
        await storage.recordValidationEvent({
          phone: formattedPhone,
          validationStatus: cachedValidation.validationStatus,
          whatsappEnabled: cachedValidation.whatsappEnabled,
          validationProvider: cachedValidation.validationProvider || 'cache',
          validationCost: "0", // Cache hits are free
          validatedBy: userId,
          fromCache: true,
          batchId,
        });

        return {
          phone: formattedPhone,
          status: cachedValidation.validationStatus as any,
          whatsappEnabled: cachedValidation.whatsappEnabled || false,
          cost: 0,
          fromCache: true,
          expiresAt: cachedValidation.expiresAt || undefined,
          responseData: cachedValidation.responseData
        };
      }
    }

    // Basic format validation (free)
    if (!isValidBrazilianPhone(phone)) {
      const expiresAt = new Date(Date.now() + VALIDATION_CACHE_TTL);
      
      await storage.recordValidationEvent({
        phone: formattedPhone,
        validationStatus: 'INVALID',
        whatsappEnabled: false,
        validationProvider: 'format_only',
        validationCost: "0",
        errorMessage: 'Invalid phone number format',
        validatedBy: userId,
        fromCache: false,
        batchId,
      });

      await storage.saveCachedValidation({
        phone: formattedPhone,
        validationStatus: 'INVALID',
        whatsappEnabled: false,
        validationProvider: 'format_only',
        expiresAt,
      });

      return {
        phone: formattedPhone,
        status: 'INVALID',
        whatsappEnabled: false,
        cost: 0,
        fromCache: false,
        errorMessage: 'Invalid phone number format'
      };
    }

    // CHECK QUOTA before making costly API call
    if (quotaRemaining !== undefined && quotaRemaining <= 0) {
      throw new Error(`Quota exceeded: ${quotaRemaining} validations remaining`);
    }

    // Call WhatsApp API validation (COSTS QUOTA)
    const apiResult = await validatePhoneWithWhatsAppAPI(formattedPhone);
    const expiresAt = new Date(Date.now() + VALIDATION_CACHE_TTL);

    // Record API call as validation event (PAID - counts toward quota)
    await storage.recordValidationEvent({
      phone: formattedPhone,
      validationStatus: apiResult.status,
      whatsappEnabled: apiResult.whatsappEnabled,
      validationProvider: apiResult.provider,
      validationCost: apiResult.cost.toString(),
      responseData: apiResult.responseData,
      validatedBy: userId,
      fromCache: false,
      batchId,
    });

    // Save to cache for future performance
    await storage.saveCachedValidation({
      phone: formattedPhone,
      validationStatus: apiResult.status,
      whatsappEnabled: apiResult.whatsappEnabled,
      validationProvider: apiResult.provider,
      responseData: apiResult.responseData,
      expiresAt,
    });

    return {
      phone: formattedPhone,
      status: apiResult.status,
      whatsappEnabled: apiResult.whatsappEnabled,
      cost: apiResult.cost,
      fromCache: false,
      expiresAt,
      responseData: apiResult.responseData
    };

  } catch (error) {
    console.error('Error validating phone number:', error);
    
    // Record error as validation event
    await storage.recordValidationEvent({
      phone: formattedPhone,
      validationStatus: 'ERROR',
      whatsappEnabled: false,
      validationProvider: 'error',
      validationCost: "0",
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error',
      validatedBy: userId,
      fromCache: false,
      batchId,
    });

    return {
      phone: formattedPhone,
      status: 'ERROR',
      whatsappEnabled: false,
      cost: 0,
      fromCache: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
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
      if (!user || !user.role || !['GESTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
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
      if (!user || !user.role || !['GESTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
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
      if (!user || !user.role || !['GESTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
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
      if (!user || !user.role || !['GESTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
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
      if (!user || !user.role || !['GESTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
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
        const userId = req.user?.claims?.sub;
        const processedContacts = await processContactsList(contacts, campaignId, userId);
        
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
        addedBy: userId,
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

  // Blacklist statistics and management routes
  app.get('/api/blacklist/stats', isAuthenticated, async (req, res) => {
    try {
      const blacklist = await storage.getBlacklistedPhones();
      
      // Calculate statistics by category
      const stats = blacklist.reduce((acc, entry) => {
        const category = entry.category || 'OTHER';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Calculate today's additions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const addedToday = blacklist.filter(entry => 
        entry.createdAt && new Date(entry.createdAt) >= today
      ).length;
      
      res.json({
        total: blacklist.length,
        addedToday,
        categories: stats,
        activeCategories: Object.keys(stats).length,
      });
    } catch (error) {
      console.error("Error fetching blacklist stats:", error);
      res.status(500).json({ message: "Failed to fetch blacklist statistics" });
    }
  });

  app.get('/api/blacklist/categories/:category', isAuthenticated, async (req, res) => {
    try {
      const { category } = req.params;
      const categoryEntries = await storage.getBlacklistByCategory(category);
      res.json(categoryEntries);
    } catch (error) {
      console.error("Error fetching blacklist by category:", error);
      res.status(500).json({ message: "Failed to fetch category entries" });
    }
  });

  // Auto-detection and bulk categorization
  app.post('/api/blacklist/detect-company', isAuthenticated, async (req: any, res) => {
    try {
      const { cnae, companyName, razaoSocial } = req.body;
      
      const detection = detectBlacklistCategory({
        cnae,
        name: companyName,
        razaoSocial,
      });
      
      res.json(detection);
    } catch (error) {
      console.error("Error detecting blacklist category:", error);
      res.status(500).json({ message: "Failed to detect category" });
    }
  });

  app.post('/api/blacklist/bulk-add', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { entries } = req.body; // Array of { phone, category, reason, companyName?, cnpj? }
      
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ message: "Invalid entries array" });
      }
      
      const addedEntries = [];
      const errors = [];
      
      for (const entry of entries) {
        try {
          const blacklistEntry = await storage.addToBlacklist({
            phone: entry.phone,
            category: entry.category,
            reason: entry.reason || 'Adicionado em lote',
            cnpj: entry.cnpj || null,
            companyName: entry.companyName || null,
            addedBy: userId,
            autoDetected: entry.autoDetected || false,
          });
          addedEntries.push(blacklistEntry);
        } catch (entryError) {
          errors.push({
            phone: entry.phone,
            error: entryError instanceof Error ? entryError.message : 'Erro desconhecido',
          });
        }
      }
      
      res.json({
        message: `${addedEntries.length} números adicionados à blacklist`,
        added: addedEntries.length,
        errors: errors.length,
        errorDetails: errors,
      });
    } catch (error) {
      console.error("Error bulk adding to blacklist:", error);
      res.status(500).json({ message: "Failed to bulk add to blacklist" });
    }
  });

  // Scan existing contacts for auto-categorization
  app.post('/api/blacklist/scan-campaign/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id: campaignId } = req.params;
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Get campaign contacts
      const contacts = await storage.getCampaignContacts(campaignId);
      
      const detectedCategories = [];
      
      for (const contact of contacts) {
        const detection = detectBlacklistCategory({
          name: contact.razaoSocial || contact.nomeFantasia || '',
        });
        
        if (detection.category) {
          detectedCategories.push({
            contactId: contact.id,
            phone: contact.phone,
            companyName: contact.razaoSocial || contact.nomeFantasia,
            detectedCategory: detection.category,
            reason: detection.reason,
          });
        }
      }
      
      res.json({
        totalContacts: contacts.length,
        detectionsFound: detectedCategories.length,
        detections: detectedCategories,
      });
    } catch (error) {
      console.error("Error scanning campaign for blacklist:", error);
      res.status(500).json({ message: "Failed to scan campaign" });
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
      const { status, search, page = 1, limit = 10 } = req.query;
      
      let logs = await storage.getCampaignLogs(id);
      
      // Apply filters
      if (status && status !== 'ALL') {
        logs = logs.filter(log => log.eventType === status);
      }
      
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        logs = logs.filter(log => 
          log.message?.toLowerCase().includes(searchTerm) ||
          log.contactId?.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply pagination
      const offset = (Number(page) - 1) * Number(limit);
      const paginatedLogs = logs.slice(offset, offset + Number(limit));
      
      res.json({
        logs: paginatedLogs,
        totalCount: logs.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(logs.length / Number(limit))
      });
    } catch (error) {
      console.error("Error fetching campaign logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Campaign statistics route
  app.get('/api/mass-campaigns/:id/stats', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get campaign details
      const campaign = await storage.getMassCampaignById(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Get campaign contacts for total records
      const contacts = await storage.getCampaignContacts(id);
      
      // Get logs for detailed statistics
      const logs = await storage.getCampaignLogs(id);
      
      // Calculate statistics
      const stats = {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        channel: campaign.channel || 'WHATSAPP',
        totalRecords: contacts.length,
        sentCount: logs.filter(log => ['SENT', 'DELIVERED', 'READ'].includes(log.eventType || '')).length,
        deliveredCount: logs.filter(log => ['DELIVERED', 'READ'].includes(log.eventType || '')).length,
        readCount: logs.filter(log => log.status === 'READ').length,
        errorCount: logs.filter(log => log.status === 'FAILED').length,
        currentRate: campaign.sendRate || 50,
        startedAt: campaign.startTime,
        estimatedCompletionTime: campaign.endTime,
        totalCost: (Number(campaign.validationCost) || 0) + (Number(campaign.sendingCost) || 0),
        validationCost: Number(campaign.validationCost) || 0,
        sendingCost: Number(campaign.sendingCost) || 0,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching campaign stats:", error);
      res.status(500).json({ message: "Failed to fetch campaign statistics" });
    }
  });

  // Campaign control routes
  app.post('/api/mass-campaigns/:id/start', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`[API] Starting campaign ${id}`);
      await campaignEngine.startCampaign(id);
      
      const updatedCampaign = await storage.getMassCampaignById(id);
      if (!updatedCampaign) {
        return res.status(404).json({ message: "Campaign not found after start" });
      }
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error starting campaign:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to start campaign" 
      });
    }
  });

  app.post('/api/mass-campaigns/:id/pause', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`[API] Pausing campaign ${id}`);
      await campaignEngine.pauseCampaign(id);
      
      const updatedCampaign = await storage.getMassCampaignById(id);
      if (!updatedCampaign) {
        return res.status(404).json({ message: "Campaign not found after pause" });
      }
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error pausing campaign:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to pause campaign" 
      });
    }
  });

  app.post('/api/mass-campaigns/:id/resume', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`[API] Resuming campaign ${id}`);
      await campaignEngine.resumeCampaign(id);
      
      const updatedCampaign = await storage.getMassCampaignById(id);
      if (!updatedCampaign) {
        return res.status(404).json({ message: "Campaign not found after resume" });
      }
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error resuming campaign:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to resume campaign" 
      });
    }
  });

  app.post('/api/mass-campaigns/:id/stop', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`[API] Stopping campaign ${id}`);
      await campaignEngine.stopCampaign(id);
      
      const updatedCampaign = await storage.getMassCampaignById(id);
      if (!updatedCampaign) {
        return res.status(404).json({ message: "Campaign not found after stop" });
      }
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error stopping campaign:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to stop campaign" 
      });
    }
  });

  // WhatsApp Phone Validation routes
  app.get('/api/whatsapp/validation-limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.user?.claims?.role || 'VENDEDOR';
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const limits = await checkDailyValidationLimit(userId, userRole);
      
      // Get cost information for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const costStats = await storage.getValidationCostsByUser(userId, today, tomorrow);
      
      res.json({
        ...limits,
        todayCost: costStats.totalCost,
        costLimits: VALIDATION_COSTS,
        userRole
      });
    } catch (error) {
      console.error("Error fetching validation limits:", error);
      res.status(500).json({ message: "Failed to fetch validation limits" });
    }
  });

  app.post('/api/whatsapp/validate-phone', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.user?.claims?.role || 'VENDEDOR';
      const { phone, forceRefresh = false } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Check daily limits
      const limits = await checkDailyValidationLimit(userId, userRole);
      if (!limits.canValidate && !forceRefresh) {
        return res.status(429).json({ 
          message: "Daily validation limit exceeded",
          ...limits
        });
      }

      const result = await validatePhoneNumberWithQuotaCheck(phone, userId, forceRefresh, undefined, limits.remaining);
      res.json(result);
    } catch (error) {
      console.error("Error validating phone:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to validate phone" 
      });
    }
  });

  app.post('/api/whatsapp/validate-bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userRole = req.user?.claims?.role || 'VENDEDOR';
      const { phones } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!Array.isArray(phones) || phones.length === 0) {
        return res.status(400).json({ message: "Phones array is required and cannot be empty" });
      }

      if (phones.length > 1000) {
        return res.status(400).json({ message: "Maximum 1000 phones per batch" });
      }

      const result = await validatePhonesBulk(phones, userId, userRole);
      res.json(result);
    } catch (error) {
      console.error("Error bulk validating phones:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to validate phones" 
      });
    }
  });

  app.get('/api/whatsapp/validation-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { startDate, endDate } = req.query;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
      const end = endDate ? new Date(endDate as string) : new Date();

      const validations = await storage.getValidationsByDateRange(start, end);
      const costStats = await storage.getValidationCostsByUser(userId, start, end);
      
      res.json({
        validations,
        summary: costStats,
        dateRange: { start, end }
      });
    } catch (error) {
      console.error("Error fetching validation history:", error);
      res.status(500).json({ message: "Failed to fetch validation history" });
    }
  });

  app.post('/api/whatsapp/clear-expired-cache', isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.claims?.role || 'VENDEDOR';
      
      // Only allow admins to clear cache
      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const cleared = await storage.clearExpiredValidations();
      res.json({ 
        message: `Cleared ${cleared} expired validation entries`,
        cleared
      });
    } catch (error) {
      console.error("Error clearing expired cache:", error);
      res.status(500).json({ message: "Failed to clear expired cache" });
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
