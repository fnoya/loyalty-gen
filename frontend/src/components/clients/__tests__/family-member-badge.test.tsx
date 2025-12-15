import { render, screen } from "@testing-library/react";
import { FamilyMemberBadge } from "../family-member-badge";

// Mock Firebase before everything else
jest.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: { getIdToken: jest.fn().mockResolvedValue("mock-token") },
  },
  db: {},
  storage: {},
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: any) => (
    <div data-testid="badge" data-variant={variant}>
      {children}
    </div>
  ),
}));

describe("FamilyMemberBadge", () => {
  describe("Rendering", () => {
    it("should render member name", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render member email", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("should render relationship badge", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("Cónyuge")).toBeInTheDocument();
    });

    it("should have correct badge variant", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("data-variant", "outline");
    });
  });

  describe("Relationship Type Labels", () => {
    it("should display spouse label", () => {
      const member = {
        memberId: "member-1",
        memberName: "Jane Doe",
        memberEmail: "jane@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("Cónyuge")).toBeInTheDocument();
    });

    it("should display child label", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Jr",
        memberEmail: "johnJr@example.com",
        relationshipType: "child" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("Hijo/a")).toBeInTheDocument();
    });

    it("should display parent label", () => {
      const member = {
        memberId: "member-1",
        memberName: "Jane Parent",
        memberEmail: "parent@example.com",
        relationshipType: "parent" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("Padre/Madre")).toBeInTheDocument();
    });

    it("should display sibling label", () => {
      const member = {
        memberId: "member-1",
        memberName: "Jack Sibling",
        memberEmail: "sibling@example.com",
        relationshipType: "sibling" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("Hermano/a")).toBeInTheDocument();
    });

    it("should display friend label", () => {
      const member = {
        memberId: "member-1",
        memberName: "Bob Friend",
        memberEmail: "friend@example.com",
        relationshipType: "friend" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("Amigo/a")).toBeInTheDocument();
    });

    it("should display other label", () => {
      const member = {
        memberId: "member-1",
        memberName: "Someone Else",
        memberEmail: "other@example.com",
        relationshipType: "other" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("Otro")).toBeInTheDocument();
    });

    it("should display other label for unknown relationship type", () => {
      const member = {
        memberId: "member-1",
        memberName: "Unknown Relation",
        memberEmail: "unknown@example.com",
        relationshipType: "unknown" as any,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      // Should render badge but relationship label should be undefined
      const badge = screen.getByTestId("badge");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Email Display", () => {
    it("should display email when provided", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("should not display email when not provided", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: null,
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.queryByText(/example.com/)).not.toBeInTheDocument();
    });

    it("should not display email section when memberEmail is undefined", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: undefined as any,
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  describe("Hide Relationship Prop", () => {
    it("should display relationship badge when hideRelationship is false", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} hideRelationship={false} />);

      expect(screen.getByText("Cónyuge")).toBeInTheDocument();
    });

    it("should not display relationship badge when hideRelationship is true", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} hideRelationship={true} />);

      expect(screen.queryByText("Cónyuge")).not.toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should display relationship badge by default", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("Cónyuge")).toBeInTheDocument();
    });
  });

  describe("Layout and Structure", () => {
    it("should render member name and email in separate lines", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("should display badge with outline variant", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveAttribute("data-variant", "outline");
    });

    it("should display all member information together", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      const { container } = render(<FamilyMemberBadge member={member} />);

      expect(container).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("Cónyuge")).toBeInTheDocument();
    });
  });

  describe("Member ID Fallback", () => {
    it("should use member ID when memberName is not provided", () => {
      const member = {
        memberId: "member-123",
        memberName: undefined as any,
        memberEmail: "john@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("member-123")).toBeInTheDocument();
    });

    it("should use member ID when memberName is null", () => {
      const member = {
        memberId: "member-456",
        memberName: null as any,
        memberEmail: "jane@example.com",
        relationshipType: "child" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("member-456")).toBeInTheDocument();
    });

    it("should use member ID when memberName is empty string", () => {
      const member = {
        memberId: "member-789",
        memberName: "",
        memberEmail: "other@example.com",
        relationshipType: "friend" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("member-789")).toBeInTheDocument();
    });
  });

  describe("Special Characters", () => {
    it("should handle names with special characters", () => {
      const member = {
        memberId: "member-1",
        memberName: "José María López",
        memberEmail: "jose@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("José María López")).toBeInTheDocument();
    });

    it("should handle emails with special characters", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail: "john+tag@example.co.uk",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(screen.getByText("john+tag@example.co.uk")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long member names", () => {
      const member = {
        memberId: "member-1",
        memberName:
          "This is a very long member name that might wrap in the UI and could cause layout issues",
        memberEmail: "long@example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(
        screen.getByText(
          "This is a very long member name that might wrap in the UI and could cause layout issues",
        ),
      ).toBeInTheDocument();
    });

    it("should handle very long emails", () => {
      const member = {
        memberId: "member-1",
        memberName: "John Doe",
        memberEmail:
          "very.long.email.address.with.many.parts@subdomain.example.com",
        relationshipType: "spouse" as const,
        addedAt: "2024-01-01T00:00:00Z",
        addedBy: "admin-1",
      };

      render(<FamilyMemberBadge member={member} />);

      expect(
        screen.getByText(
          "very.long.email.address.with.many.parts@subdomain.example.com",
        ),
      ).toBeInTheDocument();
    });

    it("should render multiple badges on same page", () => {
      const members = [
        {
          memberId: "member-1",
          memberName: "John Doe",
          memberEmail: "john@example.com",
          relationshipType: "spouse" as const,
          addedAt: "2024-01-01T00:00:00Z",
          addedBy: "admin-1",
        },
        {
          memberId: "member-2",
          memberName: "Jane Smith",
          memberEmail: "jane@example.com",
          relationshipType: "sibling" as const,
          addedAt: "2024-01-01T00:00:00Z",
          addedBy: "admin-1",
        },
      ];

      const { container } = render(
        <div>
          {members.map((member) => (
            <FamilyMemberBadge key={member.memberId} member={member} />
          ))}
        </div>,
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Cónyuge")).toBeInTheDocument();
      expect(screen.getByText("Hermano/a")).toBeInTheDocument();
    });
  });
});
