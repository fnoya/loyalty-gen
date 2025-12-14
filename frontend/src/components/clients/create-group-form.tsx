"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api";
import { Loader2, Plus } from "lucide-react";

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

interface CreateGroupFormProps {
  onSuccess?: (group: { id: string; name: string; description?: string }) => void;
}

export function CreateGroupForm({ onSuccess }: CreateGroupFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = "El nombre es requerido";
    } else if (name.length > 100) {
      newErrors.name = "El nombre no puede exceder 100 caracteres";
    }

    if (description.length > 500) {
      newErrors.description = "La descripción no puede exceder 500 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setIsLoading(true);
      const newGroup = await apiRequest("/groups", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          ...(description.trim() && { description: description.trim() }),
        }),
      });

      toast.success(`Grupo "${newGroup.name}" creado exitosamente`);

      // Reset form
      setName("");
      setDescription("");
      setErrors({});
      setOpen(false);
      onSuccess?.(newGroup);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo crear el grupo"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Crear nuevo grupo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear nuevo grupo de afinidad</DialogTitle>
            <DialogDescription>
              Define el nombre y la descripción del nuevo grupo de afinidad.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Nombre del grupo *</Label>
              <Input
                id="group-name"
                placeholder="Ej: Clientes VIP"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Descripción</Label>
              <Textarea
                id="group-description"
                placeholder="Describe el propósito de este grupo..."
                className="resize-none"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-slate-600">
                Opcional. Máximo 500 caracteres. ({description.length}/500)
              </p>
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear grupo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
