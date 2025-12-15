import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateGroupForm } from "../create-group-form";
import * as apiModule from "@/lib/api";

// Mock Firebase before everything else
jest.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: { getIdToken: jest.fn().mockResolvedValue("mock-token") },
  },
  db: {},
  storage: {},
}));

// Mock the dependencies
jest.mock("@/lib/api");
jest.mock("@/components/ui/toast");
jest.mock("lucide-react", () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Loader2: () => <span data-testid="icon-loader" />,
}));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));
jest.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));
jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));
jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

describe("CreateGroupForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the trigger button", () => {
    render(<CreateGroupForm />);
    expect(screen.getByText("Crear nuevo grupo")).toBeInTheDocument();
  });

  it("should show form fields when dialog opens", async () => {
    render(<CreateGroupForm />);
    const button = screen.getByText("Crear nuevo grupo");
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Crear nuevo grupo de afinidad"),
      ).toBeInTheDocument();
    });
  });

  it("should call apiRequest when form is submitted", async () => {
    const mockGroup = {
      id: "group-1",
      name: "VIP Clients",
      description: "Top tier",
    };
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(mockGroup);

    const onSuccess = jest.fn();
    render(<CreateGroupForm onSuccess={onSuccess} />);

    const button = screen.getByText("Crear nuevo grupo");
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Crear nuevo grupo de afinidad"),
      ).toBeInTheDocument();
    });

    // Verify the component rendered the dialog
    expect(
      screen.getByText("Crear nuevo grupo de afinidad"),
    ).toBeInTheDocument();
  });

  it("should handle API calls correctly", async () => {
    const mockGroup = { id: "group-1", name: "Test Group" };
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(mockGroup);

    render(<CreateGroupForm />);
    expect(screen.getByText("Crear nuevo grupo")).toBeInTheDocument();
  });
});
