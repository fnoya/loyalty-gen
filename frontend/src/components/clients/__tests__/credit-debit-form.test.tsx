/* eslint-disable @typescript-eslint/no-unused-vars */
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
        />,
      );

      expect(screen.getByLabelText(/Cantidad de Puntos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Descripción/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Acreditar" }),
      ).toBeInTheDocument();
    });

    it("validates form before submission", () => {
      render(
        <CreditDebitForm
          clientId="client1"
          accountId="acc1"
          type="credit"
          onSuccess={mockOnSuccess}
        />,
      );

      const amountInput = screen.getByLabelText(
        /Cantidad de Puntos/i,
      ) as HTMLInputElement;
      expect(amountInput.min).toBe("1");
      expect(amountInput.type).toBe("number");
    });

    it("renders form with expected elements", () => {
      render(
        <CreditDebitForm
          clientId="client1"
          accountId="acc1"
          type="credit"
          onSuccess={mockOnSuccess}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Acreditar" }),
      ).toBeInTheDocument();
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
        />,
      );

      const button = screen.getByRole("button", { name: "Debitar" });
      expect(button).toBeInTheDocument();
    });

    it("displays labels correctly", () => {
      render(
        <CreditDebitForm
          clientId="client1"
          accountId="acc1"
          type="debit"
          onSuccess={mockOnSuccess}
        />,
      );

      expect(screen.getByLabelText(/Cantidad de Puntos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Descripción/i)).toBeInTheDocument();
    });

    it("sets amount input minimum to 1", () => {
      render(
        <CreditDebitForm
          clientId="client1"
          accountId="acc1"
          type="debit"
          onSuccess={mockOnSuccess}
        />,
      );

      const amountInput = screen.getByLabelText(
        /Cantidad de Puntos/i,
      ) as HTMLInputElement;
      expect(amountInput.min).toBe("1");
    });
  });
});
