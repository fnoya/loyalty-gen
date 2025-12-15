"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
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
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { AffinityGroup } from "@/types/loyalty";
import { CreateGroupForm } from "./create-group-form";

interface GroupAssignmentProps {
  clientId: string;
  initialGroupIds: string[];
  onChange?: (groupIds: string[]) => void;
}

export function GroupAssignment({
  clientId,
  initialGroupIds,
  onChange,
}: GroupAssignmentProps) {
  const [allGroups, setAllGroups] = useState<AffinityGroup[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>(initialGroupIds);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [addingGroupId, setAddingGroupId] = useState<string | null>(null);
  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null);
  const [confirmGroupId, setConfirmGroupId] = useState<string | null>(null);

  useEffect(() => {
    setAssignedIds(initialGroupIds);
  }, [initialGroupIds]);

  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      const groups = await apiRequest<AffinityGroup[]>("/groups");
      setAllGroups(groups);
    } catch (error) {
      console.error("Failed to load groups", error);
      toast.error("Error al cargar los grupos. Intenta nuevamente.");
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const assignedGroups = useMemo(
    () => allGroups.filter((group) => assignedIds.includes(group.id)),
    [allGroups, assignedIds],
  );

  const availableOptions: ComboboxOption[] = useMemo(
    () =>
      allGroups
        .filter((group) => !assignedIds.includes(group.id))
        .map((group) => ({
          value: group.id,
          label: group.name,
          description: group.description || undefined,
        })),
    [allGroups, assignedIds],
  );

  const handleAddGroup = async (option: ComboboxOption) => {
    try {
      setAddingGroupId(option.value);
      await apiRequest(`/groups/${option.value}/clients/${clientId}`, {
        method: "POST",
      });
      const updated = [...assignedIds, option.value];
      setAssignedIds(updated);
      toast.success("Grupo añadido correctamente");
      onChange?.(updated);
    } catch (error) {
      console.error("Failed to add group", error);
      toast.error("No se pudo añadir el grupo. Intenta nuevamente.");
    } finally {
      setAddingGroupId(null);
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    try {
      setRemovingGroupId(groupId);
      await apiRequest(`/groups/${groupId}/clients/${clientId}`, {
        method: "DELETE",
      });
      const updated = assignedIds.filter((id) => id !== groupId);
      setAssignedIds(updated);
      toast.success("Grupo removido correctamente");
      onChange?.(updated);
    } catch (error) {
      console.error("Failed to remove group", error);
      toast.error("No se pudo remover el grupo. Intenta nuevamente.");
    } finally {
      setRemovingGroupId(null);
      setConfirmGroupId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Grupos de Afinidad</span>
          <Badge variant="outline" className="text-xs">
            {assignedIds.length} asignado{assignedIds.length === 1 ? "" : "s"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingGroups ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" data-testid="assigned-groups">
              {assignedGroups.length === 0 ? (
                <p className="text-sm text-slate-600">
                  El cliente no pertenece a ningún grupo de afinidad.
                </p>
              ) : (
                assignedGroups.map((group) => (
                  <Badge
                    key={group.id}
                    variant="secondary"
                    className="flex items-center gap-2 text-sm"
                  >
                    <span>{group.name}</span>
                    <AlertDialog
                      open={confirmGroupId === group.id}
                      onOpenChange={(open) => !open && setConfirmGroupId(null)}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-slate-600 hover:text-red-600"
                          onClick={() => setConfirmGroupId(group.id)}
                          aria-label={`Remover ${group.name}`}
                        >
                          {removingGroupId === group.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Remover del grupo?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción removerá a este cliente del grupo &quot;
                            {group.name}&quot;. El cambio es inmediato y no se
                            podrá deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveGroup(group.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {removingGroupId === group.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </Badge>
                ))
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Plus className="h-4 w-4 text-blue-600" />
                  Añadir a un grupo
                </div>
                <CreateGroupForm onSuccess={fetchGroups} />
              </div>
              <Combobox
                options={availableOptions}
                placeholder="Selecciona un grupo"
                searchPlaceholder="Buscar grupo..."
                emptyMessage={
                  availableOptions.length === 0
                    ? "No hay grupos disponibles"
                    : "No se encontraron grupos"
                }
                disabled={availableOptions.length === 0}
                loading={addingGroupId !== null}
                onSelect={handleAddGroup}
              />
              {addingGroupId && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Loader2 className="h-3 w-3 animate-spin" /> Añadiendo
                  grupo...
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
