import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
            CRM CNPJ
          </CardTitle>
          <p className="text-gray-600">Sistema de Geração de Leads</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Bem-vindo ao Sistema
            </h2>
            <p className="text-gray-600 mb-6">
              Faça login para acessar sua plataforma de geração de leads e gestão de vendas.
            </p>
            <Button 
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
            >
              Entrar no Sistema
            </Button>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Funcionalidades Principais
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                Geração de leads via CNPJ
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                Pipeline visual de vendas
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-purple-600 rounded-full mr-2"></div>
                Sistema de gamificação
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-amber-600 rounded-full mr-2"></div>
                Dashboards executivos
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
