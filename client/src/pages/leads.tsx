import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import FiltersPanel from "@/components/leads/filters-panel";
import CompanyCard from "@/components/leads/company-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Company, CompanyFilters } from "@/types";

export default function Leads() {
  const [filters, setFilters] = useState<CompanyFilters>({});
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies/search", filters],
    retry: false,
  });

  const createLeadMutation = useMutation({
    mutationFn: async (companyId: string) => {
      return await apiRequest("POST", "/api/leads", {
        companyId,
        estimatedValue: 25000,
        priority: "MEDIA",
        source: "BUSCA_CNPJ",
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Lead adicionado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao adicionar lead. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map(c => c.id));
    }
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleAddLead = (companyId: string) => {
    createLeadMutation.mutate(companyId);
  };

  return (
    <div className="space-y-6">
      <Header title="Gerar Leads" />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <FiltersPanel filters={filters} onFiltersChange={setFilters} />
        
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Empresas Encontradas</CardTitle>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {companies.length} resultados
                  </span>
                  <Button
                    onClick={handleSelectAll}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    {selectedCompanies.length === companies.length ? "Desselecionar" : "Selecionar"} Todos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-4 h-4 bg-gray-200 rounded"></div>
                          <div>
                            <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                          </div>
                        </div>
                        <div className="h-8 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhuma empresa encontrada com os filtros aplicados.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {companies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      isSelected={selectedCompanies.includes(company.id)}
                      onSelect={() => handleSelectCompany(company.id)}
                      onAddLead={() => handleAddLead(company.id)}
                      isAddingLead={createLeadMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
