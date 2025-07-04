import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Users, 
  TrendingUp, 
  Target, 
  DollarSign,
  Award,
  Calendar,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

// Mock data for demonstration
const teamPerformance = [
  { name: "Ana Nascimento", sales: 15, revenue: 285600, goal: 300000, efficiency: 95.2 },
  { name: "Maria Paula", sales: 12, revenue: 234000, goal: 250000, efficiency: 93.6 },
  { name: "Roberto Silva", sales: 10, revenue: 218000, goal: 250000, efficiency: 87.2 },
  { name: "João Silva", sales: 8, revenue: 187500, goal: 200000, efficiency: 93.8 },
  { name: "Carlos Ferreira", sales: 7, revenue: 162000, goal: 200000, efficiency: 81.0 },
];

const monthlyTrends = [
  { month: "Jul", leads: 120, sales: 28, revenue: 560000 },
  { month: "Ago", leads: 135, sales: 32, revenue: 640000 },
  { month: "Set", leads: 148, sales: 35, revenue: 700000 },
  { month: "Out", leads: 162, sales: 38, revenue: 760000 },
  { month: "Nov", leads: 175, sales: 42, revenue: 840000 },
  { month: "Dez", leads: 188, sales: 45, revenue: 900000 },
];

const statusDistribution = [
  { name: "Novo", value: 32, color: "#3b82f6" },
  { name: "Contatado", value: 28, color: "#f59e0b" },
  { name: "Interesse", value: 18, color: "#10b981" },
  { name: "Proposta", value: 12, color: "#8b5cf6" },
  { name: "Negociação", value: 8, color: "#f97316" },
  { name: "Fechado", value: 15, color: "#059669" },
];

const sourceDistribution = [
  { name: "CNPJ Search", value: 45, color: "#3b82f6" },
  { name: "Indicação", value: 25, color: "#10b981" },
  { name: "Inbound", value: 15, color: "#f59e0b" },
  { name: "Eventos", value: 10, color: "#8b5cf6" },
  { name: "Outros", value: 5, color: "#6b7280" },
];

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  const { data: teamStats } = useQuery({
    queryKey: ["/api/manager/team-stats", selectedPeriod],
    retry: false,
  });

  // Check if user has manager privileges
  if (!user || !["GESTOR", "ADMIN", "SUPER_ADMIN"].includes((user as any).role)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-gray-500">Acesso restrito a gestores e administradores</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Gerencial</h1>
          <p className="text-gray-600">Visão completa da performance da equipe</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="1y">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vendedores Ativos</p>
                <p className="text-2xl font-bold">12</p>
                <div className="flex items-center mt-1">
                  <ChevronUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+2 este mês</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Meta Coletiva</p>
                <p className="text-2xl font-bold">87%</p>
                <div className="flex items-center mt-1">
                  <ChevronUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+5% vs mês anterior</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold">R$ 2,1M</p>
                <div className="flex items-center mt-1">
                  <ChevronUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+12% vs mês anterior</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversão Média</p>
                <p className="text-2xl font-bold">23.8%</p>
                <div className="flex items-center mt-1">
                  <ChevronDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">-1.2% vs mês anterior</span>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList>
          <TabsTrigger value="team">Performance da Equipe</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="sources">Fontes de Lead</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          {/* Team Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Individual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Vendedor</th>
                      <th className="text-center p-3">Vendas</th>
                      <th className="text-center p-3">Receita</th>
                      <th className="text-center p-3">Meta</th>
                      <th className="text-center p-3">Atingimento</th>
                      <th className="text-center p-3">Eficiência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPerformance.map((member, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <span className="font-medium">{member.name}</span>
                          </div>
                        </td>
                        <td className="text-center p-3">
                          <Badge variant="secondary">{member.sales}</Badge>
                        </td>
                        <td className="text-center p-3">
                          R$ {member.revenue.toLocaleString()}
                        </td>
                        <td className="text-center p-3">
                          R$ {member.goal.toLocaleString()}
                        </td>
                        <td className="text-center p-3">
                          <div className="space-y-1">
                            <Progress 
                              value={(member.revenue / member.goal) * 100} 
                              className="h-2 w-16 mx-auto"
                            />
                            <span className="text-sm text-gray-600">
                              {((member.revenue / member.goal) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-center p-3">
                          <Badge 
                            variant={member.efficiency >= 90 ? "default" : "secondary"}
                          >
                            {member.efficiency}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Monthly Trends Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Vendas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receita Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`R$ ${value.toLocaleString()}`, "Receita"]}
                    />
                    <Bar dataKey="revenue" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Geração de Leads vs Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Leads Gerados"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Vendas Fechadas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição do Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {statusDistribution.map((status, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="font-medium">{status.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{status.value}</div>
                        <div className="text-sm text-gray-600">leads</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fontes de Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {sourceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {sourceDistribution.map((source, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: source.color }}
                        />
                        <span className="font-medium">{source.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{source.value}%</div>
                        <div className="text-sm text-gray-600">do total</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance por Fonte</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sourceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, "Participação"]} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}