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

export interface FamilyCircleMember {
  memberId: string;
  relationshipType: "spouse" | "child" | "parent" | "sibling" | "friend" | "other";
  addedAt: string;
  addedBy: string;
  memberName?: string;
  memberEmail?: string | null;
}

export interface FamilyCircleInfo {
  role: "holder" | "member" | null;
  members?: FamilyCircleMember[];
  totalMembers?: number;
  holderId?: string | null;
  relationshipType?: "spouse" | "child" | "parent" | "sibling" | "friend" | "other" | null;
  joinedAt?: string | null;
  message?: string;
}

export interface FamilyCircleConfig {
  allowMemberCredits: boolean;
  allowMemberDebits: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface Client {
  id: string;
  name: ClientName;
  email?: string | null;
  identity_document?: IdentityDocument | null;
  photoUrl?: string | null;
  phones?: Phone[];
  addresses?: Address[];
  affinityGroupIds?: string[];
  familyCircle?: FamilyCircleInfo | null;
  created_at: string;
  updated_at: string;
}
