"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateGroupForm } from "@/components/clients/create-group-form";
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { AffinityGroup } from "@/types/loyalty";
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

export default function GroupsManagementPage() {
  const [groups, setGroups] = useState<AffinityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<AffinityGroup[]>("/groups");
      setGroups(data);
    } catch (error) {
      console.error("Failed to fetch groups", error);
      toast.error("Error al cargar los grupos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleDeleteGroup = async (groupId: string) => {
    try {
      setDeletingId(groupId);
      await apiRequest(`/groups/${groupId}`, { method: "DELETE" });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      toast.success("Grupo eliminado correctamente");
    } catch (error) {
      console.error("Failed to delete group", error);
      toast.error("No se pudo eliminar el grupo. Intenta nuevamente.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Grupos</h1>
          <p className="text-slate-600 mt-1">
            Administra los grupos de afinidad de tu plataforma.
          </p>
        </div>
        <CreateGroupForm onSuccess={fetchGroups} />
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600 mb-4">
              No hay grupos de afinidad creados aún.
            </p>
            <CreateGroupForm onSuccess={fetchGroups} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Card key={group.id} className="hover:bg-slate-50 transition">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription className="mt-2">
                        {group.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>ID: {group.id}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" asChild className="gap-1">
                      <Link href={`/dashboard/groups/${group.id}`}>
                        <Settings className="h-4 w-4" />
                        Configurar
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingId === group.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Eliminando...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará el grupo &quot;{group.name}&quot;
                            permanentemente. Se removerán todas las asociaciones
                            de clientes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteGroup(group.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
