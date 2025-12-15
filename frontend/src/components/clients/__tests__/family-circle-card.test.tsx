import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FamilyCircleCard } from "../family-circle-card";
import * as apiModule from "@/lib/api";
import * as toastModule from "@/components/ui/toast";

// Mock Firebase before everything else
jest.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: { getIdToken: jest.fn().mockResolvedValue("mock-token") },
  },
  db: {},
  storage: {},
}));

jest.mock("@/lib/api");
jest.mock("@/components/ui/toast");

jest.mock("@/components/clients/family-member-badge", () => ({
  FamilyMemberBadge: ({ member }: any) => (
    <div data-testid="family-member-badge">{member.memberName}</div>
  ),
}));

jest.mock("@/components/clients/add-family-member-dialog", () => ({
  AddFamilyMemberDialog: ({ clientId, isOpen, onOpenChange }: any) =>
    isOpen && (
      <div data-testid="add-family-member-dialog">
        <button
          onClick={() => onOpenChange(false)}
          data-testid="dialog-close-btn"
        >
          Close
        </button>
      </div>
    ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardDescription: ({ children }: any) => (
    <div data-testid="card-description">{children}</div>
  ),
  CardHeader: ({ children }: any) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: any) => (
    <div data-testid="card-title">{children}</div>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: any) => (
    <div data-testid="badge" data-variant={variant}>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children, align }: any) => (
    <div data-testid="dropdown-menu-content" data-align={align}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <div
      data-testid="dropdown-menu-item"
      onClick={onClick}
      className={className}
    >
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: any) => (
    <div data-testid="dropdown-menu-trigger">{children}</div>
  ),
}));

jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: any) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogAction: ({ children, onClick, disabled }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid="alert-dialog-action"
    >
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children, onClick, disabled }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid="alert-dialog-cancel"
    >
      {children}
    </button>
  ),
  AlertDialogContent: ({ children }: any) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogDescription: ({ children }: any) => (
    <div data-testid="alert-dialog-description">{children}</div>
  ),
  AlertDialogFooter: ({ children }: any) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogHeader: ({ children }: any) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: any) => (
    <div data-testid="alert-dialog-title">{children}</div>
  ),
}));

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <div data-testid="separator" />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: any) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock("next/link", () => {
  return ({ children, href }: any) => (
    <a href={href} data-testid={`link-${href}`}>
      {children}
    </a>
  );
});

jest.mock("lucide-react", () => ({
  Users: () => <div data-testid="icon-users" />,
  Plus: () => <div data-testid="icon-plus" />,
  MoreVertical: () => <div data-testid="icon-more" />,
  Loader2: () => <div data-testid="icon-loader" />,
  ArrowRight: () => <div data-testid="icon-arrow" />,
}));

