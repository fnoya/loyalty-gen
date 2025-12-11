"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientSchema, ClientFormValues } from "@/schemas/client";
import { apiRequest } from "@/lib/api";
import { Client } from "@/types/client";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { auth } from "@/lib/firebase";
import { toast } from "@/components/ui/toast";

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [client, setClient] = useState<Client | null>(null);

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

  useEffect(() => {
    if (id) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const clientData: Client = await apiRequest(`/clients/${id}`);
      setClient(clientData);
      
      // Transform client data to form values
      form.reset({
        name: {
          firstName: clientData.name.firstName,
          secondName: clientData.name.secondName || "",
          firstLastName: clientData.name.firstLastName,
          secondLastName: clientData.name.secondLastName || "",
        },
        email: clientData.email || "",
        identity_document: clientData.identity_document || { type: "cedula_identidad", number: "" },
        phones: clientData.phones || [],
        addresses: clientData.addresses || [],
      });
    } catch (err: any) {
      setError(err.message || "Failed to fetch client details");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploading(true);
    setError("");

    try {
      const token = await auth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/${id}/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to upload photo");
      }

      const updatedClient = await response.json();
      setClient(updatedClient);
      toast.success("Foto actualizada exitosamente");
      // Force refresh of the page/image might be needed if URL is same but content changed
      // But usually URL changes or we rely on cache busting. 
      // For now, just updating client state should update the avatar if URL changed.
    } catch (err: any) {
      setError(err.message || "Failed to upload photo");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const onSubmit = async (data: ClientFormValues) => {
    setSaving(true);
    setError("");
    try {
      // Clean up empty optional fields
      if (!data.email) delete data.email;
      if (!data.identity_document?.number) delete data.identity_document;
      
      await apiRequest(`/clients/${id}`, {
        method: "PUT", // or PATCH depending on API
        body: JSON.stringify(data),
      });
      toast.success("Cliente actualizado exitosamente");
      router.push(`/dashboard/clients/${id}`);
    } catch (err: any) {
      setError(err.message || "Failed to update client");
      toast.error("Error al actualizar el cliente");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading client details...</div>;
  }

  if (error && !saving) { // Show error only if not saving (to avoid hiding form on save error)
     // If it's a fetch error, we might want to show it differently than a save error
     // But for simplicity:
     if (!form.formState.isDirty) {
        return (
            <div className="p-8 text-center text-red-500">
                Error: {error}
                <br />
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                Go Back
                </Button>
            </div>
        );
     }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/clients/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Client</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {error && saving === false && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>Upload a profile picture for the client.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            {client && (
              <ClientAvatar 
                client={client} 
                className="h-24 w-24 text-2xl" 
              />
            )}
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="photo">Picture</Label>
              <div className="flex gap-2">
                <Input 
                  id="photo" 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
                {uploading && <div className="flex items-center text-sm text-muted-foreground">Uploading...</div>}
              </div>
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
                value={form.watch("identity_document.type")}
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
                <div className="grid gap-4 flex-1 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      onValueChange={(value: any) => form.setValue(`phones.${index}.type`, value)}
                      defaultValue={field.type}
                      value={form.watch(`phones.${index}.type`)}
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
                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox
                      id={`phones.${index}.isPrimary`}
                      checked={form.watch(`phones.${index}.isPrimary`)}
                      onCheckedChange={(checked) => form.setValue(`phones.${index}.isPrimary`, checked as boolean)}
                    />
                    <Label htmlFor={`phones.${index}.isPrimary`}>Primary</Label>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Addresses</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendAddress({
                type: "home",
                street: "",
                number: "",
                locality: "",
                state: "",
                country: "US",
                postalCode: "",
                notes: "",
                isPrimary: false
              })}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Address
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {addressFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-4 p-4 border rounded-md">
                <div className="grid gap-4 flex-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      onValueChange={(value: any) => form.setValue(`addresses.${index}.type`, value)}
                      defaultValue={field.type}
                      value={form.watch(`addresses.${index}.type`)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input {...form.register(`addresses.${index}.country`)} placeholder="US" />
                    {form.formState.errors.addresses?.[index]?.country && (
                      <p className="text-sm text-red-500">{form.formState.errors.addresses[index]?.country?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Street</Label>
                    <Input {...form.register(`addresses.${index}.street`)} placeholder="Main St" />
                    {form.formState.errors.addresses?.[index]?.street && (
                      <p className="text-sm text-red-500">{form.formState.errors.addresses[index]?.street?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Number</Label>
                    <Input {...form.register(`addresses.${index}.number`)} placeholder="123" />
                    {form.formState.errors.addresses?.[index]?.number && (
                      <p className="text-sm text-red-500">{form.formState.errors.addresses[index]?.number?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Locality</Label>
                    <Input {...form.register(`addresses.${index}.locality`)} placeholder="City" />
                    {form.formState.errors.addresses?.[index]?.locality && (
                      <p className="text-sm text-red-500">{form.formState.errors.addresses[index]?.locality?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input {...form.register(`addresses.${index}.state`)} placeholder="State" />
                    {form.formState.errors.addresses?.[index]?.state && (
                      <p className="text-sm text-red-500">{form.formState.errors.addresses[index]?.state?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input {...form.register(`addresses.${index}.postalCode`)} placeholder="12345" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input {...form.register(`addresses.${index}.notes`)} placeholder="Additional info" />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox
                      id={`addresses.${index}.isPrimary`}
                      checked={form.watch(`addresses.${index}.isPrimary`)}
                      onCheckedChange={(checked) => form.setValue(`addresses.${index}.isPrimary`, checked as boolean)}
                    />
                    <Label htmlFor={`addresses.${index}.isPrimary`}>Primary Address</Label>
                  </div>
                </div>
                <div className="pt-8">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeAddress(index)}>
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
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
