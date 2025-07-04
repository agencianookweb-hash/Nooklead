import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw } from "lucide-react";
import type { CompanyFilters } from "@/types";

interface FiltersPanelProps {
  filters: CompanyFilters;
  onFiltersChange: (filters: CompanyFilters) => void;
}

export default function FiltersPanel({ filters, onFiltersChange }: FiltersPanelProps) {
  const handleFilterChange = (key: keyof CompanyFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros de Busca</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="setor">CNAE/Setor</Label>
          <Select value={filters.setor || "all"} onValueChange={(value) => handleFilterChange("setor", value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              <SelectItem value="Tecnologia">Tecnologia</SelectItem>
              <SelectItem value="Varejo">Varejo</SelectItem>
              <SelectItem value="Serviços">Serviços</SelectItem>
              <SelectItem value="Indústria">Indústria</SelectItem>
              <SelectItem value="Consultoria">Consultoria</SelectItem>
              <SelectItem value="E-commerce">E-commerce</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="size">Porte</Label>
          <Select value={filters.size || "all"} onValueChange={(value) => handleFilterChange("size", value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os portes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os portes</SelectItem>
              <SelectItem value="MEI">MEI</SelectItem>
              <SelectItem value="ME">ME - Microempresa</SelectItem>
              <SelectItem value="EPP">EPP - Pequeno Porte</SelectItem>
              <SelectItem value="GRANDE">Grande Empresa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="uf">Estado</Label>
          <Select value={filters.uf || "all"} onValueChange={(value) => handleFilterChange("uf", value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              <SelectItem value="SP">São Paulo</SelectItem>
              <SelectItem value="RJ">Rio de Janeiro</SelectItem>
              <SelectItem value="MG">Minas Gerais</SelectItem>
              <SelectItem value="PR">Paraná</SelectItem>
              <SelectItem value="RS">Rio Grande do Sul</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="faturamento">Faturamento</Label>
          <Select value={filters.faturamento || "all"} onValueChange={(value) => handleFilterChange("faturamento", value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Qualquer faturamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer faturamento</SelectItem>
              <SelectItem value="100k">Até R$ 100K</SelectItem>
              <SelectItem value="500k">R$ 100K - R$ 500K</SelectItem>
              <SelectItem value="2m">R$ 500K - R$ 2M</SelectItem>
              <SelectItem value="2m+">Acima de R$ 2M</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Button className="w-full" size="sm">
            <Search className="mr-2 h-4 w-4" />
            Buscar Empresas
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            onClick={handleClearFilters}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
