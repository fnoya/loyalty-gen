"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { clientSchema, ClientFormValues } from "@/schemas/client";
import { apiRequest } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { toast } from "@/components/ui/toast";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: {
        firstName: "",
        secondName: "",
        firstLastName: "",
        secondLastName: "",
      },
      email: "",
      identity_document: {
        type: "cedula_identidad",
        number: "",
      },
      phones: [],
      addresses: [],
    },
  });

  const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({
    control: form.control,
    name: "phones",
  });

  const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
    control: form.control,
    name: "addresses",
  });

  const onSubmit = async (data: ClientFormValues) => {
    setLoading(true);
    setError("");
    try {
      // Clean up empty optional fields
      if (!data.email) delete data.email;
      if (!data.identity_document?.number) delete data.identity_document;
      
      const newClient = await apiRequest("/clients", {
        method: "POST",
        body: JSON.stringify(data),
      });

      // If photo selected, upload it
      if (photoFile && newClient.id) {
        try {
          const token = await auth.currentUser?.getIdToken();
          const formData = new FormData();
          formData.append("photo", photoFile);

          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${newClient.id}/photo`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            console.error("Failed to upload photo for new client");
            // We don't block the success flow, but maybe log it
          }
        } catch (photoErr) {
          console.error("Error uploading photo:", photoErr);
        }
      }

      toast.success("Cliente creado exitosamente");
      router.push("/dashboard/clients");
    } catch (err: any) {
      setError(err.message || "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotoFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Client</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>Upload a profile picture for the new client.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="photo">Picture</Label>
              <Input 
                id="photo" 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoSelect}
              />
              {photoFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {photoFile.name}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic details about the client.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input {...form.register("name.firstName")} id="firstName" />
              {form.formState.errors.name?.firstName && (
                <p className="text-sm text-red-500">{form.formState.errors.name.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondName">Second Name</Label>
              <Input {...form.register("name.secondName")} id="secondName" />
              {form.formState.errors.name?.secondName && (
                <p className="text-sm text-red-500">{form.formState.errors.name.secondName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstLastName">First Last Name *</Label>
              <Input {...form.register("name.firstLastName")} id="firstLastName" />
              {form.formState.errors.name?.firstLastName && (
                <p className="text-sm text-red-500">{form.formState.errors.name.firstLastName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondLastName">Second Last Name</Label>
              <Input {...form.register("name.secondLastName")} id="secondLastName" />
              {form.formState.errors.name?.secondLastName && (
                <p className="text-sm text-red-500">{form.formState.errors.name.secondLastName.message}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input {...form.register("email")} id="email" type="email" />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity Document</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                onValueChange={(value: any) => form.setValue("identity_document.type", value)}
                defaultValue={form.getValues("identity_document.type")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cedula_identidad">Cédula de Identidad</SelectItem>
                  <SelectItem value="pasaporte">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="docNumber">Number</Label>
              <Input {...form.register("identity_document.number")} id="docNumber" />
              {form.formState.errors.identity_document?.number && (
                <p className="text-sm text-red-500">{form.formState.errors.identity_document.number.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Phone Numbers</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendPhone({ type: "mobile", number: "", isPrimary: false })}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Phone
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {phoneFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-4 p-4 border rounded-md">
                <div className="grid gap-4 flex-1 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      onValueChange={(value: any) => form.setValue(`phones.${index}.type`, value)}
                      defaultValue={field.type}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Number</Label>
                    <Input {...form.register(`phones.${index}.number`)} placeholder="+1234567890" />
                    {form.formState.errors.phones?.[index]?.number && (
                      <p className="text-sm text-red-500">{form.formState.errors.phones[index]?.number?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Extension</Label>
                    <Input {...form.register(`phones.${index}.extension`)} placeholder="123" />
                  </div>
                </div>
                <div className="pt-8">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePhone(index)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !form.formState.isValid}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Creating..." : "Create Client"}
          </Button>
        </div>
      </form>
    </div>
  );
}
