import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuditLogsList } from "./audit-logs-list";
import { apiRequest } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("lucide-react", () => ({
  Loader2: () => <span data-testid="icon-loader" />,
  ArrowRight: () => <span data-testid="icon-arrow" />,
  Mail: () => <span data-testid="icon-mail" />,
}));

const baseLog = {
  actor: { id: "u1", email: "user@example.com" },
  metadata: { description: "desc" },
  resource_type: "client",
};

describe("AuditLogsList", () => {
  beforeEach(() => {
    (apiRequest as jest.Mock).mockReset();
  });

  it("loads logs with query params and paginates", async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce({
        data: [
          { ...baseLog, id: "1", action: "create", resource_id: "r1", timestamp: "2023-01-01T00:00:00Z" },
          { ...baseLog, id: "2", action: "update", resource_id: "r2", timestamp: "2023-02-01T00:00:00Z" },
        ],
        paging: { next_cursor: "cursor123" },
      })
      .mockResolvedValueOnce({
        data: [
          { ...baseLog, id: "3", action: "delete", resource_id: "r3", timestamp: "2023-03-01T00:00:00Z" },
        ],
        paging: {},
      });

    render(
      <AuditLogsList
        endpoint="/clients/123/audit-logs"
        query={{ action: "create" }}
        pageSize={5}
      />,
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledTimes(1);
    });

    const items = (await screen.findAllByRole("button")).filter((btn) =>
      btn.textContent?.includes("client ·"),
    );
    expect(items[0]).toHaveTextContent("r2");
    expect(items[1]).toHaveTextContent("r1");

    const loadMore = screen.getByRole("button", { name: /cargar más/i });
    await act(async () => {
      fireEvent.click(loadMore);
    });

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledTimes(2);
      const lastCall = (apiRequest as jest.Mock).mock.calls[1][0];
      expect(String(lastCall)).toContain("next_cursor=cursor123");
      expect(String(lastCall)).toContain("limit=5");
      expect(String(lastCall)).toContain("action=create");
    });

    const refreshedItems = screen
      .getAllByRole("button")
      .filter((btn) => btn.textContent?.includes("client ·"));
    expect(refreshedItems[0]).toHaveTextContent("r3");
  });

  it("shows empty state when no logs", async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce({ data: [] });

    render(<AuditLogsList endpoint="/clients/123/audit-logs" />);

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));

    expect(
      await screen.findByText(/No se encontraron registros de auditoría/i),
    ).toBeInTheDocument();
  });
});
