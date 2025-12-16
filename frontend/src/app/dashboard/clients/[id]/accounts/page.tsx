"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateAccountForm } from "@/components/clients/create-account-form";

export default function ClientAccountsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const handleAccountCreated = () => {
    router.push(`/dashboard/clients/${id}`);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/clients/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Nueva Cuenta de Lealtad</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crear Cuenta</CardTitle>
          <CardDescription>
            Proporcione los detalles para crear una nueva cuenta de lealtad para
            este cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAccountForm clientId={id} onSuccess={handleAccountCreated} />
        </CardContent>
      </Card>
    </div>
  );
}
