/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditClientPage from "./page";
import { apiRequest } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

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

// Mock dependencies
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  Plus: () => <span data-testid="icon-plus" />,
  Trash2: () => <span data-testid="icon-trash" />,
}));

// Mock ClientAvatar component
jest.mock("@/components/clients/client-avatar", () => ({
  ClientAvatar: () => <div data-testid="client-avatar">Avatar</div>,
}));

// Mock UI components that might cause issues in JSDOM
jest.mock("@/components/ui/select", () => {
  const React = require("react");
  const SelectContext = React.createContext(null);

  return {
    Select: ({ children, onValueChange, defaultValue, value }: any) => (
      <SelectContext.Provider value={{ onValueChange, defaultValue, value }}>
        <div data-testid="select-container" data-value={value || defaultValue}>
          {children}
        </div>
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

describe("EditClientPage", () => {
  const mockPush = jest.fn();
  const mockClient = {
    id: "123",
    name: {
      firstName: "John",
      secondName: "",
      firstLastName: "Doe",
      secondLastName: "",
    },
    email: "john@example.com",
    identity_document: {
      type: "cedula_identidad",
      number: "123456",
    },
    phones: [],
    addresses: [],
  };

  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: jest.fn(),
    });
    (apiRequest as jest.Mock).mockResolvedValue(mockClient);
  });

  it("renders the form with pre-filled data", async () => {
    render(<EditClientPage />);

    expect(screen.getByText("Loading client details...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
    });
  });

  it("submits the form with updated data", async () => {
    render(<EditClientPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    });

    // Update first name
    const firstNameInput = screen.getByLabelText(/First Name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane");

    // Submit
    const submitButton = screen.getByText("Save Changes");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/clients/123",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"firstName":"Jane"'),
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard/clients/123");
    });
  });
});
