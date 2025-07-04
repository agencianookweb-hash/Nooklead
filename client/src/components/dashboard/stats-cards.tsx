import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, BarChart3, Percent, DollarSign } from "lucide-react";
import type { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Leads Gerados",
      value: stats.leadsGenerated.toLocaleString(),
      change: "+12% vs mês anterior",
      changeType: "positive" as const,
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Vendas Fechadas",
      value: stats.salesClosed.toLocaleString(),
      change: "+8% vs mês anterior",
      changeType: "positive" as const,
      icon: BarChart3,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Taxa Conversão",
      value: `${stats.conversionRate.toFixed(1)}%`,
      change: "-2% vs mês anterior",
      changeType: "negative" as const,
      icon: Percent,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Receita Total",
      value: `R$ ${(stats.totalRevenue / 1000).toFixed(0)}K`,
      change: "+15% vs mês anterior",
      changeType: "positive" as const,
      icon: DollarSign,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <div className="flex items-center mt-1">
                  {card.changeType === "positive" ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <p
                    className={`text-sm ${
                      card.changeType === "positive" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {card.change}
                  </p>
                </div>
              </div>
              <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
