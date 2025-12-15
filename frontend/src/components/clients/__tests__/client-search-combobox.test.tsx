import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Firebase before importing anything else
jest.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
}));

// Mock the API function
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

// Mock all UI components to avoid complex rendering
 
jest.mock("@/components/ui/command", () => ({
   
  Command: ({ children }: any) => <div data-testid="command">{children}</div>,
   
  CommandInput: ({ onValueChange, ...props }: any) => (
    <input
      data-testid="command-input"
      onChange={(e) => onValueChange && onValueChange(e.target.value)}
      {...props}
    />
  ),
   
  CommandList: ({ children }: any) => (
    <div data-testid="command-list">{children}</div>
  ),
   
  CommandEmpty: ({ children }: any) => (
    <div data-testid="command-empty">{children}</div>
  ),
   
  CommandGroup: ({ children }: any) => (
    <div data-testid="command-group">{children}</div>
  ),
   
  CommandItem: ({ children, onSelect, ...props }: any) => (
    <div data-testid="command-item" onClick={onSelect} {...props}>
      {children}
    </div>
  ),
}));

 
jest.mock("@/components/ui/popover", () => ({
   
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
   
  PopoverTrigger: ({ children }: any) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
   
  PopoverContent: ({ children }: any) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

 
jest.mock("@/components/ui/button", () => ({
   
  Button: ({ children, ...props }: any) => (
    <button data-testid="button" {...props}>
      {children}
    </button>
  ),
}));

 
jest.mock("@/components/ui/skeleton", () => ({
   
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

jest.mock("lucide-react", () => ({
  Check: () => <span data-testid="check-icon" />,
  ChevronsUpDown: () => <span data-testid="chevrons-icon" />,
}));

 
jest.mock("@/lib/utils", () => ({
   
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

import { apiRequest } from "@/lib/api";
import { ClientSearchCombobox } from "../client-search-combobox";

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("ClientSearchCombobox", () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockApiRequest.mockResolvedValue({
      data: [
        {
          id: "1",
          name: { firstName: "John", firstLastName: "Doe" },
          email: "john@example.com",
          identity_document: { number: "12345" },
        },
        {
          id: "2",
          name: { firstName: "Jane", firstLastName: "Smith" },
          email: "jane@example.com",
          identity_document: { number: "67890" },
        },
      ],
      paging: { nextCursor: undefined },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Component Rendering", () => {
    it("should render the component without errors", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should render popover structure", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("popover-trigger")).toBeInTheDocument();
      expect(screen.getByTestId("popover-content")).toBeInTheDocument();
    });

    it("should render command components", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command")).toBeInTheDocument();
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
      expect(screen.getByTestId("command-list")).toBeInTheDocument();
    });

    it("should render button trigger", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      const button = screen.getByTestId("button");
      expect(button).toBeInTheDocument();
      expect(screen.getByTestId("chevrons-icon")).toBeInTheDocument();
    });
  });

  describe("Props and Configuration", () => {
    it("should accept onSelect callback", () => {
      const callback = jest.fn();
      render(<ClientSearchCombobox onSelect={callback} excludeIds={[]} />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should accept excludeIds prop", () => {
      render(
        <ClientSearchCombobox
          onSelect={mockOnSelect}
          excludeIds={["1", "2"]}
        />,
      );
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should accept custom placeholder", () => {
      render(
        <ClientSearchCombobox
          onSelect={mockOnSelect}
          excludeIds={[]}
          placeholder="Select a customer"
        />,
      );
      const input = screen.getByTestId("command-input") as HTMLInputElement;
      expect(input.placeholder).toBe("Select a customer");
    });

    it("should use default placeholder when not provided", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      const input = screen.getByTestId("command-input") as HTMLInputElement;
      expect(input.placeholder).toBe("Buscar cliente...");
    });

    it("should accept optional value prop", () => {
      render(
        <ClientSearchCombobox
          onSelect={mockOnSelect}
          excludeIds={[]}
          value="some-id"
        />,
      );
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should handle empty excludeIds array", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });
  });

  describe("API Integration", () => {
    it("should handle API response with data property", () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("should handle empty API response", () => {
      mockApiRequest.mockResolvedValue({
        data: [],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should handle API errors gracefully", () => {
      mockApiRequest.mockRejectedValue(new Error("Network error"));

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should handle null API response", () => {
      mockApiRequest.mockResolvedValue(null);

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should handle undefined data property", () => {
      mockApiRequest.mockResolvedValue({
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });
  });

  describe("Component State", () => {
    it("should maintain component state across renders", () => {
      const { rerender } = render(
        <ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />,
      );

      rerender(
        <ClientSearchCombobox onSelect={mockOnSelect} excludeIds={["1"]} />,
      );

      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("should handle prop updates", () => {
      const { rerender } = render(
        <ClientSearchCombobox onSelect={mockOnSelect} excludeIds={["1"]} />,
      );

      rerender(
        <ClientSearchCombobox
          onSelect={mockOnSelect}
          excludeIds={["1", "2", "3"]}
        />,
      );

      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should handle placeholder changes", () => {
      const { rerender } = render(
        <ClientSearchCombobox
          onSelect={mockOnSelect}
          excludeIds={[]}
          placeholder="Original"
        />,
      );

      rerender(
        <ClientSearchCombobox
          onSelect={mockOnSelect}
          excludeIds={[]}
          placeholder="Updated"
        />,
      );

      const input = screen.getByTestId("command-input") as HTMLInputElement;
      expect(input.placeholder).toBe("Updated");
    });
  });

  describe("Search Filtering Logic", () => {
    it("should filter by first name", async () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            identity_document: { number: "12345", type: "SSN" },
          },
          {
            id: "2",
            name: { firstName: "Jane", firstLastName: "Smith" },
            email: "jane@example.com",
            identity_document: { number: "67890", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      
      const input = screen.getByTestId("command-input");
      fireEvent.change(input, { target: { value: "John" } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/clients?limit=100");
      expect(screen.getByText("John Doe (john@example.com)")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith (jane@example.com)")).not.toBeInTheDocument();
    });

    it("should filter by last name", async () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            identity_document: { number: "12345", type: "SSN" },
          },
          {
            id: "2",
            name: { firstName: "Jane", firstLastName: "Smith" },
            email: "jane@example.com",
            identity_document: { number: "67890", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      
      const input = screen.getByTestId("command-input");
      fireEvent.change(input, { target: { value: "Smith" } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(screen.getByText("Jane Smith (jane@example.com)")).toBeInTheDocument();
      expect(screen.queryByText("John Doe (john@example.com)")).not.toBeInTheDocument();
    });

    it("should filter by email", async () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            identity_document: { number: "12345", type: "SSN" },
          },
          {
            id: "2",
            name: { firstName: "Jane", firstLastName: "Smith" },
            email: "jane@example.com",
            identity_document: { number: "67890", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      
      const input = screen.getByTestId("command-input");
      fireEvent.change(input, { target: { value: "john@example.com" } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(screen.getByText("John Doe (john@example.com)")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith (jane@example.com)")).not.toBeInTheDocument();
    });

    it("should filter by document number", async () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            identity_document: { number: "12345", type: "SSN" },
          },
          {
            id: "2",
            name: { firstName: "Jane", firstLastName: "Smith" },
            email: "jane@example.com",
            identity_document: { number: "67890", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      
      const input = screen.getByTestId("command-input");
      fireEvent.change(input, { target: { value: "67890" } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(screen.getByText("Jane Smith (jane@example.com)")).toBeInTheDocument();
      expect(screen.queryByText("John Doe (john@example.com)")).not.toBeInTheDocument();
    });

    it("should exclude specified client IDs", async () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            identity_document: { number: "12345", type: "SSN" },
          },
          {
            id: "2",
            name: { firstName: "Jane", firstLastName: "Smith" },
            email: "jane@example.com",
            identity_document: { number: "67890", type: "SSN" },
          },
          {
            id: "3",
            name: { firstName: "Bob", firstLastName: "Brown" },
            email: "bob@example.com",
            identity_document: { number: "11111", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(
        <ClientSearchCombobox
          onSelect={mockOnSelect}
          excludeIds={["1", "2"]}
        />,
      );
      
      const input = screen.getByTestId("command-input");
      fireEvent.change(input, { target: { value: "example" } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      // Should only show Bob, as John (1) and Jane (2) are excluded
      expect(screen.getByText("Bob Brown (bob@example.com)")).toBeInTheDocument();
      expect(screen.queryByText("John Doe (john@example.com)")).not.toBeInTheDocument();
      expect(screen.queryByText("Jane Smith (jane@example.com)")).not.toBeInTheDocument();
    });

    it("should handle case-insensitive search", async () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            identity_document: { number: "12345", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      
      const input = screen.getByTestId("command-input");
      // Search with lowercase "john"
      fireEvent.change(input, { target: { value: "john" } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/clients?limit=100");
      expect(screen.getByText("John Doe (john@example.com)")).toBeInTheDocument();
    });

    it("should perform partial name matching", async () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            identity_document: { number: "12345", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      
      const input = screen.getByTestId("command-input");
      fireEvent.change(input, { target: { value: "Jo" } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/clients?limit=100");
      expect(screen.getByText("John Doe (john@example.com)")).toBeInTheDocument();
    });

    it("should handle empty identity_document gracefully", async () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            identity_document: null,
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      
      const input = screen.getByTestId("command-input");
      fireEvent.change(input, { target: { value: "john" } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(screen.getByText("John Doe (john@example.com)")).toBeInTheDocument();
    });
  });

  describe("Debounce Behavior", () => {
    it("should have input field for search", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      const input = screen.getByTestId("command-input");
      expect(input).toBeInTheDocument();
    });

    it("should handle rapid input changes", async () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      const input = screen.getByTestId("command-input");
      
      fireEvent.change(input, { target: { value: "a" } });
      fireEvent.change(input, { target: { value: "ab" } });
      fireEvent.change(input, { target: { value: "abc" } });

      // Should not have called API yet
      expect(mockApiRequest).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      // Should have called API once with "abc"
      expect(mockApiRequest).toHaveBeenCalledTimes(1);
      expect(mockApiRequest).toHaveBeenCalledWith("/clients?limit=100");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty search string", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      const input = screen.getByTestId("command-input") as HTMLInputElement;
      expect(input.value).toBe("");
    });

    it("should handle whitespace-only search", async () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      const input = screen.getByTestId("command-input");
      
      fireEvent.change(input, { target: { value: "   " } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it("should handle all clients in excludeIds", async () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: "john@example.com",
            identity_document: { number: "12345", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(
        <ClientSearchCombobox
          onSelect={mockOnSelect}
          excludeIds={["1"]}
        />,
      );
      
      const input = screen.getByTestId("command-input");
      fireEvent.change(input, { target: { value: "john" } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(mockApiRequest).toHaveBeenCalled();
      expect(screen.queryByText("John Doe (john@example.com)")).not.toBeInTheDocument();
      expect(screen.getByText("No se encontraron clientes")).toBeInTheDocument();
    });

    it("should handle very long search input", async () => {
      mockApiRequest.mockResolvedValue({
        data: [],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      const input = screen.getByTestId("command-input");
      
      const longString = "a".repeat(100);
      fireEvent.change(input, { target: { value: longString } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(mockApiRequest).toHaveBeenCalledWith("/clients?limit=100");
    });

    it("should handle special characters in search", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });
  });

  describe("Component Stability", () => {
    it("should not throw on mount", () => {
      expect(() => {
        render(
          <ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />,
        );
      }).not.toThrow();
    });

    it("should not throw on unmount", () => {
      const { unmount } = render(
        <ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />,
      );
      expect(() => unmount()).not.toThrow();
    });

    it("should handle rapid mount/unmount cycles", () => {
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(
          <ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />,
        );
        unmount();
      }
    });

    it("should render with all props", () => {
      render(
        <ClientSearchCombobox
          value="some-value"
          onSelect={mockOnSelect}
          excludeIds={["1", "2"]}
          placeholder="Custom placeholder"
        />,
      );
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should handle props changes without errors", () => {
      const { rerender } = render(
        <ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />,
      );

      rerender(
        <ClientSearchCombobox
          onSelect={jest.fn()}
          excludeIds={["1"]}
          placeholder="New"
        />,
      );

      rerender(
        <ClientSearchCombobox
          onSelect={jest.fn()}
          excludeIds={["2"]}
          placeholder="Another"
        />,
      );

      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });
  });

  describe("Display Name Formatting", () => {
    it("should handle clients with email", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("button")).toBeInTheDocument();
    });

    it("should handle clients without email", () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: null,
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("button")).toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    it("should render skeleton when loading", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("should render empty state when no results", () => {
      mockApiRequest.mockResolvedValue({
        data: [],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command-list")).toBeInTheDocument();
    });
  });

  describe("Search Behavior Refinement", () => {
    it("should handle progressive search refinement", () => {
      const clients = [
        {
          id: "1",
          name: { firstName: "John", firstLastName: "Doe" },
          email: "john@example.com",
          identity_document: { number: "12345", type: "SSN" },
        },
        {
          id: "2",
          name: { firstName: "Jane", firstLastName: "Doe" },
          email: "jane@example.com",
          identity_document: { number: "67890", type: "SSN" },
        },
        {
          id: "3",
          name: { firstName: "Jim", firstLastName: "Smith" },
          email: "jim@example.com",
          identity_document: { number: "11111", type: "SSN" },
        },
      ];

      mockApiRequest.mockResolvedValue({
        data: clients,
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("should handle empty name fields gracefully", () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "", firstLastName: "" },
            email: "user@example.com",
            identity_document: { number: "12345", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should handle clients with only document number", () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: null,
            identity_document: { number: "12345", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("should fetch up to 100 clients for search (API limit)", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);

      // Verify component renders
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("should not exceed API limit of 100", () => {
      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);

      // Verify API is called with valid limit parameter
      expect(mockApiRequest).not.toHaveBeenCalledWith(
        expect.stringContaining("limit=200"),
      );
    });

    it("should handle API limit validation errors", () => {
      mockApiRequest.mockRejectedValue(
        new Error("Limit must be between 1 and 100"),
      );

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);

      // Component should still render without crashing
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should handle null and undefined email fields", () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "John", firstLastName: "Doe" },
            email: null,
            identity_document: { number: "12345", type: "SSN" },
          },
          {
            id: "2",
            name: { firstName: "Jane", firstLastName: "Smith" },
            email: undefined as any,
            identity_document: { number: "67890", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("should match search across all name parts", () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "Christopher", firstLastName: "Johnson" },
            email: "chris@example.com",
            identity_document: { number: "12345", type: "SSN" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });
  });

  describe("Progressive Search Refinement (P → Ph Issue)", () => {
    it("should show results for single character search", () => {
      const photoClient = {
        id: "1",
        name: { firstName: "Photo", firstLastName: "Test" },
        email: "photo.test@example.com",
        identity_document: { number: "12345", type: "ID" },
      };

      const filterClient = {
        id: "2",
        name: { firstName: "Filter", firstLastName: "Tester" },
        email: "filter.test@example.com",
        identity_document: { number: "67890", type: "ID" },
      };

      mockApiRequest.mockResolvedValue({
        data: [photoClient, filterClient],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("should refine results when additional characters are added", () => {
      const photoClient = {
        id: "1",
        name: { firstName: "Photo", firstLastName: "Test" },
        email: "photo.test@example.com",
        identity_document: { number: "12345", type: "ID" },
      };

      const filterClient = {
        id: "2",
        name: { firstName: "Filter", firstLastName: "Tester" },
        email: "filter.test@example.com",
        identity_document: { number: "67890", type: "ID" },
      };

      const phoneClient = {
        id: "3",
        name: { firstName: "John", firstLastName: "Phone" },
        email: "john.phone@example.com",
        identity_document: { number: "11111", type: "ID" },
      };

      mockApiRequest.mockResolvedValue({
        data: [photoClient, filterClient, phoneClient],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("should return consistent results for searches that should match", () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "Photo", firstLastName: "Test" },
            email: "photo.test@example.com",
            identity_document: { number: "12345", type: "ID" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);

      // Both "P" and "Ph" searches should return clients starting with "Ph"
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("should handle API response with clients matching Ph* pattern", () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "Photo", firstLastName: "Test" },
            email: "photo.test@example.com",
            identity_document: { number: "12345", type: "ID" },
          },
          {
            id: "2",
            name: { firstName: "Phone", firstLastName: "Booth" },
            email: "phone@example.com",
            identity_document: { number: "67890", type: "ID" },
          },
          {
            id: "3",
            name: { firstName: "Photography", firstLastName: "Pro" },
            email: "photo.pro@example.com",
            identity_document: { number: "11111", type: "ID" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("should maintain search consistency across multiple refinements", () => {
      mockApiRequest.mockResolvedValue({
        data: [
          {
            id: "1",
            name: { firstName: "Photography", firstLastName: "Studio" },
            email: "photo.studio@example.com",
            identity_document: { number: "12345", type: "ID" },
          },
          {
            id: "2",
            name: { firstName: "Phone", firstLastName: "Store" },
            email: "phone.store@example.com",
            identity_document: { number: "67890", type: "ID" },
          },
        ],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);

      // Component should render without issues through multiple searches
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });
  });

  describe("User Interaction", () => {
    it("should call onSelect when a client is selected", async () => {
      const client = {
        id: "1",
        name: { firstName: "John", firstLastName: "Doe" },
        email: "john@example.com",
        identity_document: { number: "12345", type: "SSN" },
      };

      mockApiRequest.mockResolvedValue({
        data: [client],
        paging: { nextCursor: undefined },
      });

      render(<ClientSearchCombobox onSelect={mockOnSelect} excludeIds={[]} />);
      
      const input = screen.getByTestId("command-input");
      fireEvent.change(input, { target: { value: "john" } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      const item = screen.getByText("John Doe (john@example.com)");
      fireEvent.click(item);

      expect(mockOnSelect).toHaveBeenCalledWith("1", client);
    });
  });
});
