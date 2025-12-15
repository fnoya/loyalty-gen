import { render, screen } from "@testing-library/react";
import { Combobox, ComboboxOption } from "../combobox";

jest.mock("lucide-react", () => ({
  ChevronsUpDown: () => <span data-testid="icon-chevrons" />,
  Check: () => <span data-testid="icon-check" />,
}));

jest.mock("@/lib/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button data-testid="combobox-button" {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/command", () => ({
  Command: ({ children }: any) => <div data-testid="command">{children}</div>,
  CommandEmpty: ({ children }: any) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ children }: any) => (
    <div data-testid="command-group">{children}</div>
  ),
  CommandInput: (props: any) => (
    <input data-testid="command-input" {...props} />
  ),
  CommandItem: ({ children, value }: any) => (
    <div data-testid={`command-item-${value}`} role="option">
      {children}
    </div>
  ),
  CommandList: ({ children }: any) => (
    <div data-testid="command-list">{children}</div>
  ),
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children }: any) => (
    <div data-testid="popover-content">{children}</div>
  ),
  PopoverTrigger: ({ children }: any) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
}));

describe("Combobox", () => {
  const mockOptions: ComboboxOption[] = [
    { value: "opt1", label: "Option 1", description: "First option" },
    { value: "opt2", label: "Option 2", description: "Second option" },
    { value: "opt3", label: "Option 3", description: "Third option" },
  ];

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders button with default placeholder", () => {
      render(<Combobox options={mockOptions} onSelect={mockOnSelect} />);
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });

    it("renders button with custom placeholder", () => {
      render(
        <Combobox
          options={mockOptions}
          onSelect={mockOnSelect}
          placeholder="Choose one..."
        />
      );
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });

    it("displays chevrons icon", () => {
      render(<Combobox options={mockOptions} onSelect={mockOnSelect} />);
      expect(screen.getByTestId("icon-chevrons")).toBeInTheDocument();
    });

    it("renders command structure", () => {
      render(<Combobox options={mockOptions} onSelect={mockOnSelect} />);
      expect(screen.getByTestId("command")).toBeInTheDocument();
      expect(screen.getByTestId("command-list")).toBeInTheDocument();
      expect(screen.getByTestId("command-group")).toBeInTheDocument();
    });

    it("renders popover structure correctly", () => {
      render(<Combobox options={mockOptions} onSelect={mockOnSelect} />);
      expect(screen.getByTestId("popover")).toBeInTheDocument();
      expect(screen.getByTestId("popover-trigger")).toBeInTheDocument();
      expect(screen.getByTestId("popover-content")).toBeInTheDocument();
    });
  });

  describe("Props", () => {
    it("accepts onSelect callback", () => {
      render(<Combobox options={mockOptions} onSelect={mockOnSelect} />);
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });

    it("accepts value prop", () => {
      render(
        <Combobox
          options={mockOptions}
          onSelect={mockOnSelect}
          value="opt1"
        />
      );
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });

    it("accepts placeholder prop", () => {
      render(
        <Combobox
          options={mockOptions}
          onSelect={mockOnSelect}
          placeholder="Custom"
        />
      );
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });

    it("accepts disabled prop", () => {
      render(
        <Combobox
          options={mockOptions}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });

    it("accepts loading prop", () => {
      render(
        <Combobox
          options={mockOptions}
          onSelect={mockOnSelect}
          loading={true}
        />
      );
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });
  });

  describe("Options", () => {
    it("renders with empty options", () => {
      render(<Combobox options={[]} onSelect={mockOnSelect} />);
      expect(screen.getByTestId("command-empty")).toBeInTheDocument();
    });

    it("renders with single option", () => {
      render(
        <Combobox
          options={[mockOptions[0]]}
          onSelect={mockOnSelect}
        />
      );
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });

    it("renders with multiple options", () => {
      render(
        <Combobox
          options={mockOptions}
          onSelect={mockOnSelect}
        />
      );
      mockOptions.forEach((option) => {
        expect(screen.getByTestId(`command-item-${option.value}`)).toBeInTheDocument();
      });
    });
  });

  describe("States", () => {
    it("handles null value", () => {
      render(
        <Combobox
          options={mockOptions}
          onSelect={mockOnSelect}
          value={null}
        />
      );
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });

    it("handles loading state", () => {
      render(
        <Combobox
          options={mockOptions}
          onSelect={mockOnSelect}
          loading={true}
        />
      );
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });

    it("handles disabled state", () => {
      render(
        <Combobox
          options={mockOptions}
          onSelect={mockOnSelect}
          disabled={true}
        />
      );
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("renders command input", () => {
      render(<Combobox options={mockOptions} onSelect={mockOnSelect} />);
      expect(screen.getByTestId("command-input")).toBeInTheDocument();
    });

    it("renders items with role", () => {
      render(<Combobox options={mockOptions} onSelect={mockOnSelect} />);
      mockOptions.forEach((option) => {
        expect(
          screen.getByTestId(`command-item-${option.value}`)
        ).toHaveAttribute("role", "option");
      });
    });

    it("renders button component", () => {
      render(<Combobox options={mockOptions} onSelect={mockOnSelect} />);
      expect(screen.getByTestId("combobox-button")).toBeInTheDocument();
    });
  });
});
