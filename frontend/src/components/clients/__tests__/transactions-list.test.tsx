import { render, screen } from "@testing-library/react";
import { TransactionsList } from "../transactions-list";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("@/components/ui/toast", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("@/components/audit/audit-log-dialog", () => ({
  AuditLogDialog: () => <div data-testid="audit-log-dialog" />,
}));

jest.mock("lucide-react", () => ({
  ArrowUp: () => <span data-testid="icon-arrow-up" />,
  ArrowDown: () => <span data-testid="icon-arrow-down" />,
  Clock: () => <span data-testid="icon-clock" />,
  FileSearch: () => <span data-testid="icon-file-search" />,
}));

jest.mock("date-fns", () => ({
  format: (date: Date) => date.toISOString(),
}));

jest.mock("date-fns/locale", () => ({
  es: {},
}));

describe("TransactionsList", () => {
  const mockTransactions = [
    {
      id: "t1",
      transaction_type: "credit" as const,
      amount: 100,
      description: "Purchase reward",
      timestamp: "2024-01-15T10:00:00Z",
      originatedBy: null,
    },
    {
      id: "t2",
      transaction_type: "debit" as const,
      amount: 50,
      description: "Redeemed gift card",
      timestamp: "2024-01-14T10:00:00Z",
      originatedBy: null,
    },
  ];

  it("renders skeleton while loading", () => {
    render(<TransactionsList transactions={[]} loading={true} />);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(3);
  });

  it("displays empty state when no transactions", () => {
    render(<TransactionsList transactions={[]} loading={false} />);

    expect(screen.getByText("No hay transacciones")).toBeInTheDocument();
    expect(
      screen.getByText("Las transacciones aparecerán aquí cuando se realicen."),
    ).toBeInTheDocument();
  });

  it("displays all transactions", () => {
    render(
      <TransactionsList transactions={mockTransactions} loading={false} />,
    );

    expect(screen.getByText("Crédito")).toBeInTheDocument();
    expect(screen.getByText("Débito")).toBeInTheDocument();
    expect(screen.getByText("Purchase reward")).toBeInTheDocument();
    expect(screen.getByText("Redeemed gift card")).toBeInTheDocument();
    expect(screen.getByText("+100")).toBeInTheDocument();
    expect(screen.getByText("-50")).toBeInTheDocument();
  });

  it("respects limit prop", () => {
    const manyTransactions = Array.from({ length: 10 }, (_, i) => ({
      ...mockTransactions[0],
      id: `t${i}`,
    }));

    render(
      <TransactionsList
        transactions={manyTransactions}
        loading={false}
        limit={5}
      />,
    );

    // Should display only 5 transactions
    const transactionElements = screen.getAllByText("Crédito");
    expect(transactionElements).toHaveLength(5);
  });

  it("shows view more button when limit is set and exceeded", () => {
    const manyTransactions = Array.from({ length: 10 }, (_, i) => ({
      ...mockTransactions[0],
      id: `t${i}`,
    }));

    render(
      <TransactionsList
        transactions={manyTransactions}
        loading={false}
        limit={5}
        showViewMore={true}
        onViewMore={jest.fn()}
      />,
    );

    expect(
      screen.getByText(/Ver más transacciones \(5 adicionales\)/i),
    ).toBeInTheDocument();
  });

  it("shows view more button even when all transactions are shown (cursor pagination)", () => {
    const manyTransactions = Array.from({ length: 5 }, (_, i) => ({
      ...mockTransactions[0],
      id: `t${i}`,
    }));

    render(
      <TransactionsList
        transactions={manyTransactions}
        loading={false}
        showViewMore={true}
        onViewMore={jest.fn()}
      />,
    );

    // Button should still be visible when showViewMore is true
    expect(screen.getByText(/Ver más transacciones/i)).toBeInTheDocument();
  });

  it("shows view more button without limit (cursor-based pagination)", () => {
    const transactions = Array.from({ length: 3 }, (_, i) => ({
      ...mockTransactions[0],
      id: `t${i}`,
    }));

    render(
      <TransactionsList
        transactions={transactions}
        loading={false}
        showViewMore={true}
        onViewMore={jest.fn()}
      />,
    );

    // Button shows even without local limit when showViewMore=true
    expect(screen.getByText(/Ver más transacciones/i)).toBeInTheDocument();
  });

  it("does not show view more button when showViewMore is false", () => {
    const manyTransactions = Array.from({ length: 10 }, (_, i) => ({
      ...mockTransactions[0],
      id: `t${i}`,
    }));

    render(
      <TransactionsList
        transactions={manyTransactions}
        loading={false}
        limit={5}
        showViewMore={false}
      />,
    );

    expect(
      screen.queryByText(/Ver más transacciones/i),
    ).not.toBeInTheDocument();
  });

  it("calls onViewMore when button is clicked", () => {
    const handleViewMore = jest.fn();
    const manyTransactions = Array.from({ length: 10 }, (_, i) => ({
      ...mockTransactions[0],
      id: `t${i}`,
    }));

    render(
      <TransactionsList
        transactions={manyTransactions}
        loading={false}
        limit={5}
        showViewMore={true}
        onViewMore={handleViewMore}
      />,
    );

    const button = screen.getByText(/Ver más transacciones/i);
    button.click();

    expect(handleViewMore).toHaveBeenCalledTimes(1);
  });
});
