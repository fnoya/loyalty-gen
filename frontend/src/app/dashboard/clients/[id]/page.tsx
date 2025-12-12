"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Mail,
  CreditCard,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { Client } from "@/types/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientAuditHistory } from "@/components/clients/client-audit-history";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { AffinityGroupsSection } from "@/components/clients/affinity-groups-section";
import { AccountsSummary } from "@/components/clients/accounts-summary";
import { AccountCard } from "@/components/clients/account-card";
import { toast } from "@/components/ui/toast";
import { LoyaltyAccount } from "@/types/loyalty";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const fetchClientData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientData, accountsData] = await Promise.all([
        apiRequest<Client>(`/clients/${id}`),
        apiRequest<LoyaltyAccount[]>(`/clients/${id}/accounts`),
      ]);
      setClient(clientData);
      setAccounts(accountsData);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch client details",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id, fetchClientData]);

  const handleBalanceUpdate = async () => {
    // Refetch accounts to update balances
    try {
      const accountsData = await apiRequest<LoyaltyAccount[]>(
        `/clients/${id}/accounts`,
      );
      setAccounts(accountsData);
    } catch (err: unknown) {
      console.error(
        "Failed to refresh accounts:",
        err instanceof Error ? err.message : String(err),
      );
    }
    // Trigger re-fetch of balance summary
    setBalanceRefreshKey((prev) => prev + 1);
  };

  const toggleAccountExpanded = (accountId: string) => {
    setExpandedAccounts((prev) => {
      const updated = new Set(prev);
      if (updated.has(accountId)) {
        updated.delete(accountId);
      } else {
        updated.add(accountId);
      }
      return updated;
    });
  };

  const handleDelete = async () => {
    try {
      await apiRequest(`/clients/${id}`, { method: "DELETE" });
      toast.success("El proceso de eliminación del cliente ha comenzado");
      router.push("/dashboard/clients");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete client");
      toast.error("Error al eliminar el cliente");
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading client details...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Error: {error}
        <br />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.back()}
        >
          Go Back
        </Button>
      </div>
    );
  }

  if (!client) {
    return <div className="p-8 text-center">Client not found</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <ClientAvatar client={client} className="h-16 w-16 text-xl" />
          <h1 className="text-3xl font-bold tracking-tight">
            {client.name.firstName} {client.name.firstLastName}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/clients/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción es irreversible. Se eliminarán todos los datos del
                  cliente, incluyendo sus cuentas de lealtad y transacciones.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Información Personal</TabsTrigger>
          <TabsTrigger value="loyalty">Cuentas de Lealtad</TabsTrigger>
          <TabsTrigger value="audit">Historial de Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-slate-500">Full Name</div>
                  <div className="col-span-2">
                    {client.name.firstName} {client.name.secondName}{" "}
                    {client.name.firstLastName} {client.name.secondLastName}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-slate-500 flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </div>
                  <div className="col-span-2">{client.email || "-"}</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-slate-500 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Document
                  </div>
                  <div className="col-span-2">
                    {client.identity_document
                      ? `${client.identity_document.type === "cedula_identidad" ? "CI" : "Passport"} ${client.identity_document.number}`
                      : "-"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Phone Numbers
                  </h3>
                  {client.phones && client.phones.length > 0 ? (
                    <ul className="space-y-2">
                      {client.phones.map((phone, index) => (
                        <li
                          key={index}
                          className="text-sm flex items-center gap-2"
                        >
                          <span className="capitalize text-slate-500 w-16">
                            {phone.type}:
                          </span>
                          <span>{phone.number}</span>
                          {phone.extension && (
                            <span className="text-slate-400">
                              (ext. {phone.extension})
                            </span>
                          )}
                          {phone.isPrimary && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No phone numbers recorded.
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Addresses
                  </h3>
                  {client.addresses && client.addresses.length > 0 ? (
                    <ul className="space-y-4">
                      {client.addresses.map((addr, index) => (
                        <li
                          key={index}
                          className="text-sm border-l-2 border-slate-200 pl-3"
                        >
                          <div className="font-medium capitalize text-slate-600 mb-1">
                            {addr.type}
                          </div>
                          <div>
                            {addr.street} {addr.number}
                          </div>
                          <div>
                            {addr.locality}, {addr.state}
                          </div>
                          <div>
                            {addr.country}{" "}
                            {addr.postalCode && `(${addr.postalCode})`}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No addresses recorded.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Affinity Groups Section */}
          <AffinityGroupsSection
            clientId={id}
            groupIds={[]} // TODO: Add affinityGroupIds to Client type
          />
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-6 mt-6">
          {/* Accounts Summary with Manage Button */}
          <div
            key={balanceRefreshKey}
            className="flex items-start justify-between gap-4"
          >
            <div className="flex-1">
              <AccountsSummary clientId={id} onAccountClick={toggleAccountExpanded} />
            </div>
            <Button asChild variant="outline" className="mt-1">
              <Link href={`/dashboard/clients/${id}/accounts`}>
                <Plus className="h-4 w-4 mr-2" />
                Gestionar Cuentas
              </Link>
            </Button>
          </div>

          {/* Individual Account Cards - Only render when expanded */}
          <div className="space-y-6">
            {Array.isArray(accounts) &&
              accounts.length > 0 &&
              accounts.map((account) =>
                expandedAccounts.has(account.id) ? (
                  <AccountCard
                    key={account.id}
                    clientId={id}
                    accountId={account.id}
                    accountName={account.account_name}
                    currentBalance={account.points}
                    onBalanceUpdate={handleBalanceUpdate}
                  />
                ) : null
              )}
            {(!Array.isArray(accounts) || accounts.length === 0) && (
              <p className="text-sm text-slate-500">
                No hay cuentas de lealtad para este cliente.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <ClientAuditHistory clientId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
