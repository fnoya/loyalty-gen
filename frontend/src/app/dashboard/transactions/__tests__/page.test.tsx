/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import TransactionListPage from "../page";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";

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
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  Loader2: ({ className }: any) => (
    <div className={className} data-testid="loader" />
  ),
  ArrowLeft: () => <div data-testid="arrow-left" />,
  ArrowRight: () => <div data-testid="arrow-right" />,
  Search: () => <div data-testid="search" />,
  FileText: () => <div data-testid="file-text" />,
  Receipt: () => <div data-testid="receipt" />,
  Eye: () => <div data-testid="eye" />,
}));

describe("TransactionListPage", () => {
  const mockRouter = { push: jest.fn() };
  const mockTransactions = [
    {
      id: "audit-1",
      action: "POINTS_CREDITED",
      resource_type: "transaction",
      resource_id: "txn-1",
      transaction_id: "txn-1",
      client_id: "client-1",
      account_id: "acc-1",
      actor: { uid: "user-1", email: "user@example.com" },
      changes: { before: { points: 100 }, after: { points: 150 } },
      metadata: { description: "Bonus points" },
      timestamp: "2023-01-01T12:00:00Z",
    },
    {
      id: "audit-2",
      action: "POINTS_DEBITED",
      resource_type: "transaction",
      resource_id: "txn-2",
      transaction_id: "txn-2",
      client_id: "client-1",
      account_id: "acc-1",
      actor: { uid: "user-1", email: "user@example.com" },
      changes: { before: { points: 150 }, after: { points: 100 } },
      metadata: { description: "Redemption" },
      timestamp: "2023-01-02T12:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (apiRequest as jest.Mock).mockResolvedValue({ data: mockTransactions });
  });

  it("renders loading state initially", () => {
    (apiRequest as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<TransactionListPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders transaction list after loading", async () => {
    render(<TransactionListPage />);

    await waitFor(() => {
      expect(screen.getByText("Transactions")).toBeInTheDocument();
      expect(screen.getByText("CREDIT")).toBeInTheDocument();
      expect(screen.getByText("DEBIT")).toBeInTheDocument();
      expect(screen.getByText("+50 pts")).toBeInTheDocument();
      expect(screen.getByText("-50 pts")).toBeInTheDocument();
      expect(screen.getByText("Bonus points")).toBeInTheDocument();
      expect(screen.getByText("Redemption")).toBeInTheDocument();
    });
  });

  it("handles error state", async () => {
    (apiRequest as jest.Mock).mockRejectedValue(new Error("Failed to fetch"));
    render(<TransactionListPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load transactions."),
      ).toBeInTheDocument();
    });
  });

  it("navigates to transaction detail on click", async () => {
    render(<TransactionListPage />);
    await waitFor(() => screen.getByText("Transactions"));

    const rows = screen.getAllByRole("row");
    // First row is header, second row is first transaction
    const firstRow = rows[1];
    // Get the last cell which contains the detail button
    const cells = firstRow.querySelectorAll("td");
    const lastCell = cells[cells.length - 1];
    const detailButton = lastCell.querySelector("button");

    if (detailButton) {
      fireEvent.click(detailButton);
      expect(mockRouter.push).toHaveBeenCalledWith(
        "/dashboard/transactions/txn-1",
      );
    } else {
      throw new Error("Detail button not found");
    }
  });

  it("navigates to client detail on client ID click", async () => {
    render(<TransactionListPage />);
    await waitFor(() => screen.getByText("Transactions"));

    const clientLinks = screen.getAllByText(/client-1/);
    fireEvent.click(clientLinks[0]);
    expect(mockRouter.push).toHaveBeenCalledWith("/dashboard/clients/client-1");
  });
});
