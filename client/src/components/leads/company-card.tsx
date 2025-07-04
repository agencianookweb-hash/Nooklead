import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Company } from "@/types";

interface CompanyCardProps {
  company: Company;
  isSelected: boolean;
  onSelect: () => void;
  onAddLead: () => void;
  isAddingLead?: boolean;
}

export default function CompanyCard({ 
  company, 
  isSelected, 
  onSelect, 
  onAddLead, 
  isAddingLead 
}: CompanyCardProps) {
  const getSizeColor = (size?: string) => {
    switch (size) {
      case "MEI": return "bg-gray-100 text-gray-800";
      case "ME": return "bg-blue-100 text-blue-800";
      case "EPP": return "bg-green-100 text-green-800";
      case "GRANDE": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSectorColor = (setor?: string) => {
    switch (setor) {
      case "Tecnologia": return "bg-blue-100 text-blue-800";
      case "Consultoria": return "bg-purple-100 text-purple-800";
      case "E-commerce": return "bg-orange-100 text-orange-800";
      case "Varejo": return "bg-green-100 text-green-800";
      case "Serviços": return "bg-amber-100 text-amber-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatRevenue = (faturamento?: number) => {
    if (!faturamento) return "N/A";
    if (faturamento >= 1000000) return `~R$ ${(faturamento / 1000000).toFixed(1)}M/ano`;
    if (faturamento >= 1000) return `~R$ ${(faturamento / 1000).toFixed(0)}K/ano`;
    return `~R$ ${faturamento.toLocaleString()}/ano`;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
          <div>
            <h4 className="font-medium text-gray-900">
              {company.nomeFantasia || company.razaoSocial}
            </h4>
            <p className="text-sm text-gray-600">CNPJ: {company.cnpj}</p>
            <div className="flex items-center space-x-2 mt-2">
              {company.setor && (
                <Badge className={`text-xs ${getSectorColor(company.setor)}`}>
                  {company.setor}
                </Badge>
              )}
              {company.size && (
                <Badge className={`text-xs ${getSizeColor(company.size)}`}>
                  {company.size}
                </Badge>
              )}
              {company.cidade && company.uf && (
                <span className="text-xs text-gray-500">
                  {company.cidade}, {company.uf}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            {formatRevenue(company.faturamento)}
          </p>
          {company.numeroFuncionarios && (
            <p className="text-sm text-gray-600">
              {company.numeroFuncionarios} funcionários
            </p>
          )}
          <Button
            onClick={onAddLead}
            disabled={isAddingLead}
            size="sm"
            className="mt-2"
          >
            {isAddingLead ? "Adicionando..." : "Adicionar Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}
