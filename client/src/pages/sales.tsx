import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import SalesForm from "@/components/sales/sales-form";
import SalesTable from "@/components/sales/sales-table";
import type { Sale } from "@/types";

export default function Sales() {
  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
    retry: false,
  });

  return (
    <div className="space-y-6">
      <Header title="Registrar Vendas" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SalesForm />
        <div className="lg:col-span-2">
          <SalesTable sales={sales} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
