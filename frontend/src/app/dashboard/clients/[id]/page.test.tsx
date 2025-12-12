import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClientDetailPage from "./page";
import { apiRequest } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

// Mock dependencies
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

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

// Mock Tabs component to avoid Radix UI complexity in tests if needed
// But usually Radix Tabs work fine with JSDOM if ResizeObserver is mocked.
// Let's try without mocking Tabs first, but if it fails, we'll mock it.

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
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("John Adams")).toBeInTheDocument();
    });

    // Click delete button
    fireEvent.click(screen.getByText("Eliminar"));

    // Confirm delete in dialog
    // Note: Radix UI Dialog might render in a portal, so we need to check if it's in the document
    // But testing-library usually finds it if it's in the body.
    const confirmButton = await screen.findByText("Eliminar", {
      selector: "button.bg-red-600",
    });
    fireEvent.click(confirmButton);

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

    // Click Audit History tab (look for Spanish text)
    const auditTab = screen.getByText("Historial de Auditoría");
    await user.click(auditTab);

    // Check that audit history component is rendered
    await waitFor(() => {
      expect(screen.getByTestId("client-audit-history")).toBeInTheDocument();
    });
  });
});
