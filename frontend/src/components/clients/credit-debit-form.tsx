"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

const creditDebitSchema = z.object({
  amount: z.coerce.number().min(1, "La cantidad debe ser al menos 1 punto"),
  description: z.string().optional(),
});

type CreditDebitFormValues = z.infer<typeof creditDebitSchema>;

interface CreditDebitFormProps {
  clientId: string;
  accountId: string;
  type: "credit" | "debit";
  onSuccess?: () => void;
}

export function CreditDebitForm({
  clientId,
  accountId,
  type,
  onSuccess,
}: CreditDebitFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(creditDebitSchema),
  });

  const onSubmit = async (data: CreditDebitFormValues) => {
    try {
      setIsSubmitting(true);
      setApiError(null);

      await apiRequest(`/clients/${clientId}/accounts/${accountId}/${type}`, {
        method: "POST",
        body: JSON.stringify({
          amount: data.amount,
          description: data.description || undefined,
        }),
      });

      const successMessage =
        type === "credit"
          ? "Puntos acreditados exitosamente"
          : "Puntos debitados exitosamente";
      toast.success(successMessage);

      reset();
      onSuccess?.();
    } catch (err: unknown) {
      const errorMessage =
        (err instanceof Error ? err.message : null) ||
        `Error al ${type === "credit" ? "acreditar" : "debitar"} puntos`;

      // Handle insufficient balance error - check both code and message
      if (
        type === "debit" &&
        ((typeof err === "object" &&
          err !== null &&
          "code" in err &&
          err.code === "INSUFFICIENT_BALANCE") ||
          errorMessage.includes("Insufficient balance"))
      ) {
        // Don't log insufficient balance as an error - it's a handled, expected case
        setApiError(
          "El saldo de la cuenta es insuficiente para realizar el débito.",
        );
      } else {
        console.error(`Failed to ${type} points:`, err);
        setApiError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCredit = type === "credit";
  const buttonLabel = isCredit ? "Acreditar" : "Debitar";
  const buttonVariant = isCredit ? "default" : "secondary";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${type}-amount-${accountId}`}>
          Cantidad de Puntos *
        </Label>
        <Input
          id={`${type}-amount-${accountId}`}
          type="number"
          min="1"
          placeholder="Ingrese la cantidad"
          {...register("amount")}
          disabled={isSubmitting}
        />
        {errors.amount && (
          <p className="text-sm text-red-500">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${type}-description-${accountId}`}>
          Descripción (opcional)
        </Label>
        <Input
          id={`${type}-description-${accountId}`}
          type="text"
          placeholder="Motivo de la transacción"
          {...register("description")}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {apiError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-300 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error en la transacción</p>
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        </div>
      )}

      <Button
        type="submit"
        variant={buttonVariant}
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {buttonLabel}
      </Button>
    </form>
  );
}
