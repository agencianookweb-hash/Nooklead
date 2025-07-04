import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  UserPlus, 
  Target, 
  Gift, 
  BarChart3, 
  TrendingUp, 
  Crown,
  CheckCircle,
  MessageCircle,
  Clock
} from "lucide-react";
import type { TeamStats, User } from "@/types";

// Mock team data for demonstration
const mockTeamMembers = [
  {
    id: "1",
    firstName: "Ana",
    lastName: "Nascimento",
    email: "ana@empresa.com",
    role: "VENDEDOR" as const,
    totalPoints: 2856,
    monthlyPoints: 856,
    monthlyGoal: 70000,
    profileImageUrl: null,
    performance: {
      revenue: 85400,
      goal: 70000,
      conversionRate: 12.5,
      leadsGenerated: 45,
      salesClosed: 15,
      rank: 1
    }
  },
  {
    id: "2", 
    firstName: "João",
    lastName: "Silva",
    email: "joao@empresa.com",
    role: "VENDEDOR" as const,
    totalPoints: 1875,
    monthlyPoints: 475,
    monthlyGoal: 50000,
    profileImageUrl: null,
    performance: {
      revenue: 45200,
      goal: 50000,
      conversionRate: 8.3,
      leadsGenerated: 32,
      salesClosed: 8,
      rank: 4
    }
  },
  {
    id: "3",
    firstName: "Carlos", 
    lastName: "Ferreira",
    email: "carlos@empresa.com",
    role: "VENDEDOR" as const,
    totalPoints: 1620,
    monthlyPoints: 320,
    monthlyGoal: 40000,
    profileImageUrl: null,
    performance: {
      revenue: 28800,
      goal: 40000,
      conversionRate: 6.8,
      leadsGenerated: 28,
      salesClosed: 7,
      rank: 5
    }
  }
];

const recentActivities = [
  {
    icon: CheckCircle,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    user: "Ana",
    action: "fechou venda de R$ 25K",
    time: "2 horas atrás"
  },
  {
    icon: UserPlus,
    iconBg: "bg-blue-100", 
    iconColor: "text-blue-600",
    user: "Sistema",
    action: "Novo lead atribuído para João",
    time: "4 horas atrás"
  },
  {
    icon: Crown,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600", 
    user: "Carlos",
    action: "atingiu 50% da meta",
    time: "1 dia atrás"
  }
];

export default function Team() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to home if not authenticated or not a manager
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role === "VENDEDOR")) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user?.role, toast]);

  const { data: teamStats } = useQuery<TeamStats>({
    queryKey: ["/api/dashboard/team-stats"],
    enabled: user?.role === "GESTOR" || user?.role === "ADMIN",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 100) return "text-green-600";
    if (percentage >= 80) return "text-amber-600";
    return "text-red-600";
  };

  const getGoalProgress = (revenue: number, goal: number) => {
    return Math.min((revenue / goal) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="Gestão de Equipe" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Gestão de Equipe" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Team Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral da Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {teamStats?.activeMembers || mockTeamMembers.length}
                  </p>
                  <p className="text-sm text-gray-600">Vendedores Ativos</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    R$ {teamStats ? (teamStats.totalRevenue / 1000).toFixed(0) : "425"}K
                  </p>
                  <p className="text-sm text-gray-600">Receita Mensal</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">
                    {teamStats?.goalAttainment || 87}%
                  </p>
                  <p className="text-sm text-gray-600">Meta Atingida</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Team Members Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Individual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTeamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={member.profileImageUrl} />
                          <AvatarFallback className={`${
                            member.performance.rank === 1 ? 'bg-yellow-400' : 'bg-blue-600'
                          } text-white font-bold`}>
                            {getInitials(member.firstName, member.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        {member.performance.rank === 1 && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <Crown className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {member.role === "VENDEDOR" && "Vendedor"} • {member.performance.leadsGenerated} leads • {member.performance.salesClosed} vendas
                        </p>
                        <div className="mt-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs text-gray-500">Meta:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getGoalProgress(member.performance.revenue, member.performance.goal)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">
                              {Math.round((member.performance.revenue / member.performance.goal) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        R$ {member.performance.revenue.toLocaleString()} / R$ {member.performance.goal.toLocaleString()}
                      </p>
                      <p className={`text-sm font-medium ${getPerformanceColor((member.performance.revenue / member.performance.goal) * 100)}`}>
                        {Math.round((member.performance.revenue / member.performance.goal) * 100)}% da meta
                      </p>
                      <div className="flex items-center justify-end space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          #{member.performance.rank}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {member.totalPoints} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Team Actions and Activities */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button className="w-full justify-center bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Vendedor
                </Button>
                
                <Button className="w-full justify-center bg-green-600 hover:bg-green-700">
                  <Target className="mr-2 h-4 w-4" />
                  Definir Metas
                </Button>
                
                <Button className="w-full justify-center bg-purple-600 hover:bg-purple-700">
                  <Gift className="mr-2 h-4 w-4" />
                  Configurar Prêmios
                </Button>
                
                <Button className="w-full justify-center bg-gray-600 hover:bg-gray-700">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Relatório Completo
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 text-sm">
                    <div className={`w-8 h-8 ${activity.iconBg} rounded-full flex items-center justify-center`}>
                      <activity.icon className={`h-4 w-4 ${activity.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900">
                        <span className="font-medium">{activity.user}</span> {activity.action}
                      </p>
                      <p className="text-gray-500 text-xs">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
