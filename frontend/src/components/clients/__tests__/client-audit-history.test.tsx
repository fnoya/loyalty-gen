/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ClientAuditHistory } from "./client-audit-history";
import { apiRequest } from "@/lib/api";

// Mock dependencies
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  Loader2: () => <span data-testid="icon-loader" />,
  Eye: () => <span data-testid="icon-eye" />,
}));

// Mock UI components
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: any) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: any) => (
    <div data-testid="dialog-title">{children}</div>
  ),
  DialogDescription: ({ children }: any) => (
    <div data-testid="dialog-description">{children}</div>
  ),
}));

describe("ClientAuditHistory", () => {
  const mockClientId = "client-123";
  const mockLogs = [
    {
      id: "log-1",
      action: "CLIENT_UPDATED",
      actor_uid: "user-1",
      actor: { email: "user1@example.com", uid: "user-1" },
      timestamp: "2023-01-01T12:00:00Z",
      changes: { before: { name: "John" }, after: { name: "Johnny" } },
      metadata: { description: "Updated client name" },
      resource_id: "client-123",
      resource_type: "client",
    },
    {
      id: "log-2",
      action: "POINTS_CREDITED",
      actor_uid: "user-1",
      actor: { email: "user1@example.com", uid: "user-1" },
      timestamp: "2023-01-02T12:00:00Z",
      changes: { before: { balance: 0 }, after: { balance: 100 } },
      metadata: { description: "Credited 100 points" },
      resource_id: "account-456",
      resource_type: "account",
    },
  ];

  beforeEach(() => {
    (apiRequest as jest.Mock).mockClear();
  });

  it("renders loading state initially", () => {
    (apiRequest as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<ClientAuditHistory clientId={mockClientId} />);
    expect(screen.getByText("Loading history...")).toBeInTheDocument();
  });

  it("renders logs after successful fetch", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: mockLogs });
    render(<ClientAuditHistory clientId={mockClientId} />);

    await waitFor(() => {
      expect(screen.getByText("Audit History")).toBeInTheDocument();
    });

    expect(screen.getByText("CLIENT_UPDATED")).toBeInTheDocument();
    expect(screen.getByText("POINTS_CREDITED")).toBeInTheDocument();
    // Match date part only to avoid timezone issues
    expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument();
  });

  it("renders empty state when no logs found", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: [] });
    render(<ClientAuditHistory clientId={mockClientId} />);

    await waitFor(() => {
      expect(
        screen.getByText("No history found for this client."),
      ).toBeInTheDocument();
    });
  });

  it("handles error state", async () => {
    (apiRequest as jest.Mock).mockRejectedValue(new Error("Failed to fetch"));
    render(<ClientAuditHistory clientId={mockClientId} />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load audit history."),
      ).toBeInTheDocument();
    });
  });

  it("opens details dialog when clicking view button", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: mockLogs });
    render(<ClientAuditHistory clientId={mockClientId} />);

    await waitFor(() => {
      expect(screen.getAllByTestId("icon-eye")).toHaveLength(2);
    });

    // Click the first view button
    const viewButtons = screen.getAllByRole("button");
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByText("Audit Log Details")).toBeInTheDocument();
      expect(screen.getByText(/"name": "John"/)).toBeInTheDocument();
      expect(screen.getByText(/"name": "Johnny"/)).toBeInTheDocument();
    });
  });
});
