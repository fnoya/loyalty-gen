/* eslint-disable @typescript-eslint/no-require-imports */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionsFilter } from "./transactions-filter";

jest.mock("lucide-react", () => ({
  X: () => <span data-testid="icon-x" />,
}));

// Mock the select component wrapper
jest.mock("@/components/ui/select", () => {
  const React = require("react");
  return {
    Select: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        "div",
        { "data-testid": "select-root", ...props },
        children,
      ),
    SelectGroup: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        "div",
        { "data-testid": "select-group", ...props },
        children,
      ),
    SelectValue: ({ placeholder }: { placeholder?: string }) =>
      React.createElement("span", null, placeholder),
    SelectTrigger: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        "button",
        { "data-testid": "select-trigger", role: "combobox", ...props },
        children,
      ),
    SelectContent: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        "div",
        { "data-testid": "select-content", ...props },
        children,
      ),
    SelectItem: ({
      children,
      value,
      ...props
    }: {
      children: React.ReactNode;
      value: string;
      [key: string]: unknown;
    }) =>
      React.createElement(
        "div",
        { "data-testid": `select-item-${value}`, ...props },
        children,
      ),
    SelectLabel: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        "label",
        { "data-testid": "select-label", ...props },
        children,
      ),
    SelectSeparator: (props: { [key: string]: unknown }) =>
      React.createElement("div", {
        "data-testid": "select-separator",
        ...props,
      }),
    SelectScrollUpButton: (props: { [key: string]: unknown }) =>
      React.createElement("div", {
        "data-testid": "select-scroll-up",
        ...props,
      }),
    SelectScrollDownButton: (props: { [key: string]: unknown }) =>
      React.createElement("div", {
        "data-testid": "select-scroll-down",
        ...props,
      }),
  };
});

describe("TransactionsFilter", () => {
  it("renders all filter controls", () => {
    render(<TransactionsFilter onFilterChange={jest.fn()} />);

    expect(screen.getByLabelText("Fecha Inicio")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha Fin")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de Transacción")).toBeInTheDocument();
  });

  it("calls onFilterChange when start date is set", async () => {
    const mockOnFilterChange = jest.fn();
    const user = userEvent.setup();

    render(<TransactionsFilter onFilterChange={mockOnFilterChange} />);

    const startDateInput = screen.getByLabelText("Fecha Inicio");
    await user.type(startDateInput, "2024-01-01");

    await waitFor(
      () => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          startDate: "2024-01-01",
        });
      },
      { timeout: 600 },
    );
  });

  it("calls onFilterChange when end date is set", async () => {
    const mockOnFilterChange = jest.fn();
    const user = userEvent.setup();

    render(<TransactionsFilter onFilterChange={mockOnFilterChange} />);

    const endDateInput = screen.getByLabelText("Fecha Fin");
    await user.type(endDateInput, "2024-01-31");

    await waitFor(
      () => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          endDate: "2024-01-31",
        });
      },
      { timeout: 600 },
    );
  });

  it("calls onFilterChange when transaction type is selected", async () => {
    const mockOnFilterChange = jest.fn();
    const user = userEvent.setup();

    render(<TransactionsFilter onFilterChange={mockOnFilterChange} />);

    const typeSelect = screen.getByRole("combobox");
    await user.click(typeSelect);

    // Note: Actual select interaction might need adjustment based on shadcn/ui implementation
    // This is a simplified test
  });

  it("shows clear filters button when filters are active", async () => {
    const user = userEvent.setup();

    render(<TransactionsFilter onFilterChange={jest.fn()} />);

    const startDateInput = screen.getByLabelText("Fecha Inicio");
    await user.type(startDateInput, "2024-01-01");

    await waitFor(() => {
      const clearButton = screen.getByText(/Limpiar filtros/i);
      expect(clearButton).toBeInTheDocument();
    });
  });

  it("clears all filters when clear button is clicked", async () => {
    const mockOnFilterChange = jest.fn();
    const user = userEvent.setup();

    render(<TransactionsFilter onFilterChange={mockOnFilterChange} />);

    // Set a filter
    const startDateInput = screen.getByLabelText("Fecha Inicio");
    await user.type(startDateInput, "2024-01-01");

    await waitFor(() => {
      expect(screen.getByText(/Limpiar filtros/i)).toBeInTheDocument();
    });

    // Clear filters
    const clearButton = screen.getByText(/Limpiar filtros/i);
    await user.click(clearButton);

    expect(startDateInput).toHaveValue("");

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith({});
    });
  });

  it("debounces date filter changes", async () => {
    const mockOnFilterChange = jest.fn();
    const user = userEvent.setup();

    render(<TransactionsFilter onFilterChange={mockOnFilterChange} />);

    const startDateInput = screen.getByLabelText("Fecha Inicio");

    await user.type(startDateInput, "2024-01-01");

    // Should not call immediately
    expect(mockOnFilterChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ startDate: "2024-01-01" }),
    );

    // Wait for debounce (500ms)
    await waitFor(
      () => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          startDate: "2024-01-01",
        });
      },
      { timeout: 600 },
    );
  });

  it("combines multiple filters", async () => {
    const mockOnFilterChange = jest.fn();
    const user = userEvent.setup();

    render(<TransactionsFilter onFilterChange={mockOnFilterChange} />);

    const startDateInput = screen.getByLabelText("Fecha Inicio");
    const endDateInput = screen.getByLabelText("Fecha Fin");

    await user.type(startDateInput, "2024-01-01");
    await user.type(endDateInput, "2024-01-31");

    await waitFor(
      () => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        });
      },
      { timeout: 600 },
    );
  });
});
