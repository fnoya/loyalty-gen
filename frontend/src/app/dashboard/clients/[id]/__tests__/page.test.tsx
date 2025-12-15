import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClientDetailPage from "../page";
import { apiRequest } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

// Mock firebase to prevent initialization errors
jest.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

// Mock dependencies
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock Link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  Edit: () => <span data-testid="icon-edit" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Phone: () => <span data-testid="icon-phone" />,
  MapPin: () => <span data-testid="icon-map-pin" />,
  Mail: () => <span data-testid="icon-mail" />,
  CreditCard: () => <span data-testid="icon-credit-card" />,
  Plus: () => <span data-testid="icon-plus" />,
  Users: () => <span data-testid="icon-users" />,
  Loader2: () => <span data-testid="icon-loader2" />,
  MoreVertical: () => <span data-testid="icon-more-vertical" />,
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
  ChevronsUpDown: () => <span data-testid="icon-chevrons-up-down" />,
  Check: () => <span data-testid="icon-check" />,
  Wallet: () => <span data-testid="icon-wallet" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
  FileSearch: () => <span data-testid="icon-file-search" />,
}));

// Mock toast
jest.mock("@/components/ui/toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock AlertDialog
jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Mock Tabs
jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue }: any) => (
    <div data-testid="tabs" data-default={defaultValue}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button role="tab" data-value={value} onClick={onClick}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

// Mock UI components that might be used
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ ...props }: any) => <div data-testid="skeleton" {...props} />,
}));

jest.mock("@/components/ui/separator", () => ({
  Separator: ({ ...props }: any) => <hr data-testid="separator" {...props} />,
}));

jest.mock("@/components/ui/switch", () => ({
  Switch: ({ ...props }: any) => <input type="checkbox" {...props} />,
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/command", () => ({
  Command: ({ children }: any) => <div>{children}</div>,
  CommandInput: ({ ...props }: any) => <input {...props} />,
  CommandItem: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  CommandList: ({ children }: any) => <div>{children}</div>,
  CommandEmpty: ({ children }: any) => <div>{children}</div>,
  CommandGroup: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, defaultValue }: any) => (
    <div data-testid="select" data-value={defaultValue}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

// Mock audit components
jest.mock("@/components/audit/audit-logs-list", () => ({
  AuditLogsList: () => (
    <div data-testid="audit-logs-list">Audit Logs List Component</div>
  ),
}));

jest.mock("@/components/audit/audit-helpers", () => ({
  AUDIT_ACTION_LABELS: {
    create: "Crear",
    update: "Actualizar",
    delete: "Eliminar",
  },
}));

// Mock ClientAuditHistory component
jest.mock("@/components/clients/client-audit-history", () => ({
  ClientAuditHistory: () => (
    <div data-testid="client-audit-history">Audit History Component</div>
  ),
}));

// Mock ClientAvatar component
jest.mock("@/components/clients/client-avatar", () => ({
  ClientAvatar: () => <div data-testid="client-avatar">Avatar</div>,
}));

// Mock FamilyCircleCard component
jest.mock("@/components/clients/family-circle-card", () => ({
  FamilyCircleCard: () => (
    <div data-testid="family-circle-card">Family Circle Card</div>
  ),
}));

// Mock AffinityGroupsSection component
jest.mock("@/components/clients/affinity-groups-section", () => ({
  AffinityGroupsSection: () => (
    <div data-testid="affinity-groups-section">Affinity Groups</div>
  ),
}));

// Mock AccountsSummary component
jest.mock("@/components/clients/accounts-summary", () => ({
  AccountsSummary: () => (
    <div data-testid="accounts-summary">Accounts Summary</div>
  ),
}));

// Mock AccountCard component
jest.mock("@/components/clients/account-card", () => ({
  AccountCard: () => <div data-testid="account-card">Account Card</div>,
}));

describe("ClientDetailPage", () => {
  const mockPush = jest.fn();
  const mockClient = {
    id: "123",
    name: {
      firstName: "John",
      secondName: "Quincy",
      firstLastName: "Adams",
      secondLastName: null,
    },
    email: "john@example.com",
    identity_document: {
      type: "cedula_identidad",
      number: "12345678",
    },
    phones: [{ type: "mobile", number: "555-1234", isPrimary: true }],
    addresses: [],
    created_at: "2023-01-01",
    updated_at: "2023-01-01",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: jest.fn(),
    });
    (apiRequest as jest.Mock).mockResolvedValue(mockClient);
  });

  it("renders client details correctly", async () => {
    render(<ClientDetailPage />);

    expect(screen.getByText("Loading client details...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("John Adams")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("CI 12345678")).toBeInTheDocument();
      expect(screen.getByText("555-1234")).toBeInTheDocument();
    });
  });

  it("handles delete action", async () => {
    // Mock GET request for initial load
    (apiRequest as jest.Mock).mockResolvedValueOnce(mockClient);
    // Mock DELETE request
    (apiRequest as jest.Mock).mockResolvedValueOnce({ success: true });

    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("John Adams")).toBeInTheDocument();
    });

    // Find and click the delete button (first "Eliminar" in the page)
    const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
    fireEvent.click(deleteButtons[0]);

    // Wait for dialog to appear and click confirm
    await waitFor(() => {
      // The second "Eliminar" button should be the confirm button in the dialog
      const confirmButtons = screen.getAllByRole("button", {
        name: /eliminar/i,
      });
      expect(confirmButtons.length).toBeGreaterThan(1);
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    });

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/clients/123",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard/clients");
    });
  });

  it("switches to audit history tab", async () => {
    const user = userEvent.setup();
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("John Adams")).toBeInTheDocument();
    });

    // Click Audit History tab
    const auditTab = screen.getByRole("tab", {
      name: /historial de auditoría/i,
    });
    await user.click(auditTab);

    // Check that audit logs list component is rendered
    await waitFor(() => {
      expect(screen.getByTestId("audit-logs-list")).toBeInTheDocument();
    });
  });
});
