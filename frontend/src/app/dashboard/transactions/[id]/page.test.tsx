/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { apiRequest } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";

// Mock firebase to prevent initialization errors
jest.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

// Mock dependencies
jest.mock("@/lib/api");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock UI components to avoid Radix/Pointer events issues
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

jest.mock("@/components/transactions/transaction-audit-history", () => ({
  TransactionAuditHistory: () => (
    <div data-testid="transaction-audit-history">Audit History Component</div>
  ),
}));

import TransactionDetailPage from "./page";

describe("TransactionDetailPage", () => {
  const mockRouter = { push: jest.fn() };

  // Mock Audit Log response that will be mapped to Transaction
  const mockAuditLogs = [
    {
      id: "audit-123",
      action: "POINTS_CREDITED",
      resource_type: "transaction",
      resource_id: "txn-123",
      transaction_id: "txn-123",
      client_id: "client-123",
      account_id: "acc-123",
      actor: { uid: "user-1", email: "test@example.com" },
      changes: { before: { points: 100 }, after: { points: 200 } },
      metadata: { description: "Points earned from purchase" },
      timestamp: "2023-01-01T12:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: "txn-123" });
    (apiRequest as jest.Mock).mockResolvedValue(mockAuditLogs);
  });

  it("renders loading state initially", () => {
    // Mock a pending promise to keep it in loading state
    (apiRequest as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<TransactionDetailPage />);
    // Look for the loader icon by its class or parent container
    const loader = document.querySelector(".animate-spin");
    expect(loader).toBeInTheDocument();
  });

  it("renders transaction details after loading", async () => {
    render(<TransactionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Transaction Details")).toBeInTheDocument();
      expect(screen.getByText("ID: txn-123")).toBeInTheDocument();
      expect(screen.getByText("EARN")).toBeInTheDocument(); // Type
      expect(screen.getByText("+100 pts")).toBeInTheDocument(); // Amount
      expect(screen.getByText("COMPLETED")).toBeInTheDocument(); // Status
      expect(
        screen.getByText("Points earned from purchase"),
      ).toBeInTheDocument(); // Description
    });
  });

  it("handles error state", async () => {
    (apiRequest as jest.Mock).mockRejectedValue(new Error("Failed to fetch"));
    render(<TransactionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to load transaction details."),
      ).toBeInTheDocument();
    });
  });

  it("navigates back to list on back button click", async () => {
    render(<TransactionDetailPage />);
    await waitFor(() => screen.getByText("Transaction Details"));

    const backButton = document
      .querySelector("button.h-4.w-4")
      ?.closest("button");
    if (backButton) {
      fireEvent.click(backButton);
      expect(mockRouter.push).toHaveBeenCalledWith("/dashboard/transactions");
    }
  });

  it("navigates to client detail on client ID click", async () => {
    render(<TransactionDetailPage />);
    await waitFor(() => screen.getByText("Transaction Details"));

    const clientLink = screen.getByText("client-123");
    fireEvent.click(clientLink);
    expect(mockRouter.push).toHaveBeenCalledWith(
      "/dashboard/clients/client-123",
    );
  });

  it("renders audit history tab content", async () => {
    render(<TransactionDetailPage />);
    await waitFor(() => screen.getByText("Transaction Details"));

    // Check if the audit history component is rendered in the audit tab content
    // Note: In our mock, TabsContent renders regardless of active state for simplicity in testing structure
    // or we can check if the component exists in the DOM
    expect(screen.getByTestId("transaction-audit-history")).toBeInTheDocument();
  });
});
