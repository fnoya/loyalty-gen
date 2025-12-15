"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import type { FamilyCircleConfig } from "@/types/client";

interface AccountFamilyConfigProps {
  clientId: string;
  accountId: string;
  accountName: string;
}

export function AccountFamilyConfig({
  clientId,
  accountId,
  accountName,
}: AccountFamilyConfigProps) {
  const [config, setConfig] = useState<FamilyCircleConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [clientId, accountId]);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<FamilyCircleConfig>(
        `/clients/${clientId}/accounts/${accountId}/family-circle-config`,
      );
      setConfig(data);
    } catch (error) {
      console.error("Error fetching family circle config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (
    field: "allowMemberCredits" | "allowMemberDebits",
    newValue: boolean,
  ) => {
    if (!config) return;

    const previousValue = config[field];
    const updatedConfig = { ...config, [field]: newValue };
    setConfig(updatedConfig);

    try {
      setIsUpdating(true);
      await apiRequest(
        `/clients/${clientId}/accounts/${accountId}/family-circle-config`,
        {
          method: "PATCH",
          body: JSON.stringify({
            [field]: newValue,
          }),
        },
      );

      toast.success("Permisos actualizados exitosamente");
    } catch (error) {
      // Rollback on error
      setConfig((prev) => (prev ? { ...prev, [field]: previousValue } : null));

      toast.error(
        error instanceof Error ? error.message : "Error al actualizar permisos",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permisos de Círculo Familiar</CardTitle>
        <CardDescription>
          Controla qué operaciones pueden realizar los miembros del círculo en{" "}
          {accountName}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="allow-credits" className="font-medium cursor-pointer">
            Permitir créditos de miembros
          </Label>
          <Switch
            id="allow-credits"
            checked={config.allowMemberCredits}
            onCheckedChange={(checked) =>
              handleToggle("allowMemberCredits", checked)
            }
            disabled={isUpdating}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="allow-debits" className="font-medium cursor-pointer">
            Permitir débitos de miembros
          </Label>
          <Switch
            id="allow-debits"
            checked={config.allowMemberDebits}
            onCheckedChange={(checked) =>
              handleToggle("allowMemberDebits", checked)
            }
            disabled={isUpdating}
          />
        </div>

        <p className="text-xs text-slate-500 pt-2">
          Última actualización:{" "}
          {new Date(config.updatedAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
