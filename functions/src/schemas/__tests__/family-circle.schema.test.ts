import {
  relationshipTypeSchema,
  transactionOriginatorSchema,
  familyCircleMemberSchema,
  familyCircleInfoSchema,
  addFamilyCircleMemberRequestSchema,
  getFamilyCircleResponseSchema,
  getFamilyCircleMembersResponseSchema,
  updateFamilyCircleConfigRequestSchema,
  familyCircleConfigResponseSchema,
  type RelationshipType,
  type TransactionOriginator,
  type FamilyCircleMember,
  type FamilyCircleInfo,
  type AddFamilyCircleMemberRequest,
  type GetFamilyCircleResponse,
  type GetFamilyCircleMembersResponse,
  type UpdateFamilyCircleConfigRequest,
  type FamilyCircleConfigResponse,
} from "../family-circle.schema";

describe("Family Circle Schemas", () => {
  describe("relationshipTypeSchema", () => {
    it("should accept valid relationship types", () => {
      const validTypes: RelationshipType[] = [
        "spouse",
        "child",
        "parent",
        "sibling",
        "friend",
        "other",
      ];
      validTypes.forEach((type) => {
        const result = relationshipTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid relationship types", () => {
      const result = relationshipTypeSchema.safeParse("invalid");
      expect(result.success).toBe(false);
    });
  });

  describe("transactionOriginatorSchema", () => {
    it("should accept valid transaction originator", () => {
      const originator: TransactionOriginator = {
        clientId: "client-123",
        isCircleMember: true,
        relationshipType: "child",
      };
      const result = transactionOriginatorSchema.safeParse(originator);
      expect(result.success).toBe(true);
    });

    it("should accept null originator", () => {
      const result = transactionOriginatorSchema.safeParse(null);
      expect(result.success).toBe(true);
    });

    it("should reject invalid client ID", () => {
      const originator = {
        clientId: "",
        isCircleMember: true,
      };
      const result = transactionOriginatorSchema.safeParse(originator);
      expect(result.success).toBe(false);
    });
  });

  describe("familyCircleMemberSchema", () => {
    it("should accept valid family circle member", () => {
      const now = new Date();
      const member: FamilyCircleMember = {
        memberId: "member-123",
        relationshipType: "child",
        addedAt: now,
        addedBy: "admin-uid",
      };
      const result = familyCircleMemberSchema.safeParse(member);
      expect(result.success).toBe(true);
    });

    it("should require memberId", () => {
      const member = {
        relationshipType: "child",
        addedAt: new Date(),
        addedBy: "admin-uid",
      };
      const result = familyCircleMemberSchema.safeParse(member);
      expect(result.success).toBe(false);
    });

    it("should require relationshipType", () => {
      const member = {
        memberId: "member-123",
        addedAt: new Date(),
        addedBy: "admin-uid",
      };
      const result = familyCircleMemberSchema.safeParse(member);
      expect(result.success).toBe(false);
    });
  });

  describe("familyCircleInfoSchema", () => {
    it("should accept member info with role and holder", () => {
      const memberInfo: FamilyCircleInfo = {
        role: "member",
        holderId: "holder-123",
        relationshipType: "child",
        joinedAt: new Date(),
      };
      const result = familyCircleInfoSchema.safeParse(memberInfo);
      expect(result.success).toBe(true);
    });

    it("should accept holder info with role", () => {
      const holderInfo: FamilyCircleInfo = {
        role: "holder",
        holderId: null,
        relationshipType: null,
        joinedAt: null,
      };
      const result = familyCircleInfoSchema.safeParse(holderInfo);
      expect(result.success).toBe(true);
    });

    it("should accept null (not in any circle)", () => {
      const result = familyCircleInfoSchema.safeParse(null);
      expect(result.success).toBe(true);
    });

    it("should accept no circle info (role is null)", () => {
      const result = familyCircleInfoSchema.safeParse({
        role: null,
        holderId: null,
        relationshipType: null,
        joinedAt: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("addFamilyCircleMemberRequestSchema", () => {
    it("should accept valid add member request", () => {
      const request: AddFamilyCircleMemberRequest = {
        memberId: "member-123",
        relationshipType: "child",
      };
      const result = addFamilyCircleMemberRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should require memberId", () => {
      const request = {
        relationshipType: "child",
      };
      const result = addFamilyCircleMemberRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("should require relationshipType", () => {
      const request = {
        memberId: "member-123",
      };
      const result = addFamilyCircleMemberRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe("getFamilyCircleResponseSchema", () => {
    it("should accept holder response", () => {
      const response: GetFamilyCircleResponse = {
        role: "holder",
        members: [
          {
            memberId: "member-123",
            relationshipType: "child",
            addedAt: new Date(),
            addedBy: "admin",
          },
        ],
        totalMembers: 1,
      };
      const result = getFamilyCircleResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should accept member response", () => {
      const response: GetFamilyCircleResponse = {
        role: "member",
        holderId: "holder-123",
        relationshipType: "child",
        joinedAt: new Date(),
      };
      const result = getFamilyCircleResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should accept no circle response", () => {
      const response = {
        role: null,
        message: "Client is not part of any family circle",
      };
      const result = getFamilyCircleResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe("getFamilyCircleMembersResponseSchema", () => {
    it("should accept valid members response", () => {
      const response: GetFamilyCircleMembersResponse = {
        data: [
          {
            memberId: "member-123",
            relationshipType: "child",
            addedAt: new Date(),
            addedBy: "admin",
          },
        ],
        metadata: {
          totalMembers: 1,
          holder: {
            clientId: "holder-123",
          },
        },
      };
      const result = getFamilyCircleMembersResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should accept empty members list", () => {
      const response: GetFamilyCircleMembersResponse = {
        data: [],
        metadata: {
          totalMembers: 0,
          holder: {
            clientId: "holder-123",
          },
        },
      };
      const result = getFamilyCircleMembersResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should require data array", () => {
      const response = {
        metadata: {
          totalMembers: 0,
          holder: {
            clientId: "holder-123",
          },
        },
      };
      const result = getFamilyCircleMembersResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe("updateFamilyCircleConfigRequestSchema", () => {
    it("should accept update with allowMemberCredits", () => {
      const request: UpdateFamilyCircleConfigRequest = {
        allowMemberCredits: true,
        allowMemberDebits: false,
      };
      const result = updateFamilyCircleConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should accept update with allowMemberDebits", () => {
      const request: UpdateFamilyCircleConfigRequest = {
        allowMemberCredits: false,
        allowMemberDebits: false,
      };
      const result = updateFamilyCircleConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should accept update with both fields", () => {
      const request: UpdateFamilyCircleConfigRequest = {
        allowMemberCredits: true,
        allowMemberDebits: false,
      };
      const result = updateFamilyCircleConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("should reject request with no parameters", () => {
      const request = {};
      const result = updateFamilyCircleConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe("familyCircleConfigResponseSchema", () => {
    it("should accept valid config response", () => {
      const now = new Date();
      const response: FamilyCircleConfigResponse = {
        allowMemberCredits: true,
        allowMemberDebits: false,
        updatedAt: now,
        updatedBy: "admin-uid",
      };
      const result = familyCircleConfigResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should require all fields", () => {
      const response = {
        allowMemberCredits: true,
        allowMemberDebits: false,
      };
      const result = familyCircleConfigResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe("Type Inference", () => {
    it("should correctly infer RelationshipType", () => {
      const type: RelationshipType = "child";
      expect(type).toBe("child");
    });

    it("should correctly infer FamilyCircleMember", () => {
      const member: FamilyCircleMember = {
        memberId: "m1",
        relationshipType: "child",
        addedAt: new Date(),
        addedBy: "admin",
      };
      expect(member.memberId).toBe("m1");
    });

    it("should correctly infer GetFamilyCircleResponse", () => {
      const response: GetFamilyCircleResponse = {
        role: "holder",
        members: [],
        totalMembers: 0,
      };
      expect(response.role).toBe("holder");
    });
  });
});
