/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AuditLogsPage from "./page";
import { apiRequest } from "@/lib/api";

// Mock dependencies
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loader" />,
  Eye: () => <div data-testid="eye-icon" />,
  X: () => <div data-testid="x-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
}));

// Mock Dialog component
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

describe("AuditLogsPage", () => {
  const mockLogs = [
    {
      id: "log-1",
      action: "CLIENT_CREATED",
      resource_type: "client",
      resource_id: "client-1",
      actor: {
        uid: "user-1",
        email: "admin@example.com",
      },
      changes: {
        before: null,
        after: { name: "John Doe" },
      },
      metadata: {
        description: "Created new client",
      },
      timestamp: "2023-01-01T12:00:00Z",
    },
    {
      id: "log-2",
      action: "POINTS_CREDITED",
      resource_type: "account",
      resource_id: "account-1",
      actor: {
        uid: "user-1",
        email: "admin@example.com",
      },
      changes: null,
      metadata: {
        description: "Added 100 points",
      },
      timestamp: "2023-01-02T12:00:00Z",
    },
  ];

  beforeEach(() => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: mockLogs });
  });

  it("renders the list of audit logs", async () => {
    render(<AuditLogsPage />);

    // Wait for logs to load
    await waitFor(() => {
      expect(screen.getByText("CLIENT_CREATED")).toBeInTheDocument();
      expect(screen.getByText("POINTS_CREDITED")).toBeInTheDocument();
      expect(screen.getByText("Created new client")).toBeInTheDocument();
      expect(screen.getByText("Added 100 points")).toBeInTheDocument();
      expect(screen.getAllByText("admin@example.com")).toHaveLength(2);
    });
  });

  it("opens dialog with log details when view button is clicked", async () => {
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("CLIENT_CREATED")).toBeInTheDocument();
    });

    // Click the first view button
    const viewButtons = screen.getAllByRole("button");
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByText("Audit Log Details")).toBeInTheDocument();
      expect(screen.getByText("ID: log-1")).toBeInTheDocument();
      // Check for changes content
      expect(screen.getByText(/"name": "John Doe"/)).toBeInTheDocument();
    });
  });

  it("renders empty state when no logs found", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: [] });
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("No audit logs found")).toBeInTheDocument();
    });
  });

  it("renders error message on API failure", async () => {
    (apiRequest as jest.Mock).mockRejectedValue(new Error("API Error"));
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load audit logs. Please try again later."),
      ).toBeInTheDocument();
    });
  });
});
