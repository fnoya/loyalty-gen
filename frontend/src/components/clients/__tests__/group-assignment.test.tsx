import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GroupAssignment } from "./group-assignment";
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
  Plus: () => <span data-testid="icon-plus" />,
  X: () => <span data-testid="icon-x" />,
  Loader2: () => <span data-testid="icon-loader" />,
}));

jest.mock("@/components/ui/alert-dialog", () => {
  const Actual = jest.requireActual("@/components/ui/alert-dialog");
  return {
    ...Actual,
    AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AlertDialogTrigger: ({ children, onClick }: any) => (
      <button onClick={onClick}>{children}</button>
    ),
    AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="alert-dialog">{children}</div>
    ),
  };
});

const mockGroups = [
  { id: "g1", name: "Gold", description: "", created_at: "" },
  { id: "g2", name: "Silver", description: "", created_at: "" },
];

describe("GroupAssignment", () => {
  beforeEach(() => {
    (apiRequest as jest.Mock).mockReset();
    (toast.success as jest.Mock).mockReset();
    (toast.error as jest.Mock).mockReset();
  });

  it("renders assigned groups and loads options", async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce(mockGroups);

    render(
      <GroupAssignment clientId="c1" initialGroupIds={["g1"]} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Gold")).toBeInTheDocument();
    });

    expect(screen.queryByText("Silver")).not.toBeInTheDocument();
  });

  it("adds a group when selected from combobox", async () => {
    (apiRequest as jest.Mock).mockImplementation((endpoint: string, options?: RequestInit) => {
      if (endpoint === "/groups" && !options) return Promise.resolve(mockGroups);
      if (endpoint.includes("/groups/g2/clients") && options?.method === "POST") {
        return Promise.resolve({ message: "ok" });
      }
      return Promise.resolve({});
    });

    render(
      <GroupAssignment clientId="c1" initialGroupIds={["g1"]} />,
    );

    await waitFor(() => screen.getByText("Gold"));

    // Open combobox and select option
    const comboboxButton = screen.getByRole("button", { name: /selecciona un grupo/i });
    await act(async () => {
      fireEvent.click(comboboxButton);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Silver"));
    });

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/groups/g2/clients/c1",
        expect.objectContaining({ method: "POST" }),
      );
      expect(screen.getByText("Silver")).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("removes a group after confirmation", async () => {
    (apiRequest as jest.Mock).mockImplementation((endpoint: string, options?: RequestInit) => {
      if (endpoint === "/groups" && !options) return Promise.resolve(mockGroups);
      if (endpoint.includes("/groups/g1/clients") && options?.method === "DELETE") {
        return Promise.resolve({ message: "ok" });
      }
      return Promise.resolve({});
    });

    render(
      <GroupAssignment clientId="c1" initialGroupIds={["g1"]} />,
    );

    await waitFor(() => screen.getByText("Gold"));

    const removeButton = screen.getByRole("button", { name: /Remover Gold/i });

    fireEvent.click(removeButton);
    await act(async () => {
      fireEvent.click(screen.getByText("Remover"));
    });

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/groups/g1/clients/c1",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(screen.queryByText("Gold")).not.toBeInTheDocument();
      expect(toast.success).toHaveBeenCalled();
    });
  });
});
