import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Search,
  Columns,
  DollarSign,
  Trophy,
  Users,
  CheckCircle,
  LogOut,
  BarChart3,
  Settings,
  Send,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Gerar Leads", href: "/leads", icon: Search },
  { name: "Pipeline", href: "/kanban", icon: Columns },
  { name: "Campanhas", href: "/campaigns", icon: Send },
  { name: "Vendas", href: "/sales", icon: DollarSign },
  { name: "Ranking", href: "/ranking", icon: Trophy },
];

const managerNavigation = [
  { name: "Dashboard Gerencial", href: "/manager-dashboard", icon: BarChart3 },
  { name: "Equipe", href: "/team", icon: Users },
  { name: "Aprovações", href: "/approvals", icon: CheckCircle, badge: 3 },
  { name: "Configuração Inicial", href: "/onboarding", icon: Settings },
];

export default function Sidebar() {
  const { user } = useAuth();
  const typedUser = user as User | undefined;
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const isManager = typedUser?.role === "GESTOR" || typedUser?.role === "ADMIN";

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-40">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">CRM CNPJ</h1>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={typedUser?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-blue-600 text-white">
                {getInitials(typedUser?.firstName || undefined, typedUser?.lastName || undefined)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900">
                {typedUser?.firstName} {typedUser?.lastName}
              </p>
              <p className="text-sm text-gray-500">
                {typedUser?.role === "VENDEDOR" && "Vendedor"}
                {typedUser?.role === "GESTOR" && "Gestor"}
                {typedUser?.role === "ADMIN" && "Administrador"}
              </p>
            </div>
          </div>

          {/* Gamification Stats */}
          <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Pontos</span>
              <span className="text-lg font-bold text-amber-600">
                {typedUser?.totalPoints || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Ranking</span>
              <span className="text-sm font-bold text-green-600">#3</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start",
                    isActive && "bg-blue-50 text-blue-700 hover:bg-blue-50"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Button>
              </Link>
            );
          })}

          {isManager && (
            <div className="pt-4">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Gestão
              </h3>
              {managerNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        isActive && "bg-blue-50 text-blue-700 hover:bg-blue-50"
                      )}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                      {item.badge && (
                        <Badge variant="destructive" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
