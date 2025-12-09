import {
  clientNameSchema,
  identityDocumentSchema,
  phoneSchema,
  addressSchema,
  createClientRequestSchema,
  updateClientRequestSchema,
} from "./client.schema";
import { createGroupRequestSchema } from "./group.schema";
import { createAccountRequestSchema, creditDebitRequestSchema } from "./account.schema";

describe("Client Schemas", () => {
  describe("clientNameSchema", () => {
    it("should validate a complete name", () => {
      const validName = {
        firstName: "Francisco",
        secondName: "José",
        firstLastName: "Noya",
        secondLastName: "García",
      };
      expect(() => clientNameSchema.parse(validName)).not.toThrow();
    });

    it("should validate a name with only required fields", () => {
      const minimalName = {
        firstName: "Francisco",
        firstLastName: "Noya",
      };
      expect(() => clientNameSchema.parse(minimalName)).not.toThrow();
    });

    it("should reject invalid characters in name", () => {
      const invalidName = {
        firstName: "Francisco123",
        firstLastName: "Noya",
      };
      expect(() => clientNameSchema.parse(invalidName)).toThrow();
    });

    it("should accept Spanish characters", () => {
      const spanishName = {
        firstName: "José",
        firstLastName: "Pérez-O'Connor",
      };
      expect(() => clientNameSchema.parse(spanishName)).not.toThrow();
    });
  });

  describe("identityDocumentSchema", () => {
    it("should validate cedula_identidad", () => {
      const doc = {
        type: "cedula_identidad",
        number: "12345678",
      };
      expect(() => identityDocumentSchema.parse(doc)).not.toThrow();
    });

    it("should validate pasaporte with alphanumeric", () => {
      const doc = {
        type: "pasaporte",
        number: "ABC123456",
      };
      expect(() => identityDocumentSchema.parse(doc)).not.toThrow();
    });

    it("should reject invalid document type", () => {
      const doc = {
        type: "dni",
        number: "12345678",
      };
      expect(() => identityDocumentSchema.parse(doc)).toThrow();
    });

    it("should reject non-alphanumeric document number", () => {
      const doc = {
        type: "cedula_identidad",
        number: "1234-5678",
      };
      expect(() => identityDocumentSchema.parse(doc)).toThrow();
    });
  });

  describe("phoneSchema", () => {
    it("should validate a complete phone", () => {
      const phone = {
        type: "mobile",
        number: "+598 99 123 456",
        extension: "101",
        isPrimary: true,
      };
      expect(() => phoneSchema.parse(phone)).not.toThrow();
    });

    it("should validate a phone without extension", () => {
      const phone = {
        type: "home",
        number: "099123456",
        isPrimary: false,
      };
      expect(() => phoneSchema.parse(phone)).not.toThrow();
    });

    it("should reject invalid phone type", () => {
      const phone = {
        type: "fax",
        number: "099123456",
        isPrimary: false,
      };
      expect(() => phoneSchema.parse(phone)).toThrow();
    });
  });

  describe("addressSchema", () => {
    it("should validate a complete address", () => {
      const address = {
        type: "home",
        street: "Avenida Italia",
        buildingBlock: "Torre A",
        number: "1234",
        apartment: "501",
        locality: "Montevideo",
        state: "Montevideo",
        postalCode: "11300",
        country: "UY",
        isPrimary: true,
      };
      expect(() => addressSchema.parse(address)).not.toThrow();
    });

    it("should validate an address with only required fields", () => {
      const address = {
        type: "work",
        street: "Calle Principal",
        number: "100",
        locality: "Ciudad",
        state: "Departamento",
        postalCode: "12345",
        country: "UY",
        isPrimary: false,
      };
      expect(() => addressSchema.parse(address)).not.toThrow();
    });

    it("should reject invalid country code", () => {
      const address = {
        type: "home",
        street: "Main St",
        number: "123",
        locality: "City",
        state: "State",
        postalCode: "12345",
        country: "USA",
        isPrimary: true,
      };
      expect(() => addressSchema.parse(address)).toThrow();
    });

    it("should reject lowercase country code", () => {
      const address = {
        type: "home",
        street: "Main St",
        number: "123",
        locality: "City",
        state: "State",
        postalCode: "12345",
        country: "uy",
        isPrimary: true,
      };
      expect(() => addressSchema.parse(address)).toThrow();
    });
  });

  describe("createClientRequestSchema", () => {
    it("should validate request with email", () => {
      const request = {
        name: {
          firstName: "Francisco",
          firstLastName: "Noya",
        },
        email: "francisco@example.com",
      };
      expect(() => createClientRequestSchema.parse(request)).not.toThrow();
    });

    it("should validate request with identity document", () => {
      const request = {
        name: {
          firstName: "Francisco",
          firstLastName: "Noya",
        },
        identity_document: {
          type: "cedula_identidad",
          number: "12345678",
        },
      };
      expect(() => createClientRequestSchema.parse(request)).not.toThrow();
    });

    it("should validate request with both email and document", () => {
      const request = {
        name: {
          firstName: "Francisco",
          firstLastName: "Noya",
        },
        email: "francisco@example.com",
        identity_document: {
          type: "cedula_identidad",
          number: "12345678",
        },
      };
      expect(() => createClientRequestSchema.parse(request)).not.toThrow();
    });

    it("should reject request without identifiers", () => {
      const request = {
        name: {
          firstName: "Francisco",
          firstLastName: "Noya",
        },
      };
      expect(() => createClientRequestSchema.parse(request)).toThrow();
    });

    it("should reject multiple primary phones", () => {
      const request = {
        name: {
          firstName: "Francisco",
          firstLastName: "Noya",
        },
        email: "francisco@example.com",
        phones: [
          { type: "mobile", number: "099111111", isPrimary: true },
          { type: "home", number: "099222222", isPrimary: true },
        ],
      };
      expect(() => createClientRequestSchema.parse(request)).toThrow();
    });

    it("should reject multiple primary addresses", () => {
      const request = {
        name: {
          firstName: "Francisco",
          firstLastName: "Noya",
        },
        email: "francisco@example.com",
        addresses: [
          {
            type: "home",
            street: "Street 1",
            number: "123",
            locality: "City",
            state: "State",
            postalCode: "12345",
            country: "UY",
            isPrimary: true,
          },
          {
            type: "work",
            street: "Street 2",
            number: "456",
            locality: "City",
            state: "State",
            postalCode: "67890",
            country: "UY",
            isPrimary: true,
          },
        ],
      };
      expect(() => createClientRequestSchema.parse(request)).toThrow();
    });

    it("should allow single primary phone and address", () => {
      const request = {
        name: {
          firstName: "Francisco",
          firstLastName: "Noya",
        },
        email: "francisco@example.com",
        phones: [
          { type: "mobile", number: "099111111", isPrimary: true },
          { type: "home", number: "099222222", isPrimary: false },
        ],
        addresses: [
          {
            type: "home",
            street: "Street 1",
            number: "123",
            locality: "City",
            state: "State",
            postalCode: "12345",
            country: "UY",
            isPrimary: true,
          },
          {
            type: "work",
            street: "Street 2",
            number: "456",
            locality: "City",
            state: "State",
            postalCode: "67890",
            country: "UY",
            isPrimary: false,
          },
        ],
      };
      expect(() => createClientRequestSchema.parse(request)).not.toThrow();
    });
  });

  describe("updateClientRequestSchema", () => {
    it("should validate update with name only", () => {
      const request = {
        name: {
          firstName: "Francisco José",
          firstLastName: "Noya García",
        },
      };
      expect(() => updateClientRequestSchema.parse(request)).not.toThrow();
    });

    it("should validate update with photoUrl null to remove", () => {
      const request = {
        photoUrl: null,
      };
      expect(() => updateClientRequestSchema.parse(request)).not.toThrow();
    });

    it("should validate update with multiple fields", () => {
      const request = {
        name: {
          firstName: "Francisco",
          firstLastName: "Noya",
        },
        phones: [
          { type: "mobile", number: "099123456", isPrimary: true },
        ],
        extra_data: { note: "VIP client" },
      };
      expect(() => updateClientRequestSchema.parse(request)).not.toThrow();
    });
  });
});