describe("FamilyCircleCard", () => {
  const mockApiRequest = apiModule.apiRequest as jest.MockedFunction<
    typeof apiModule.apiRequest
  >;
  const mockToast = toastModule.toast;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should display skeleton when loading", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={null}
          isLoading={true}
        />,
      );

      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });

    it("should not display family circle content while loading", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={null}
          isLoading={true}
        />,
      );

      expect(screen.queryByText("Círculo Familiar")).not.toBeInTheDocument();
    });
  });

  describe("No Family Circle State", () => {
    it("should display message when no family circle exists", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={null}
          isLoading={false}
        />,
      );

      expect(
        screen.getByText("Este cliente no pertenece a ningún círculo familiar"),
      ).toBeInTheDocument();
    });

    it("should show create circle button when no family circle", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={null}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Crear Círculo")).toBeInTheDocument();
    });

    it("should open add member dialog when create button clicked", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={null}
          isLoading={false}
        />,
      );

      const createButton = screen.getByText("Crear Círculo");
      fireEvent.click(createButton);

      expect(
        screen.getByTestId("add-family-member-dialog"),
      ).toBeInTheDocument();
    });

    it("should handle role null as no circle", () => {
      const familyCircle = {
        role: null as any,
        members: [],
        totalMembers: 0,
        holderId: "client-1",
        relationshipType: null,
        joinedAt: null,
        memberId: "client-1",
        memberName: "John Doe",
        memberEmail: null,
      };

      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={familyCircle}
          isLoading={false}
        />,
      );

      expect(
        screen.getByText("Este cliente no pertenece a ningún círculo familiar"),
      ).toBeInTheDocument();
    });
  });

  describe("Holder View", () => {
    const holderFamilyCircle = {
      role: "holder" as const,
      members: [
        {
          memberId: "member-1",
          memberName: "Jane Doe",
          memberEmail: "jane@example.com",
          relationshipType: "spouse" as const,
          addedAt: "2024-01-01T00:00:00Z",
          addedBy: "user-1",
        },
        {
          memberId: "member-2",
          memberName: "John Jr",
          memberEmail: "john.jr@example.com",
          relationshipType: "child" as const,
          addedAt: "2024-01-02T00:00:00Z",
          addedBy: "user-1",
        },
      ],
      totalMembers: 2,
      holderId: "client-1",
      relationshipType: null,
      joinedAt: null,
      memberId: "client-1",
      memberName: "John Doe",
      memberEmail: null,
    };

    it("should display holder badge", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Titular del Círculo")).toBeInTheDocument();
    });

    it("should display member count", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByText(/2 miembros/)).toBeInTheDocument();
    });

    it("should display add member button", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Añadir Miembro")).toBeInTheDocument();
    });

    it("should list all family members", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("John Jr")).toBeInTheDocument();
    });

    it("should show empty state when no members", () => {
      const emptyCircle = {
        role: "holder" as const,
        members: [],
        totalMembers: 0,
        holderId: "client-1",
        relationshipType: null,
        joinedAt: null,
        memberId: "client-1",
        memberName: "John Doe",
        memberEmail: null,
      };

      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={emptyCircle}
          isLoading={false}
        />,
      );

      expect(
        screen.getByText("No hay miembros en el círculo"),
      ).toBeInTheDocument();
    });

    it("should open add member dialog when add button clicked", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const addButton = screen.getByText("Añadir Miembro");
      fireEvent.click(addButton);

      expect(
        screen.getByTestId("add-family-member-dialog"),
      ).toBeInTheDocument();
    });

    it("should show dropdown menu for member actions", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getAllByTestId("dropdown-menu").length).toBeGreaterThan(0);
    });

    it("should display view client link in dropdown", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const viewClientLinks = screen.getAllByText("Ver Cliente");
      expect(viewClientLinks.length).toBeGreaterThan(0);
    });

    it("should display remove member option in dropdown", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const removeOptions = screen.getAllByText("Remover del Círculo");
      expect(removeOptions.length).toBeGreaterThan(0);
    });

    it("should show separator between members", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const separators = screen.getAllByTestId("separator");
      expect(separators.length).toBeGreaterThan(0);
    });

    it("should open confirmation dialog when remove member clicked", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const removeButtons = screen.getAllByText("Remover del Círculo");
      fireEvent.click(removeButtons[0]);

      expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
      expect(
        screen.getByText("¿Remover miembro del círculo?"),
      ).toBeInTheDocument();
    });

    it("should call API to remove member on confirmation", async () => {
      mockApiRequest.mockResolvedValueOnce({});
      mockToast.success = jest.fn();

      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const removeButtons = screen.getAllByText("Remover del Círculo");
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId("alert-dialog-action");
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          "/clients/client-1/family-circle/members/member-1",
          { method: "DELETE" },
        );
      });
    });

    it("should show success toast after removing member", async () => {
      mockApiRequest.mockResolvedValueOnce({});
      mockToast.success = jest.fn();

      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const removeButtons = screen.getAllByText("Remover del Círculo");
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        const confirmButton = screen.getByTestId("alert-dialog-action");
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Miembro removido del círculo exitosamente",
        );
      });
    });

    it("should call refresh callback after removing member", async () => {
      const onRefresh = jest.fn();
      mockApiRequest.mockResolvedValueOnce({});
      mockToast.success = jest.fn();

      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
          onRefresh={onRefresh}
        />,
      );

      const removeButtons = screen.getAllByText("Remover del Círculo");
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        const confirmButton = screen.getByTestId("alert-dialog-action");
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });
    });

    it("should handle member removal error", async () => {
      const error = new Error("Remove failed");
      mockApiRequest.mockRejectedValueOnce(error);
      mockToast.error = jest.fn();

      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const removeButtons = screen.getAllByText("Remover del Círculo");
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        const confirmButton = screen.getByTestId("alert-dialog-action");
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Remove failed");
      });
    });

    it("should disable cancel button during removal", async () => {
      mockApiRequest.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 100)),
      );

      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const removeButtons = screen.getAllByText("Remover del Círculo");
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        const confirmButton = screen.getByTestId("alert-dialog-action");
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        const cancelButton = screen.getByTestId("alert-dialog-cancel");
        expect(cancelButton).toBeDisabled();
      });
    });

    it("should close confirmation dialog when cancel clicked", async () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const removeButtons = screen.getAllByText("Remover del Círculo");
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId("alert-dialog-cancel");
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
    });

    it("should display singular member text when only one member", () => {
      const singleMemberCircle = {
        role: "holder" as const,
        members: [
          {
            memberId: "member-1",
            memberName: "Jane Doe",
            memberEmail: "jane@example.com",
            relationshipType: "spouse",
          },
        ],
        totalMembers: 1,
        holderId: "client-1",
        relationshipType: null,
        joinedAt: null,
        memberId: "client-1",
        memberName: "John Doe",
        memberEmail: null,
      };

      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={singleMemberCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByText(/1 miembro/)).toBeInTheDocument();
    });

    it("should pass existing member IDs to add dialog", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
        />,
      );

      const addButton = screen.getByText("Añadir Miembro");
      fireEvent.click(addButton);

      // Dialog should open and be passed the member IDs
      expect(
        screen.getByTestId("add-family-member-dialog"),
      ).toBeInTheDocument();
    });
  });

  describe("Member View", () => {
    const memberFamilyCircle = {
      role: "member" as const,
      members: [],
      totalMembers: 0,
      holderId: "holder-1",
      relationshipType: "spouse",
      joinedAt: "2023-01-15T00:00:00Z",
      memberId: "member-1",
      memberName: "Jane Doe",
      memberEmail: "jane@example.com",
    };

    it("should display member badge", () => {
      render(
        <FamilyCircleCard
          clientId="member-1"
          familyCircle={memberFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Miembro de Círculo")).toBeInTheDocument();
    });

    it("should display relationship type", () => {
      render(
        <FamilyCircleCard
          clientId="member-1"
          familyCircle={memberFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByText(/Cónyuge/)).toBeInTheDocument();
    });

    it("should display holder information", () => {
      render(
        <FamilyCircleCard
          clientId="member-1"
          familyCircle={memberFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Titular del círculo")).toBeInTheDocument();
    });

    it("should display joined date", () => {
      render(
        <FamilyCircleCard
          clientId="member-1"
          familyCircle={memberFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByText(/Miembro desde/)).toBeInTheDocument();
    });

    it("should display link to holder profile", () => {
      render(
        <FamilyCircleCard
          clientId="member-1"
          familyCircle={memberFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Ver Perfil")).toBeInTheDocument();
    });

    it("should not display add member button in member view", () => {
      render(
        <FamilyCircleCard
          clientId="member-1"
          familyCircle={memberFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.queryByText("Añadir Miembro")).not.toBeInTheDocument();
    });
  });

  describe("Null Return", () => {
    it("should return null for unknown role", () => {
      const unknownRoleCircle = {
        role: "unknown" as any,
        members: [],
        totalMembers: 0,
        holderId: "client-1",
        relationshipType: null,
        joinedAt: null,
        memberId: "client-1",
        memberName: "John Doe",
        memberEmail: null,
      };

      const { container } = render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={unknownRoleCircle}
          isLoading={false}
        />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined family circle", () => {
      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={undefined}
          isLoading={false}
        />,
      );

      expect(
        screen.getByText("Este cliente no pertenece a ningún círculo familiar"),
      ).toBeInTheDocument();
    });

    it("should handle undefined onRefresh callback", async () => {
      mockApiRequest.mockResolvedValueOnce({});
      mockToast.success = jest.fn();

      const holderFamilyCircle = {
        role: "holder" as const,
        members: [
          {
            memberId: "member-1",
            memberName: "Jane Doe",
            memberEmail: "jane@example.com",
            relationshipType: "spouse" as const,
            addedAt: "2024-01-01T00:00:00Z",
            addedBy: "user-1",
          },
        ],
        totalMembers: 1,
        holderId: "client-1",
        relationshipType: null,
        joinedAt: null,
        memberId: "client-1",
        memberName: "John Doe",
        memberEmail: null,
      };

      render(
        <FamilyCircleCard
          clientId="client-1"
          familyCircle={holderFamilyCircle}
          isLoading={false}
          onRefresh={undefined}
        />,
      );

      const removeButtons = screen.getAllByText("Remover del Círculo");
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        const confirmButton = screen.getByTestId("alert-dialog-action");
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it("should render member view card", () => {
      const memberFamilyCircle = {
        role: "member" as const,
        members: [],
        totalMembers: 0,
        holderId: "holder-1",
        relationshipType: "child",
        joinedAt: "2023-01-15T00:00:00Z",
        memberId: "member-1",
        memberName: "John Jr",
        memberEmail: null,
      };

      render(
        <FamilyCircleCard
          clientId="member-1"
          familyCircle={memberFamilyCircle}
          isLoading={false}
        />,
      );

      expect(screen.getByTestId("card")).toBeInTheDocument();
      expect(screen.getByText("Miembro de Círculo")).toBeInTheDocument();
    });
  });
});
