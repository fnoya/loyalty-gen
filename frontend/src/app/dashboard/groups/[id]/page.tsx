"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { AffinityGroup } from "@/types/loyalty";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const groupSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});

type GroupFormValues = z.infer<typeof groupSchema>;

export default function EditGroupPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [group, setGroup] = useState<AffinityGroup | null>(null);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<AffinityGroup>(`/groups/${id}`);
        setGroup(data);
        form.reset({
          name: data.name,
          description: data.description || "",
        });
      } catch (error) {
        console.error("Failed to fetch group", error);
        toast.error("Error al cargar el grupo");
        router.push("/dashboard/groups");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchGroup();
    }
  }, [id, form, router]);

  const onSubmit = async (data: GroupFormValues) => {
    try {
      setSaving(true);
      await apiRequest(`/groups/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast.success("Grupo actualizado correctamente");
      router.push("/dashboard/groups");
    } catch (error) {
      console.error("Failed to update group", error);
      toast.error("Error al actualizar el grupo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await apiRequest(`/groups/${id}`, { method: "DELETE" });
      toast.success("Grupo eliminado correctamente");
      router.push("/dashboard/groups");
    } catch (error) {
      console.error("Failed to delete group", error);
      toast.error("Error al eliminar el grupo");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  if (!group) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/groups">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Editar Grupo</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Grupo</CardTitle>
          <CardDescription>
            Modifica los detalles del grupo de afinidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Ej: Clientes VIP"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción opcional del grupo..."
                {...form.register("description")}
              />
            </div>

            <div className="flex justify-between pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={saving || deleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Grupo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. El grupo será eliminado
                      permanentemente.
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

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  disabled={saving || deleting}
                >
                  <Link href="/dashboard/groups">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={saving || deleting}>
                  {saving ? (
                    "Guardando..."
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
