import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Mail, Handshake } from "lucide-react";

const activities = [
  {
    icon: Plus,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    title: "Novo lead adicionado",
    subtitle: "Empresa ABC Ltda.",
    time: "2h",
  },
  {
    icon: Mail,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Email enviado",
    subtitle: "Campanha Q1 2024",
    time: "4h",
  },
  {
    icon: Handshake,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Venda fechada",
    subtitle: "R$ 25.000,00",
    time: "1d",
  },
];

export default function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${activity.iconBg} rounded-full flex items-center justify-center`}>
                <activity.icon className={`h-4 w-4 ${activity.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-500">{activity.subtitle}</p>
              </div>
              <span className="text-xs text-gray-400">{activity.time}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
