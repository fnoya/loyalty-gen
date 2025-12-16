"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Users, AlertCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupAssignment } from "@/components/clients/group-assignment";
import { apiRequest } from "@/lib/api";
import { Client } from "@/types/client";

export default function ClientGroupsPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      const clientData = await apiRequest<Client>(`/clients/${id}`);
      setClient(clientData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch client", err);
      setError("Error al cargar el cliente. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchClient();
    }
  }, [id, fetchClient]);

  const handleGroupsChange = (groupIds: string[]) => {
    setClient((prev) =>
      prev ? { ...prev, affinityGroupIds: groupIds } : prev,
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/clients/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Gestionar Grupos de Afinidad</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Grupos del Cliente
          </CardTitle>
          <CardDescription>
            Añade o remueve grupos de afinidad asociados al cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-52 w-full" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="space-y-2">
                <p>{error}</p>
                <Button variant="outline" size="sm" onClick={fetchClient}>
                  Reintentar
                </Button>
              </div>
            </div>
          ) : client ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-600">
                Cliente:{" "}
                <span className="font-semibold">
                  {client.name.firstName} {client.name.firstLastName}
                </span>
              </div>
              <GroupAssignment
                clientId={id}
                initialGroupIds={client.affinityGroupIds ?? []}
                onChange={handleGroupsChange}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-600">No se encontró el cliente.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
