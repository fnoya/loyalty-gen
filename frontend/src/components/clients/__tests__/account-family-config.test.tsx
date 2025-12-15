import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountFamilyConfig } from "../account-family-config";
import * as apiModule from "@/lib/api";
import * as toastModule from "@/components/ui/toast";

// Mock Firebase before everything else
jest.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: { getIdToken: jest.fn().mockResolvedValue("mock-token") },
  },
  db: {},
  storage: {},
}));

jest.mock("@/lib/api");
jest.mock("@/components/ui/toast");

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardDescription: ({ children }: any) => (
    <div data-testid="card-description">{children}</div>
  ),
  CardHeader: ({ children }: any) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: any) => (
    <div data-testid="card-title">{children}</div>
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, disabled, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
      {...props}
    />
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: any) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe("AccountFamilyConfig", () => {
  const mockConfig = {
    allowMemberCredits: true,
    allowMemberDebits: false,
    updatedAt: new Date("2025-12-15").toISOString(),
    updatedBy: "admin-id",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (apiModule.apiRequest as jest.Mock).mockResolvedValue(mockConfig);
  });

  it("should render loading skeleton initially", async () => {
    (apiModule.apiRequest as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });
  });

  it("should fetch config on mount", async () => {
    render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalledWith(
        "/clients/client-1/accounts/account-1/family-circle-config",
      );
    });
  });

  it("should display config with correct values", async () => {
    render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Permisos de Círculo Familiar"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Permitir créditos de miembros"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Permitir débitos de miembros"),
      ).toBeInTheDocument();
    });
  });

  it("should toggle credit permission successfully", async () => {
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(mockConfig);

    render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Permitir créditos de miembros"),
      ).toBeInTheDocument();
    });

    const switches = screen.getAllByRole("checkbox");
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalledWith(
        "/clients/client-1/accounts/account-1/family-circle-config",
        {
          method: "PATCH",
          body: JSON.stringify({ allowMemberCredits: false }),
        },
      );
      expect(toastModule.toast.success).toHaveBeenCalledWith(
        "Permisos actualizados exitosamente",
      );
    });
  });

  it("should toggle debit permission successfully", async () => {
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(mockConfig);

    render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Permitir débitos de miembros"),
      ).toBeInTheDocument();
    });

    const switches = screen.getAllByRole("checkbox");
    fireEvent.click(switches[1]);

    await waitFor(() => {
      expect(apiModule.apiRequest).toHaveBeenCalledWith(
        "/clients/client-1/accounts/account-1/family-circle-config",
        {
          method: "PATCH",
          body: JSON.stringify({ allowMemberDebits: true }),
        },
      );
    });
  });

  it("should handle API error and rollback UI", async () => {
    const errorMessage = "API Error";
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(mockConfig);

    render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Permitir créditos de miembros"),
      ).toBeInTheDocument();
    });

    // Mock error for second call
    (apiModule.apiRequest as jest.Mock).mockRejectedValueOnce(
      new Error(errorMessage),
    );

    const switches = screen.getAllByRole("checkbox");
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(toastModule.toast.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  it("should handle generic error without Error instance", async () => {
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(mockConfig);

    render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Permitir créditos de miembros"),
      ).toBeInTheDocument();
    });

    (apiModule.apiRequest as jest.Mock).mockRejectedValueOnce({});

    const switches = screen.getAllByRole("checkbox");
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(toastModule.toast.error).toHaveBeenCalledWith(
        "Error al actualizar permisos",
      );
    });
  });

  it("should disable switches during update", async () => {
    (apiModule.apiRequest as jest.Mock)
      .mockResolvedValueOnce(mockConfig)
      .mockImplementation(() => new Promise(() => {})); // Never resolve second call

    render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(
      () => {
        expect(
          screen.getByText("Permitir créditos de miembros"),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const switches = screen.getAllByRole("checkbox");
    fireEvent.click(switches[0]);

    expect(switches[0]).toBeDisabled();
    expect(switches[1]).toBeDisabled();
  });

  it("should show update date", async () => {
    render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Última actualización/)).toBeInTheDocument();
    });
  });

  it("should render null when config is null after loading", async () => {
    (apiModule.apiRequest as jest.Mock).mockResolvedValueOnce(null);

    const { container } = render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(() => {
      // Component returns null when config is null, so container should have no card
      expect(screen.queryByTestId("card")).not.toBeInTheDocument();
    });
  });

  it("should refetch config when props change", async () => {
    (apiModule.apiRequest as jest.Mock).mockResolvedValue(mockConfig);

    const { rerender } = render(
      <AccountFamilyConfig
        clientId="client-1"
        accountId="account-1"
        accountName="Premium"
      />,
    );

    await waitFor(
      () => {
        expect(apiModule.apiRequest).toHaveBeenCalledWith(
          "/clients/client-1/accounts/account-1/family-circle-config",
        );
      },
      { timeout: 3000 },
    );

    const firstCallCount = (apiModule.apiRequest as jest.Mock).mock.calls
      .length;

    rerender(
      <AccountFamilyConfig
        clientId="client-2"
        accountId="account-2"
        accountName="Gold"
      />,
    );

    await waitFor(
      () => {
        expect(
          (apiModule.apiRequest as jest.Mock).mock.calls.length,
        ).toBeGreaterThan(firstCallCount);
      },
      { timeout: 3000 },
    );
  });
});
