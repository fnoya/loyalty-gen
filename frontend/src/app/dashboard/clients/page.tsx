"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, MoreHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/api";
import { Client } from "@/types/client";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { ClientSearch } from "@/components/clients/client-search";
import { toast } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 20;

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async (cursor?: string | null) => {
    try {
      if (!cursor) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
      });

      if (cursor) {
        params.append("next_cursor", cursor);
      }

      const data = await apiRequest(`/clients?${params.toString()}`);
      const newClients = data.data || [];

      if (cursor) {
        setClients((prev) => [...prev, ...newClients]);
      } else {
        setClients(newClients);
      }

      const newCursor = data.paging?.next_cursor;
      setNextCursor(newCursor);
      setHasMore(!!newCursor);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const searchClients = async (query: string) => {
    if (!query.trim()) {
      setSearchQuery("");
      setClients([]);
      setNextCursor(null);
      setHasMore(false);
      return;
    }

    try {
      setSearching(true);
      setSearchQuery(query);

      const params = new URLSearchParams({
        q: query,
        limit: PAGE_SIZE.toString(),
      });

      const data = await apiRequest(`/clients/search?${params.toString()}`);
      setClients(data.data || []);
      setNextCursor(null);
      setHasMore(false);
    } catch (error) {
      console.error("Failed to search clients:", error);
      toast.error("Error al buscar clientes");
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      await apiRequest(`/clients/${clientToDelete}`, { method: "DELETE" });
      setClients(clients.filter((c) => c.id !== clientToDelete));
      setClientToDelete(null);
      toast.success("El proceso de eliminación del cliente ha comenzado");
    } catch (error) {
      console.error("Failed to delete client:", error);
      toast.error("Error al eliminar el cliente");
    }
  };

  const handleSearch = useCallback((query: string) => {
    searchClients(query);
  }, []);

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchClients(nextCursor);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" /> Add Client
          </Link>
        </Button>
      </div>

      <div className="flex items-center py-4">
        <div className="w-full max-w-sm">
          <ClientSearch
            onSearch={handleSearch}
            placeholder="Buscar cliente por nombre, email o documento..."
          />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Document</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading || searching ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-10 w-10 rounded-full inline-block mr-2" />
                    <Skeleton className="h-4 w-32 inline-block" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-96 text-center">
                  <EmptyState
                    icon={Users}
                    title={
                      searchQuery
                        ? "No se encontraron clientes"
                        : "Aún no se han creado clientes"
                    }
                    description={
                      searchQuery
                        ? `No se encontraron clientes para "${searchQuery}"`
                        : "Comience creando un nuevo cliente."
                    }
                    actionLabel={
                      searchQuery ? undefined : "Crear Nuevo Cliente"
                    }
                    actionHref={
                      searchQuery ? undefined : "/dashboard/clients/new"
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                >
                  <TableCell className="font-medium flex items-center gap-3">
                    <ClientAvatar client={client} />
                    {client.name.firstName} {client.name.firstLastName}
                  </TableCell>
                  <TableCell>{client.email || "-"}</TableCell>
                  <TableCell>
                    {client.identity_document
                      ? `${client.identity_document.type === "cedula_identidad" ? "CI" : "Passport"} ${client.identity_document.number}`
                      : "-"}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/clients/${client.id}`}>
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/clients/${client.id}/edit`}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onSelect={() => setClientToDelete(client.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Cargando..." : "Ver más"}
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!clientToDelete}
        onOpenChange={(open) => !open && setClientToDelete(null)}
      >
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
  );
}
