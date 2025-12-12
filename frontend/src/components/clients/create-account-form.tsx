"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

const createAccountSchema = z.object({
  account_name: z
    .string()
    .min(1, "El nombre de la cuenta es requerido")
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
});

type CreateAccountFormValues = z.infer<typeof createAccountSchema>;

interface CreateAccountFormProps {
  clientId: string;
  onSuccess?: () => void;
}

export function CreateAccountForm({ clientId, onSuccess }: CreateAccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateAccountFormValues>({
    resolver: zodResolver(createAccountSchema),
  });

  const onSubmit = async (data: CreateAccountFormValues) => {
    try {
      setIsSubmitting(true);

      await apiRequest(`/clients/${clientId}/accounts`, {
        method: "POST",
        body: JSON.stringify({
          account_name: data.account_name,
        }),
      });

      toast.success("Cuenta de lealtad creada exitosamente");
      reset();
      onSuccess?.();
    } catch (err: any) {
      console.error("Failed to create account:", err);
      toast.error(err.message || "Error al crear la cuenta de lealtad");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="account_name">Nombre de la Cuenta *</Label>
        <Input
          id="account_name"
          type="text"
          placeholder="ej: Mi Programa Principal"
          {...register("account_name")}
          disabled={isSubmitting}
        />
        {errors.account_name && (
          <p className="text-sm text-red-500">{errors.account_name.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Crear Cuenta
      </Button>
    </form>
  );
}
