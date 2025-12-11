export interface ClientName {
  firstName: string;
  secondName?: string | null;
  firstLastName: string;
  secondLastName?: string | null;
}

export interface IdentityDocument {
  type: "cedula_identidad" | "pasaporte";
  number: string;
}

export interface Phone {
  type: "mobile" | "home" | "work" | "other";
  number: string;
  extension?: string | null;
  isPrimary: boolean;
}

export interface Address {
  type: "home" | "work" | "other";
  street: string;
  number: string;
  locality: string;
  state: string;
  country: string;
  postalCode?: string | null;
  notes?: string | null;
}

export interface Client {
  id: string;
  name: ClientName;
  email?: string | null;
  identity_document?: IdentityDocument | null;
  photoUrl?: string | null;
  phones?: Phone[];
  addresses?: Address[];
  created_at: string;
  updated_at: string;
}
