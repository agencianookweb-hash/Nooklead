import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import StatsCards from "@/components/dashboard/stats-cards";
import ActivityFeed from "@/components/dashboard/activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats, TeamStats } from "@/types";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: teamStats } = useQuery<TeamStats>({
    queryKey: ["/api/dashboard/team-stats"],
    enabled: user?.role === "GESTOR" || user?.role === "ADMIN",
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {stats && <StatsCards stats={stats} />}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Performance Semanal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">
                  Gráfico de Performance (Integrar com biblioteca de charts)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Activity */}
        <ActivityFeed />
      </div>

      {/* Team Stats for Managers */}
      {teamStats && (user?.role === "GESTOR" || user?.role === "ADMIN") && (
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral da Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {teamStats.activeMembers}
                </p>
                <p className="text-sm text-gray-600">Vendedores Ativos</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  R$ {(teamStats.totalRevenue / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-gray-600">Receita Mensal</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">
                  {teamStats.goalAttainment}%
                </p>
                <p className="text-sm text-gray-600">Meta Atingida</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
