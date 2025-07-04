import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import KanbanColumn from "./kanban-column";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@/types";

interface KanbanBoardProps {
  leads: Lead[];
}

const COLUMNS = [
  { id: "NOVO", title: "Novos", color: "bg-gray-50" },
  { id: "CONTATADO", title: "Contatados", color: "bg-blue-50" },
  { id: "INTERESSE", title: "Interesse", color: "bg-yellow-50" },
  { id: "PROPOSTA_ENVIADA", title: "Proposta", color: "bg-orange-50" },
  { id: "NEGOCIACAO", title: "Negociação", color: "bg-purple-50" },
  { id: "FECHADO_GANHO", title: "Fechado", color: "bg-green-50" },
  { id: "FECHADO_PERDIDO", title: "Perdido", color: "bg-red-50" },
];

export default function KanbanBoard({ leads }: KanbanBoardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      return await apiRequest("PUT", `/api/leads/${leadId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Sucesso",
        description: "Status do lead atualizado!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do lead.",
        variant: "destructive",
      });
    },
  });

  const handleDrop = (leadId: string, newStatus: string) => {
    updateLeadMutation.mutate({ leadId, status: newStatus });
  };

  // Group leads by status
  const leadsByStatus = leads.reduce((acc, lead) => {
    const status = lead.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(lead);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <div className="grid grid-cols-7 gap-4 overflow-x-auto min-h-96">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.id}
          title={column.title}
          status={column.id}
          color={column.color}
          leads={leadsByStatus[column.id] || []}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