describe("Group Schemas", () => {
  describe("createGroupRequestSchema", () => {
    it("should validate group with name and description", () => {
      const request = {
        name: "VIP Customers",
        description: "High value customers",
      };
      expect(() => createGroupRequestSchema.parse(request)).not.toThrow();
    });

    it("should validate group with name only", () => {
      const request = {
        name: "Regular Customers",
      };
      expect(() => createGroupRequestSchema.parse(request)).not.toThrow();
    });

    it("should reject empty name", () => {
      const request = {
        name: "",
      };
      expect(() => createGroupRequestSchema.parse(request)).toThrow();
    });
  });
});

describe("Account Schemas", () => {
  describe("createAccountRequestSchema", () => {
    it("should validate account creation", () => {
      const request = {
        account_name: "Main Rewards Account",
      };
      expect(() => createAccountRequestSchema.parse(request)).not.toThrow();
    });

    it("should reject empty account name", () => {
      const request = {
        account_name: "",
      };
      expect(() => createAccountRequestSchema.parse(request)).toThrow();
    });
  });

  describe("creditDebitRequestSchema", () => {
    it("should validate credit with amount and description", () => {
      const request = {
        amount: 100,
        description: "Purchase reward",
      };
      expect(() => creditDebitRequestSchema.parse(request)).not.toThrow();
    });

    it("should validate credit with amount only", () => {
      const request = {
        amount: 50,
      };
      expect(() => creditDebitRequestSchema.parse(request)).not.toThrow();
    });

    it("should reject zero amount", () => {
      const request = {
        amount: 0,
      };
      expect(() => creditDebitRequestSchema.parse(request)).toThrow();
    });

    it("should reject negative amount", () => {
      const request = {
        amount: -10,
      };
      expect(() => creditDebitRequestSchema.parse(request)).toThrow();
    });

    it("should reject decimal amount", () => {
      const request = {
        amount: 10.5,
      };
      expect(() => creditDebitRequestSchema.parse(request)).toThrow();
    });
  });
});
