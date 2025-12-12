"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api";
import { AffinityGroup } from "@/types/loyalty";

interface AffinityGroupsSectionProps {
  clientId: string;
  groupIds?: string[];
}

export function AffinityGroupsSection({
  clientId,
  groupIds = [],
}: AffinityGroupsSectionProps) {
  const [groups, setGroups] = useState<AffinityGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all groups and filter by groupIds
      const allGroups = await apiRequest<AffinityGroup[]>("/groups");
      const clientGroups = allGroups.filter((g) => groupIds.includes(g.id));
      setGroups(clientGroups);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    } finally {
      setLoading(false);
    }
  }, [groupIds]);

  useEffect(() => {
    if (groupIds.length > 0) {
      fetchGroups();
    } else {
      setLoading(false);
    }
  }, [groupIds, fetchGroups]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Grupos de Afinidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Grupos de Afinidad</CardTitle>
            <CardDescription>
              Grupos a los que pertenece el cliente
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/clients/${clientId}/groups`}>
              <Plus className="h-4 w-4 mr-2" />
              Gestionar Grupos
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-slate-500">
            El cliente no pertenece a ningún grupo de afinidad.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <Badge key={group.id} variant="secondary" className="text-sm">
                {group.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
