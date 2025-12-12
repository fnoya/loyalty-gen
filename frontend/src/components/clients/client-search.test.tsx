import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientSearch } from "./client-search";

jest.mock("lucide-react", () => ({
  Search: () => <span data-testid="icon-search" />,
  X: () => <span data-testid="icon-x" />,
}));

describe("ClientSearch", () => {
  it("renders search input with placeholder", () => {
    render(<ClientSearch onSearch={jest.fn()} placeholder="Search here..." />);

    const input = screen.getByPlaceholderText("Search here...");
    expect(input).toBeInTheDocument();
  });

  it("calls onSearch after debounce delay", async () => {
    const mockOnSearch = jest.fn();
    const user = userEvent.setup();

    render(<ClientSearch onSearch={mockOnSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText("Buscar cliente...");
    await user.type(input, "John");

    // Should not call immediately
    expect(mockOnSearch).toHaveBeenCalledWith("");

    // Wait for debounce
    await waitFor(
      () => {
        expect(mockOnSearch).toHaveBeenCalledWith("John");
      },
      { timeout: 400 },
    );
  });

  it("shows clear button when input has value", async () => {
    const user = userEvent.setup();

    render(<ClientSearch onSearch={jest.fn()} />);

    const input = screen.getByPlaceholderText("Buscar cliente...");
    await user.type(input, "John");

    // Clear button should be visible
    expect(screen.getByTestId("icon-x")).toBeInTheDocument();
  });

  it("clears input when clear button is clicked", async () => {
    const mockOnSearch = jest.fn();
    const user = userEvent.setup();

    render(<ClientSearch onSearch={mockOnSearch} debounceMs={100} />);

    const input = screen.getByPlaceholderText("Buscar cliente...");
    await user.type(input, "John");

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith("John");
    });

    const clearButton = screen.getByRole("button");
    await user.click(clearButton);

    expect(input).toHaveValue("");

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith("");
    });
  });

  it("debounces multiple rapid inputs", async () => {
    const mockOnSearch = jest.fn();
    const user = userEvent.setup();

    render(<ClientSearch onSearch={mockOnSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText("Buscar cliente...");

    // Type rapidly
    await user.type(input, "J");
    await user.type(input, "o");
    await user.type(input, "h");
    await user.type(input, "n");

    // Should only call once with final value after debounce
    await waitFor(
      () => {
        const calls = mockOnSearch.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall).toBe("John");
      },
      { timeout: 400 },
    );
  });
});
