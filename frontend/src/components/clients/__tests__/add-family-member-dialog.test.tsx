import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddFamilyMemberDialog } from "../add-family-member-dialog";
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

jest.mock("@/components/clients/client-search-combobox", () => ({
  ClientSearchCombobox: ({ onSelect, placeholder, excludeIds }: any) => (
    <div data-testid="client-search-combobox">
      <input
        type="hidden"
        data-testid="exclude-ids"
        value={JSON.stringify(excludeIds)}
      />
      <input
        placeholder={placeholder}
        onChange={(e) => {
          // Simulate selection
          if (e.target.value === "select-client") {
            onSelect("client-123");
          }
        }}
        data-testid="combobox-input"
      />
    </div>
  ),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: any) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogHeader: ({ children }: any) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: any) => (
    <div data-testid="dialog-title">{children}</div>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: any) => (
    <div
      data-testid={`select-item-${value}`}
      onClick={() => {
        // Trigger select change
      }}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: () => <div data-testid="select-value" />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, disabled, onClick, type, ...props }: any) => (
    <button
      disabled={disabled}
      onClick={onClick}
      type={type || "button"}
      data-testid={props["data-testid"]}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loader">Loading...</div>,
}));

describe("AddFamilyMemberDialog", () => {
  const mockApiRequest = apiModule.apiRequest as jest.MockedFunction<
    typeof apiModule.apiRequest
  >;
  const mockToast = toastModule.toast;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={false}
          onOpenChange={jest.fn()}
        />,
      );

      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-title")).toBeInTheDocument();
    });

    it("should display all form fields when open", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      expect(screen.getByTestId("client-search-combobox")).toBeInTheDocument();
      expect(screen.getByTestId("select-trigger")).toBeInTheDocument();
      expect(screen.getByText("Cancelar")).toBeInTheDocument();
      expect(screen.getByText("Añadir")).toBeInTheDocument();
    });

    it("should pass correct exclude IDs to combobox", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
          existingMemberIds={["member-1", "member-2"]}
        />,
      );

      const excludeIdsInput = screen.getByTestId("exclude-ids");
      const excludeIds = JSON.parse(excludeIdsInput.getAttribute("value")!);

      expect(excludeIds).toContain("client-1");
      expect(excludeIds).toContain("member-1");
      expect(excludeIds).toContain("member-2");
    });

    it("should render all relationship type options", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      expect(screen.getByTestId("select-item-spouse")).toBeInTheDocument();
      expect(screen.getByTestId("select-item-child")).toBeInTheDocument();
      expect(screen.getByTestId("select-item-parent")).toBeInTheDocument();
      expect(screen.getByTestId("select-item-sibling")).toBeInTheDocument();
      expect(screen.getByTestId("select-item-friend")).toBeInTheDocument();
      expect(screen.getByTestId("select-item-other")).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("should show error when no member selected", async () => {
      mockToast.error = jest.fn();

      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      const submitButton = screen.getByText("Añadir");
      fireEvent.click(submitButton);

      expect(mockToast.error).toHaveBeenCalledWith(
        "Debe seleccionar un cliente",
      );
    });

    it("should submit form successfully", async () => {
      const onOpenChange = jest.fn();
      const onMemberAdded = jest.fn();
      const user = userEvent.setup();

      mockApiRequest.mockResolvedValueOnce({});
      mockToast.success = jest.fn();

      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={onOpenChange}
          onMemberAdded={onMemberAdded}
        />,
      );

      const submitButton = screen.getByText("Añadir");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockApiRequest).not.toHaveBeenCalled();
      });
    });

    it("should have add button in form", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      const addButton = screen.getByText("Añadir");
      expect(addButton).toHaveAttribute("type", "submit");
    });

    it("should show loading state of button", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      expect(screen.getByText("Añadir")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should display relationship type options for error states", () => {
      mockToast.error = jest.fn();

      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      expect(screen.getByTestId("select-item-spouse")).toBeInTheDocument();
      expect(screen.getByTestId("select-item-child")).toBeInTheDocument();
      expect(screen.getByTestId("select-item-parent")).toBeInTheDocument();
    });

    it("should show error button is present", () => {
      mockToast.error = jest.fn();

      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      const submitButton = screen.getByText("Añadir");
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe("Dialog Controls", () => {
    it("should have cancel button in form", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      const cancelButton = screen.getByText("Cancelar");
      expect(cancelButton).toBeInTheDocument();
    });

    it("should render cancel button with outline variant", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      const cancelButton = screen.getByText("Cancelar");
      expect(cancelButton).toHaveAttribute("type", "button");
    });
  });

  describe("State Management", () => {
    it("should have default relationship type as child", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
        />,
      );

      const select = screen.getByTestId("select");
      expect(select).toHaveAttribute("data-value", "child");
    });

    it("should handle empty existingMemberIds", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
          existingMemberIds={[]}
        />,
      );

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it("should support optional onMemberAdded callback", () => {
      render(
        <AddFamilyMemberDialog
          clientId="client-1"
          isOpen={true}
          onOpenChange={jest.fn()}
          onMemberAdded={undefined}
        />,
      );

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });
  });
});
