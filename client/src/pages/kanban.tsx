import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import KanbanBoard from "@/components/kanban/kanban-board";
import { Button } from "@/components/ui/button";
import { Plus, Filter, ArrowUpDown } from "lucide-react";
import type { Lead } from "@/types";

export default function Kanban() {
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    retry: false,
  });

  return (
    <div className="space-y-6">
      <Header title="Pipeline de Vendas" />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Pipeline de Vendas</h3>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </Button>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Ordenar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 min-h-96 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="bg-white p-3 rounded-lg">
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard leads={leads} />
      )}
    </div>
  );
}
