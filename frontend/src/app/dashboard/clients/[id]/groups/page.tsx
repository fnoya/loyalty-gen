"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClientGroupsPage() {
  const params = useParams();
  const id = params.id as string;

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
            Esta página será implementada en HU9. Por ahora es un marcador de
            posición para las pruebas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Cliente: <span className="font-medium">{id}</span>
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Próximamente: asignar y remover grupos de afinidad.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
