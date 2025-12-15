"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FamilyMemberBadge } from "./family-member-badge";
import { AddFamilyMemberDialog } from "./add-family-member-dialog";
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { MoreVertical, Plus, Users, Loader2, ArrowRight } from "lucide-react";
import type {
  FamilyCircleInfo,
  FamilyCircleMember,
  Client,
} from "@/types/client";

interface FamilyCircleCardProps {
  clientId: string;
  familyCircle: FamilyCircleInfo | null | undefined;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const relationshipTypeLabels: Record<string, string> = {
  spouse: "Cónyuge",
  child: "Hijo/a",
  parent: "Padre/Madre",
  sibling: "Hermano/a",
  friend: "Amigo/a",
  other: "Otro",
};

export function FamilyCircleCard({
  clientId,
  familyCircle,
  isLoading = false,
  onRefresh,
}: FamilyCircleCardProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] =
    useState<FamilyCircleMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [loadingNames, setLoadingNames] = useState(false);

  // Fetch member names from client data (only if not already provided)
  useEffect(() => {
    const fetchMemberNames = async () => {
      const members = familyCircle?.members;
      if (!members || members.length === 0) {
        return;
      }

      setLoadingNames(true);
      try {
        const names: Record<string, string> = {};

        // Fetch member data only if memberName is not already provided
        const memberPromises = members
          .filter((m) => !m.memberName)
          .map(async (member) => {
            try {
              const memberClient = await apiRequest<Client>(
                `/clients/${member.memberId}`,
              );
              names[member.memberId] =
                `${memberClient.name.firstName} ${memberClient.name.firstLastName}`;
            } catch (error) {
              console.error(
                `Failed to fetch member ${member.memberId}:`,
                error,
              );
              names[member.memberId] = member.memberId; // Fallback to ID
            }
          });

        await Promise.all(memberPromises);

        // Also add already-provided names
        members.forEach((member) => {
          if (member.memberName) {
            names[member.memberId] = member.memberName;
          }
        });

        setMemberNames(names);
      } catch (error) {
        console.error("Failed to fetch member names:", error);
      } finally {
        setLoadingNames(false);
      }
    };

    fetchMemberNames();
  }, [familyCircle?.members]);

  const handleRemoveMember = useCallback(
    async (member: FamilyCircleMember) => {
      try {
        setIsRemovingMember(true);
        await apiRequest(
          `/clients/${clientId}/family-circle/members/${member.memberId}`,
          {
            method: "DELETE",
          },
        );

        toast.success("Miembro removido del círculo exitosamente");

        setMemberToRemove(null);
        onRefresh?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al remover miembro",
        );
      } finally {
        setIsRemovingMember(false);
      }
    },
    [clientId, onRefresh],
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No circle
  if (!familyCircle || familyCircle.role === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Círculo Familiar
          </CardTitle>
          <CardDescription>
            Este cliente no pertenece a ningún círculo familiar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Círculo
          </Button>
        </CardContent>

        <AddFamilyMemberDialog
          clientId={clientId}
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onMemberAdded={onRefresh}
        />
      </Card>
    );
  }

  // Holder view
  if (familyCircle.role === "holder") {
    const members = familyCircle.members || [];
    const existingMemberIds = members.map((m) => m.memberId);

    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Círculo Familiar
                </CardTitle>
                <CardDescription>
                  Titular del círculo • {familyCircle.totalMembers || 0}{" "}
                  {(familyCircle.totalMembers || 0) === 1
                    ? "miembro"
                    : "miembros"}
                </CardDescription>
              </div>
              <Badge>Titular del Círculo</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                <p className="text-slate-600">No hay miembros en el círculo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member, index) => {
                  // Use memberName from data first, then from memberNames state (for fetched names)
                  const displayName =
                    member.memberName ||
                    memberNames[member.memberId] ||
                    member.memberId;
                  const enrichedMember = {
                    ...member,
                    memberName: displayName,
                  };
                  return (
                    <div key={member.memberId}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <FamilyMemberBadge member={enrichedMember} />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/dashboard/clients/${member.memberId}`}
                              >
                                Ver Cliente
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setMemberToRemove(member)}
                            >
                              Remover del Círculo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {index < members.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir Miembro
            </Button>
          </CardContent>
        </Card>

        <AddFamilyMemberDialog
          clientId={clientId}
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          existingMemberIds={existingMemberIds}
          onMemberAdded={onRefresh}
        />

        <AlertDialog open={!!memberToRemove} onOpenChange={() => {}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Remover miembro del círculo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción removerá a{" "}
                {memberToRemove?.memberName || memberToRemove?.memberId} del
                círculo familiar. El miembro perderá acceso a realizar
                transacciones en las cuentas del titular.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setMemberToRemove(null)}
                disabled={isRemovingMember}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() =>
                  memberToRemove && handleRemoveMember(memberToRemove)
                }
                disabled={isRemovingMember}
              >
                {isRemovingMember && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Member view
  if (familyCircle.role === "member") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Círculo Familiar
              </CardTitle>
              <CardDescription>
                Miembro del círculo •{" "}
                {relationshipTypeLabels[
                  familyCircle.relationshipType || "other"
                ] || familyCircle.relationshipType}
              </CardDescription>
            </div>
            <Badge variant="secondary">Miembro de Círculo</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">Titular del círculo</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {familyCircle.holderId || "Titular"}
                </p>
                {familyCircle.joinedAt && (
                  <p className="text-xs text-slate-500">
                    Miembro desde{" "}
                    {new Date(familyCircle.joinedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              {familyCircle.holderId && (
                <Link href={`/dashboard/clients/${familyCircle.holderId}`}>
                  <Button variant="ghost" size="sm">
                    Ver Perfil
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
