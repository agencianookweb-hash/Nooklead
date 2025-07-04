export interface Company {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  setor?: string;
  size?: "MEI" | "ME" | "EPP" | "GRANDE";
  status?: "ATIVA" | "SUSPENSA" | "INAPTA" | "BAIXADA";
  faturamento?: number;
  email?: string;
  phone?: string;
  cidade?: string;
  uf?: string;
  numeroFuncionarios?: number;
}

export interface Lead {
  id: string;
  status: "NOVO" | "CONTATADO" | "INTERESSE" | "PROPOSTA_ENVIADA" | "NEGOCIACAO" | "FECHADO_GANHO" | "FECHADO_PERDIDO";
  source: "BUSCA_CNPJ" | "INDICACAO" | "INBOUND" | "EVENTO" | "CAMPANHA" | "OUTROS";
  priority: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
  estimatedValue?: number;
  closingDate?: string;
  notes?: string;
  tags?: string[];
  companyId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
}

export interface Sale {
  id: string;
  value: number;
  closingDate: string;
  status: "PENDENTE_APROVACAO" | "APROVADA" | "REJEITADA" | "EM_ANALISE";
  proofUrl?: string;
  proofType?: string;
  productService?: string;
  description?: string;
  points: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  leadId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lead?: Lead;
}

export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: "VENDEDOR" | "GESTOR" | "ADMIN" | "SUPER_ADMIN";
  totalPoints: number;
  monthlyPoints: number;
  monthlyGoal: number;
  teamId?: string;
  managerId?: string;
}

export interface DashboardStats {
  leadsGenerated: number;
  salesClosed: number;
  totalRevenue: number;
  conversionRate: number;
}

export interface TeamStats {
  activeMembers: number;
  totalRevenue: number;
  goalAttainment: number;
}

export interface CompanyFilters {
  setor?: string;
  size?: string;
  uf?: string;
  faturamento?: string;
  search?: string;
}
