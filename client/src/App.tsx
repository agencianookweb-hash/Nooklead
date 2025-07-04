import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import Leads from "@/pages/leads";
import Kanban from "@/pages/kanban";
import Sales from "@/pages/sales";
import Ranking from "@/pages/ranking";
import Team from "@/pages/team";
import Approvals from "@/pages/approvals";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <div className="min-h-screen bg-gray-50 flex">
            <Sidebar />
            <div className="flex-1 ml-64">
              <Header />
              <main className="p-6">
                <Route path="/" component={Dashboard} />
                <Route path="/manager-dashboard" component={ManagerDashboard} />
                <Route path="/leads" component={Leads} />
                <Route path="/kanban" component={Kanban} />
                <Route path="/sales" component={Sales} />
                <Route path="/ranking" component={Ranking} />
                <Route path="/team" component={Team} />
                <Route path="/approvals" component={Approvals} />
              </main>
            </div>
          </div>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
