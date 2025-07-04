import { Badge } from "@/components/ui/badge";
import LeadCard from "./lead-card";
import type { Lead } from "@/types";

interface KanbanColumnProps {
  title: string;
  status: string;
  color: string;
  leads: Lead[];
  onDrop: (leadId: string, newStatus: string) => void;
}

export default function KanbanColumn({ title, status, color, leads, onDrop }: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    onDrop(leadId, status);
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case "NOVO": return "bg-gray-200 text-gray-700";
      case "CONTATADO": return "bg-blue-200 text-blue-700";
      case "INTERESSE": return "bg-yellow-200 text-yellow-700";
      case "PROPOSTA_ENVIADA": return "bg-orange-200 text-orange-700";
      case "NEGOCIACAO": return "bg-purple-200 text-purple-700";
      case "FECHADO_GANHO": return "bg-green-200 text-green-700";
      case "FECHADO_PERDIDO": return "bg-red-200 text-red-700";
      default: return "bg-gray-200 text-gray-700";
    }
  };

  return (
    <div 
      className={`${color} rounded-lg p-4 min-h-96`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <Badge className={`${getBadgeColor(status)} text-xs px-2 py-1`}>
          {leads.length}
        </Badge>
      </div>
      
      <div className="space-y-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}
