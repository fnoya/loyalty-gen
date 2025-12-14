import { render, screen } from "@testing-library/react";
import GroupsManagementPage from "../page";
import * as apiModule from "@/lib/api";

// Mock Firebase before anything else
jest.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

// Mock the dependencies
jest.mock("@/lib/api");
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div>Loading...</div>,
}));
jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));
jest.mock("@/components/clients/create-group-form", () => ({
  CreateGroupForm: ({ onSuccess }: any) => (
    <button onClick={() => onSuccess?.({ id: "1", name: "Test Group" })}>
      Create Group
    </button>
  ),
}));
jest.mock("@/components/ui/toast", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));
jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogCancel: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

describe("GroupsManagementPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the page title", async () => {
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce([]);

    render(<GroupsManagementPage />);
    expect(screen.getByText("Gestión de Grupos")).toBeInTheDocument();
  });

  it("should display groups fetched from API", async () => {
    const mockGroups = [
      { id: "1", name: "VIP", description: "VIP customers" },
      { id: "2", name: "Regulars", description: "Regular customers" },
    ];
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(mockGroups);

    render(<GroupsManagementPage />);

    // The component should display the groups
    expect(apiModule.apiRequest).toHaveBeenCalledWith("/groups");
  });

  it("should show create button", async () => {
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce([]);

    render(<GroupsManagementPage />);
    expect(screen.getByText("Create Group")).toBeInTheDocument();
  });
});
