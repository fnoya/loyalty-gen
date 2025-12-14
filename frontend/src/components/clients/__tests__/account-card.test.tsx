/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import { AccountCard } from "../account-card";
import { apiRequest } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("lucide-react", () => ({
  Wallet: () => <span data-testid="icon-wallet" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
}));

jest.mock("../transactions-list", () => ({
  TransactionsList: ({ transactions, loading }: any) => (
    <div data-testid="transactions-list">
      {loading ? "Loading..." : `${transactions.length} transactions`}
    </div>
  ),
}));

jest.mock("../credit-debit-form", () => ({
  CreditDebitForm: ({ type, onSuccess }: any) => (
    <div data-testid={`${type}-form`}>
      <button onClick={onSuccess}>{type} form</button>
    </div>
  ),
}));

jest.mock("../transactions-filter", () => ({
  TransactionsFilter: ({ onFilterChange }: any) => (
    <div data-testid="transactions-filter" />
  ),
}));

jest.mock("@/components/ui/select", () => {
  const React = require("react");
  return {
    Select: ({ children, ...props }: any) =>
      React.createElement(
        "div",
        { "data-testid": "select-root", ...props },
        children,
      ),
    SelectGroup: ({ children, ...props }: any) =>
      React.createElement(
        "div",
        { "data-testid": "select-group", ...props },
        children,
      ),
    SelectValue: ({ placeholder }: any) =>
      React.createElement("span", null, placeholder),
    SelectTrigger: ({ children, ...props }: any) =>
      React.createElement(
        "button",
        { "data-testid": "select-trigger", role: "combobox", ...props },
        children,
      ),
    SelectContent: ({ children, ...props }: any) =>
      React.createElement(
        "div",
        { "data-testid": "select-content", ...props },
        children,
      ),
    SelectItem: ({ children, value, ...props }: any) =>
      React.createElement(
        "div",
        { "data-testid": `select-item-${value}`, ...props },
        children,
      ),
    SelectLabel: ({ children, ...props }: any) =>
      React.createElement(
        "label",
        { "data-testid": "select-label", ...props },
        children,
      ),
    SelectSeparator: (props: any) =>
      React.createElement("div", {
        "data-testid": "select-separator",
        ...props,
      }),
    SelectScrollUpButton: (props: any) =>
      React.createElement("div", {
        "data-testid": "select-scroll-up",
        ...props,
      }),
    SelectScrollDownButton: (props: any) =>
      React.createElement("div", {
        "data-testid": "select-scroll-down",
        ...props,
      }),
  };
});

describe("AccountCard", () => {
  const mockTransactions = {
    data: [
      {
        id: "t1",
        transaction_type: "credit",
        amount: 100,
        description: "Test",
        timestamp: "2024-01-01",
        originatedBy: null,
      },
    ],
  };

  beforeEach(() => {
    (apiRequest as jest.Mock).mockClear();
  });

  it("renders account information", () => {
    (apiRequest as jest.Mock).mockResolvedValue(mockTransactions);

    render(
      <AccountCard
        clientId="client1"
        accountId="acc1"
        accountName="Main Rewards"
        currentBalance={1000}
      />,
    );

    expect(screen.getByText("Main Rewards")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument();
    expect(screen.getByText("puntos disponibles")).toBeInTheDocument();
  });

  it("renders credit and debit forms", () => {
    (apiRequest as jest.Mock).mockResolvedValue(mockTransactions);

    render(
      <AccountCard
        clientId="client1"
        accountId="acc1"
        accountName="Main Rewards"
        currentBalance={1000}
      />,
    );

    expect(screen.getByText("Acreditar Puntos")).toBeInTheDocument();
    expect(screen.getByText("Debitar Puntos")).toBeInTheDocument();
    expect(screen.getByTestId("credit-form")).toBeInTheDocument();
    expect(screen.getByTestId("debit-form")).toBeInTheDocument();
  });

  it("fetches and displays transactions", async () => {
    (apiRequest as jest.Mock).mockResolvedValue(mockTransactions);

    render(
      <AccountCard
        clientId="client1"
        accountId="acc1"
        accountName="Main Rewards"
        currentBalance={1000}
      />,
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/clients/client1/accounts/acc1/transactions?limit=5",
      );
      expect(screen.getByText("1 transactions")).toBeInTheDocument();
    });
  });

  it("calls onBalanceUpdate when transaction succeeds", async () => {
    const mockOnBalanceUpdate = jest.fn();
    (apiRequest as jest.Mock).mockResolvedValue(mockTransactions);

    render(
      <AccountCard
        clientId="client1"
        accountId="acc1"
        accountName="Main Rewards"
        currentBalance={1000}
        onBalanceUpdate={mockOnBalanceUpdate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("credit form")).toBeInTheDocument();
    });

    // Simulate successful transaction
    const creditButton = screen.getByText("credit form");
    creditButton.click();

    expect(mockOnBalanceUpdate).toHaveBeenCalled();
  });

  it("displays recent transactions section", async () => {
    (apiRequest as jest.Mock).mockResolvedValue(mockTransactions);

    render(
      <AccountCard
        clientId="client1"
        accountId="acc1"
        accountName="Main Rewards"
        currentBalance={1000}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Transacciones Recientes")).toBeInTheDocument();
    });
  });
});
