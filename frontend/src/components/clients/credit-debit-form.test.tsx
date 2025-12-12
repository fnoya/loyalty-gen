import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreditDebitForm } from "./credit-debit-form";
import { apiRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("@/components/ui/toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("lucide-react", () => ({
  Loader2: () => <span data-testid="icon-loader" />,
}));

describe("CreditDebitForm", () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    (apiRequest as jest.Mock).mockClear();
    mockOnSuccess.mockClear();
  });

  describe("Credit form", () => {
    it("renders credit form correctly", () => {
      render(
        <CreditDebitForm
          clientId="client1"
          accountId="acc1"
          type="credit"
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByLabelText(/Cantidad de Puntos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Descripción/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Acreditar" })).toBeInTheDocument();
    });

    it("validates amount minimum value", async () => {
      const user = userEvent.setup();

      render(
        <CreditDebitForm
          clientId="client1"
          accountId="acc1"
          type="credit"
          onSuccess={mockOnSuccess}
        />
      );

      const amountInput = screen.getByLabelText(/Cantidad de Puntos/i);
      await user.type(amountInput, "0");

      const submitButton = screen.getByRole("button", { name: "Acreditar" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/La cantidad debe ser al menos 1 punto/i)
        ).toBeInTheDocument();
      });
    });

    it("successfully credits points", async () => {
      const user = userEvent.setup();
      (apiRequest as jest.Mock).mockResolvedValue({ points: 1100 });

      render(
        <CreditDebitForm
          clientId="client1"
          accountId="acc1"
          type="credit"
          onSuccess={mockOnSuccess}
        />
      );

      const amountInput = screen.getByLabelText(/Cantidad de Puntos/i);
      await user.type(amountInput, "100");

      const descriptionInput = screen.getByLabelText(/Descripción/i);
      await user.type(descriptionInput, "Test credit");

      const submitButton = screen.getByRole("button", { name: "Acreditar" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          "/clients/client1/accounts/acc1/credit",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              amount: 100,
              description: "Test credit",
            }),
          })
        );
        expect(toast.success).toHaveBeenCalledWith("Puntos acreditados exitosamente");
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe("Debit form", () => {
    it("renders debit form with secondary button", () => {
      render(
        <CreditDebitForm
          clientId="client1"
          accountId="acc1"
          type="debit"
          onSuccess={mockOnSuccess}
        />
      );

      const button = screen.getByRole("button", { name: "Debitar" });
      expect(button).toBeInTheDocument();
    });

    it("handles insufficient balance error", async () => {
      const user = userEvent.setup();
      (apiRequest as jest.Mock).mockRejectedValue({
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient balance",
      });

      render(
        <CreditDebitForm
          clientId="client1"
          accountId="acc1"
          type="debit"
          onSuccess={mockOnSuccess}
        />
      );

      const amountInput = screen.getByLabelText(/Cantidad de Puntos/i);
      await user.type(amountInput, "9999");

      const submitButton = screen.getByRole("button", { name: "Debitar" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            /El saldo de la cuenta es insuficiente para realizar el débito/i
          )
        ).toBeInTheDocument();
      });
    });

    it("successfully debits points", async () => {
      const user = userEvent.setup();
      (apiRequest as jest.Mock).mockResolvedValue({ points: 900 });

      render(
        <CreditDebitForm
          clientId="client1"
          accountId="acc1"
          type="debit"
          onSuccess={mockOnSuccess}
        />
      );

      const amountInput = screen.getByLabelText(/Cantidad de Puntos/i);
      await user.type(amountInput, "100");

      const submitButton = screen.getByRole("button", { name: "Debitar" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          "/clients/client1/accounts/acc1/debit",
          expect.objectContaining({
            method: "POST",
          })
        );
        expect(toast.success).toHaveBeenCalledWith("Puntos debitados exitosamente");
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});
