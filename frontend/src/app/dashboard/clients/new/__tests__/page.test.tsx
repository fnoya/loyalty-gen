/* eslint-disable @typescript-eslint/no-require-imports */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewClientPage from "../page";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";

// Mock dependencies
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  Plus: () => <span data-testid="icon-plus" />,
  Trash2: () => <span data-testid="icon-trash" />,
}));

// Mock firebase auth
jest.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue("mock-token"),
    },
  },
}));

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
) as jest.Mock;

// Mock UI components that might cause issues in JSDOM
jest.mock("@/components/ui/select", () => {
  const React = require("react");
  const SelectContext = React.createContext(null);

  return {
    Select: ({ children, onValueChange, defaultValue }: any) => (
      <SelectContext.Provider value={{ onValueChange, defaultValue }}>
        <div data-testid="select-container">{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: any) => (
      <div data-testid="select-trigger">{children}</div>
    ),
    SelectValue: () => null,
    SelectContent: ({ children }: any) => (
      <div data-testid="select-content">{children}</div>
    ),
    SelectItem: ({ value, children }: any) => {
      const { onValueChange } = React.useContext(SelectContext);
      return (
        <div
          role="option"
          aria-selected="false"
          onClick={() => onValueChange(value)}
          data-value={value}
        >
          {children}
        </div>
      );
    },
  };
});

describe("NewClientPage", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: jest.fn(),
    });
    (apiRequest as jest.Mock).mockClear();
  });

  it("renders the form correctly", () => {
    render(<NewClientPage />);

    expect(screen.getByText("New Client")).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Last Name/i)).toBeInTheDocument();
    expect(screen.getByText("Create Client")).toBeInTheDocument();
  });

  it("submits the form with valid data", async () => {
    render(<NewClientPage />);
    const user = userEvent.setup();

    // Fill required fields
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const firstLastNameInput = screen.getByLabelText(/First Last Name/i);
    const docNumberInput = screen.getByLabelText(/Number/i);

    await user.type(firstNameInput, "Jane");
    await user.type(firstLastNameInput, "Doe");
    await user.type(docNumberInput, "123456");

    // Submit
    const submitButton = screen.getByText("Create Client");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/clients",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"firstName":"Jane"'),
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard/clients");
    });
  });

  it("submits the form with only email (relaxed validation)", async () => {
    render(<NewClientPage />);
    const user = userEvent.setup();

    // Fill required fields
    const firstNameInput = screen.getByLabelText(/First Name/i);
    const firstLastNameInput = screen.getByLabelText(/First Last Name/i);
    const emailInput = screen.getByLabelText(/Email/i);

    await user.type(firstNameInput, "Jane");
    await user.type(firstLastNameInput, "Doe");
    await user.type(emailInput, "jane.doe@example.com");

    // Submit
    const submitButton = screen.getByText("Create Client");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/clients",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"email":"jane.doe@example.com"'),
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard/clients");
    });
  });

  it("disables submit button when form is invalid", () => {
    render(<NewClientPage />);

    // Submit button should be disabled initially
    const submitButton = screen.getByText("Create Client");
    expect(submitButton).toBeDisabled();
  });
});
