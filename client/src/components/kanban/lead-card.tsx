import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Lead } from "@/types";

interface LeadCardProps {
  lead: Lead;
}

export default function LeadCard({ lead }: LeadCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", lead.id);
  };

  const getValueColor = (value?: number) => {
    if (!value) return "bg-gray-100 text-gray-800";
    if (value >= 100000) return "bg-red-100 text-red-800";
    if (value >= 50000) return "bg-purple-100 text-purple-800";
    if (value >= 20000) return "bg-blue-100 text-blue-800";
    return "bg-green-100 text-green-800";
  };

  const formatValue = (value?: number) => {
    if (!value) return "N/A";
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
    return `R$ ${value.toLocaleString()}`;
  };

  const timeAgo = formatDistanceToNow(new Date(lead.createdAt), {
    addSuffix: false,
    locale: ptBR,
  });

  return (
    <div
      className="bg-white p-3 rounded-lg shadow-sm cursor-pointer hover:scale-105 transition-transform duration-200"
      draggable
      onDragStart={handleDragStart}
    >
      <h5 className="font-medium text-gray-900 text-sm mb-1">
        {lead.company?.nomeFantasia || lead.company?.razaoSocial || "Empresa"}
      </h5>
      <p className="text-xs text-gray-600 mb-2">
        {lead.company?.setor || "Setor"} • {lead.company?.size || "Porte"}
      </p>
      <div className="flex items-center justify-between">
        <Badge className={`text-xs ${getValueColor(lead.estimatedValue)}`}>
          {formatValue(lead.estimatedValue)}
        </Badge>
        <span className="text-xs text-gray-500">{timeAgo}</span>
      </div>
    </div>
  );
}
