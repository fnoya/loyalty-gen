import { render, screen, waitFor } from "@testing-library/react";
import { AccountsSummary } from "./accounts-summary";
import { apiRequest } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("lucide-react", () => ({
  Wallet: () => <span data-testid="icon-wallet" />,
}));

describe("AccountsSummary", () => {
  const mockBalances = {
    acc1: 1000,
    acc2: 500,
  };

  const mockAccounts = [
    {
      id: "acc1",
      account_name: "Main Rewards",
      points: 1000,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    {
      id: "acc2",
      account_name: "Bonus Points",
      points: 500,
      created_at: "2024-01-02",
      updated_at: "2024-01-02",
    },
  ];

  beforeEach(() => {
    (apiRequest as jest.Mock).mockClear();
  });

  it("renders skeleton while loading", () => {
    (apiRequest as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<AccountsSummary clientId="client1" />);

    expect(
      screen.getByText("Resumen de Cuentas de Lealtad"),
    ).toBeInTheDocument();
  });

  it("displays all accounts with balances", async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce(mockBalances)
      .mockResolvedValueOnce(mockAccounts);

    render(<AccountsSummary clientId="client1" />);

    await waitFor(() => {
      expect(screen.getByText("Main Rewards")).toBeInTheDocument();
      expect(screen.getByText("Bonus Points")).toBeInTheDocument();
    });
  });

  it("displays total points summary", async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce(mockBalances)
      .mockResolvedValueOnce(mockAccounts);

    render(<AccountsSummary clientId="client1" />);

    await waitFor(() => {
      expect(screen.getByText(/1\D*500.*puntos totales/i)).toBeInTheDocument();
      expect(screen.getByText(/2 cuentas/i)).toBeInTheDocument();
    });
  });

  it("displays empty state when no accounts", async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce([]);

    render(<AccountsSummary clientId="client1" />);

    await waitFor(() => {
      expect(
        screen.getByText("El cliente aún no tiene cuentas de lealtad."),
      ).toBeInTheDocument();
    });
  });

  it("displays error message on failure", async () => {
    (apiRequest as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<AccountsSummary clientId="client1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Error al cargar los datos de las cuentas/i),
      ).toBeInTheDocument();
    });
  });
});
