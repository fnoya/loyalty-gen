"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ClientSearchCombobox } from "./client-search-combobox";
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import type { Client } from "@/types/client";

interface AddFamilyMemberDialogProps {
  clientId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  existingMemberIds?: string[];
  onMemberAdded?: () => void;
}

const relationshipTypeLabels: Record<string, string> = {
  spouse: "Cónyuge",
  child: "Hijo/a",
  parent: "Padre/Madre",
  sibling: "Hermano/a",
  friend: "Amigo/a",
  other: "Otro",
};

export function AddFamilyMemberDialog({
  clientId,
  isOpen,
  onOpenChange,
  existingMemberIds = [],
  onMemberAdded,
}: AddFamilyMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberId, setMemberId] = useState<string>("");
  const [relationshipType, setRelationshipType] = useState<string>("child");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberId) {
      toast.error("Debe seleccionar un cliente");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiRequest(`/clients/${clientId}/family-circle/members`, {
        method: "POST",
        body: JSON.stringify({
          memberId,
          relationshipType,
        }),
      });

      toast.success("Miembro añadido al círculo exitosamente");

      setMemberId("");
      setRelationshipType("child");
      onOpenChange(false);
      onMemberAdded?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al añadir miembro";

      if (message.includes("MEMBER_ALREADY_IN_CIRCLE")) {
        toast.error("Este cliente ya pertenece a otro círculo familiar");
      } else if (message.includes("CANNOT_ADD_SELF")) {
        toast.error("No puedes añadirte a ti mismo al círculo");
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Miembro al Círculo Familiar</DialogTitle>
          <DialogDescription>
            Selecciona un cliente para añadirlo como miembro del círculo
            familiar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-select">Seleccionar Cliente</Label>
            <ClientSearchCombobox
              excludeIds={[clientId, ...existingMemberIds]}
              onSelect={(id) => setMemberId(id)}
              placeholder="Buscar cliente por nombre o email..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship-type">Tipo de Relación</Label>
            <Select
              value={relationshipType}
              onValueChange={setRelationshipType}
            >
              <SelectTrigger id="relationship-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(relationshipTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Añadir
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
