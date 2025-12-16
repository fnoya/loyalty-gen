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

const PAGE_SIZE = 10;

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
      console.log("Fetching clients...", { cursor });
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

      const url = `/clients?${params.toString()}`;
      console.log("Requesting URL:", url);
      const data = await apiRequest(url);
      console.log("Clients fetched successfully:", { count: data.data?.length });
      const newClients = data.data || [];

      if (cursor) {
        setClients((prev) => [...prev, ...newClients]);
      } else {
        setClients(newClients);
      }

      const apiCursor = data.paging?.next_cursor;
      const totalResults = data.metadata?.total_results as number | undefined;
      const accumulated = cursor
        ? clients.length + newClients.length
        : newClients.length;

      // Prefer API cursor; fall back to total count if cursor missing
      const fallbackCursor =
        totalResults && totalResults > accumulated
          ? accumulated.toString()
          : null;

      const newCursor = apiCursor ?? fallbackCursor;
      setNextCursor(newCursor);
      setHasMore(!!newCursor);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const searchClients = async (query: string, cursor?: string | null) => {
    if (!query.trim()) {
      setSearchQuery("");
      setNextCursor(null);
      setHasMore(false);
      // Reset to initial list
      await fetchClients();
      return;
    }

    try {
      if (!cursor) {
        setSearching(true);
      } else {
        setLoadingMore(true);
      }
      setSearchQuery(query);

      const params = new URLSearchParams({
        q: query,
        limit: PAGE_SIZE.toString(),
      });

      if (cursor) {
        params.append("next_cursor", cursor);
      }

      const data = await apiRequest(`/clients/search?${params.toString()}`);
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
      console.error("Failed to search clients:", error);
      toast.error("Error al buscar clientes");
    } finally {
      setSearching(false);
      setLoadingMore(false);
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
      if (searchQuery) {
        searchClients(searchQuery, nextCursor);
      } else {
        fetchClients(nextCursor);
      }
    }
  };

  return (
    <div className="space-y-6 pb-24">
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
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <Button
            variant="secondary"
            className="shadow-xl rounded-full px-8 border"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Cargando..." : "Ver más clientes"}
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
