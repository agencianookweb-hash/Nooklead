import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Leaderboard from "@/components/ranking/leaderboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Target, Rocket } from "lucide-react";

const achievements = [
  {
    icon: Star,
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    title: "Primeira Venda",
    description: "Fechou seu primeiro negócio!",
    unlocked: true,
  },
  {
    icon: Trophy,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    title: "10 Leads Gerados",
    description: "Prospecção ativa!",
    unlocked: true,
  },
  {
    icon: Rocket,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Meta Mensal",
    description: "Atingiu a meta do mês!",
    unlocked: true,
  },
];

export default function Ranking() {
  const { data: rankings = [], isLoading } = useQuery({
    queryKey: ["/api/rankings"],
    retry: false,
  });

  return (
    <div className="space-y-6">
      <Header title="Ranking e Gamificação" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Leaderboard rankings={rankings} isLoading={isLoading} />
        </div>
        
        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Suas Conquistas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {achievements.map((achievement, index) => (
                <div key={index} className={`flex items-center space-x-3 p-3 ${achievement.iconBg} rounded-lg`}>
                  <div className={`w-12 h-12 ${achievement.iconBg} rounded-full flex items-center justify-center`}>
                    <achievement.icon className={`h-6 w-6 ${achievement.iconColor}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{achievement.title}</p>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Próximas Conquistas</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">25 Vendas</span>
                  <span className="text-sm text-blue-600">12/25</span>
                </div>
                <Progress value={48} className="w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
