 
import { render, screen, waitFor } from "@testing-library/react";
import { AffinityGroupsSection } from "../affinity-groups-section";
import { apiRequest } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("lucide-react", () => ({
  Plus: () => <span data-testid="icon-plus" />,
}));

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe("AffinityGroupsSection", () => {
  const mockGroups = [
    {
      id: "g1",
      name: "Gold Members",
      description: "Premium customers",
      created_at: "2024-01-01",
    },
    {
      id: "g2",
      name: "Silver Members",
      description: "Regular customers",
      created_at: "2024-01-02",
    },
  ];

  beforeEach(() => {
    (apiRequest as jest.Mock).mockClear();
  });

  it("renders skeleton while loading", () => {
    (apiRequest as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <AffinityGroupsSection clientId="client1" groupIds={["g1", "g2"]} />,
    );

    expect(screen.getByText("Grupos de Afinidad")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton")).toHaveLength(2);
  });

  it("displays groups as badges", async () => {
    (apiRequest as jest.Mock).mockResolvedValue(mockGroups);

    render(
      <AffinityGroupsSection clientId="client1" groupIds={["g1", "g2"]} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Gold Members")).toBeInTheDocument();
      expect(screen.getByText("Silver Members")).toBeInTheDocument();
    });
  });

  it("displays empty state when no groups", async () => {
    (apiRequest as jest.Mock).mockResolvedValue([]);

    render(<AffinityGroupsSection clientId="client1" groupIds={[]} />);

    await waitFor(() => {
      expect(
        screen.getByText("El cliente no pertenece a ningún grupo de afinidad."),
      ).toBeInTheDocument();
    });
  });

  it("displays link to manage groups", async () => {
    (apiRequest as jest.Mock).mockResolvedValue(mockGroups);

    render(<AffinityGroupsSection clientId="client1" groupIds={["g1"]} />);

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /Gestionar Grupos/i });
      expect(link).toHaveAttribute("href", "/dashboard/clients/client1/groups");
    });
  });
});
