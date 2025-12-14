import request from "supertest";
import app from "../../../app";
import { accountService } from "../../../services/account.service";
import { AppError, NotFoundError } from "../../../core/errors";
import { familyCircleService } from "../../../services/family-circle.service";

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: "test-user" }),
  }),
}));

// Mock Services - Create mock instances
const mockAccountServiceInstance = {
  listAccounts: jest.fn(),
  createAccount: jest.fn(),
  creditPoints: jest.fn(),
  debitPoints: jest.fn(),
  listTransactions: jest.fn(),
  getAllBalances: jest.fn(),
  getAccountBalance: jest.fn(),
};

jest.mock("../../../services/account.service", () => ({
  accountService: {
    get instance() {
      return mockAccountServiceInstance;
    },
  },
}));

// Mock Family Circle Service
jest.mock("../../../services/family-circle.service", () => ({
  familyCircleService: {
    validateMemberTransactionPermission: jest.fn(),
  },
}));

// Mock Auth Middleware
jest.mock("../../middleware/auth.middleware", () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { uid: "test-user" };
    next();
  },
}));

describe("Account Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /v1/clients/:clientId/accounts", () => {
    it("should list all accounts for a client", async () => {
      const mockAccounts = [
        {
          id: "account-1",
          account_name: "Main Account",
          points: 100,
          familyCircleConfig: null,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "account-2",
          account_name: "Bonus Account",
          points: 50,
          familyCircleConfig: null,
          created_at: "2024-01-02T00:00:00.000Z",
          updated_at: "2024-01-02T00:00:00.000Z",
        },
      ];
      (accountService.instance.listAccounts as jest.Mock).mockResolvedValue(
        mockAccounts
      );

      const res = await request(app).get("/v1/clients/client-123/accounts");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockAccounts);
      expect(accountService.instance.listAccounts).toHaveBeenCalledWith(
        "client-123"
      );
    });

    it("should handle client not found", async () => {
      (accountService.instance.listAccounts as jest.Mock).mockRejectedValue(
        new NotFoundError("Client", "invalid-client")
      );

      const res = await request(app).get("/v1/clients/invalid-client/accounts");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /v1/clients/:clientId/accounts", () => {
    it("should create a new account", async () => {
      const mockAccount = {
        id: "account-123",
        account_name: "New Account",
        points: 0,
        familyCircleConfig: null,
        created_at: "2024-01-03T00:00:00.000Z",
        updated_at: "2024-01-03T00:00:00.000Z",
      };
      (accountService.instance.createAccount as jest.Mock).mockResolvedValue(
        mockAccount
      );

      const res = await request(app)
        .post("/v1/clients/client-123/accounts")
        .send({
          account_name: "New Account",
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockAccount);
      expect(accountService.instance.createAccount).toHaveBeenCalledWith(
        "client-123",
        {
          account_name: "New Account",
        },
        { uid: "test-user", email: null }
      );
    });

    it("should handle validation errors for missing account_name", async () => {
      const res = await request(app)
        .post("/v1/clients/client-123/accounts")
        .send({});

      expect(res.status).toBe(400);
    });

    it("should handle client not found", async () => {
      (accountService.instance.createAccount as jest.Mock).mockRejectedValue(
        new NotFoundError("Client", "invalid-client")
      );

      const res = await request(app)
        .post("/v1/clients/invalid-client/accounts")
        .send({
          account_name: "New Account",
        });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /v1/clients/:clientId/accounts/:accountId/credit", () => {
    it("should credit points to an account", async () => {
      const mockAccount = {
        id: "account-123",
        account_name: "Main Account",
        points: 150,
        familyCircleConfig: null,
        created_at: "2024-01-04T00:00:00.000Z",
        updated_at: "2024-01-04T00:00:00.000Z",
      };
      (accountService.instance.creditPoints as jest.Mock).mockResolvedValue(
        mockAccount
      );

      const res = await request(app)
        .post("/v1/clients/client-123/accounts/account-123/credit")
        .send({
          amount: 50,
          description: "Bonus points",
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockAccount);
      expect(accountService.instance.creditPoints).toHaveBeenCalledWith(
        "client-123",
        "account-123",
        {
          amount: 50,
          description: "Bonus points",
        },
        { uid: "test-user", email: null },
        null
      );
    });

    it("should handle validation errors for negative amount", async () => {
      const res = await request(app)
        .post("/v1/clients/client-123/accounts/account-123/credit")
        .send({
          amount: -10,
        });

      expect(res.status).toBe(400);
    });

    it("should handle validation errors for zero amount", async () => {
      const res = await request(app)
        .post("/v1/clients/client-123/accounts/account-123/credit")
        .send({
          amount: 0,
        });

      expect(res.status).toBe(400);
    });

    it("should handle validation errors for fractional amount", async () => {
      const res = await request(app)
        .post("/v1/clients/client-123/accounts/account-123/credit")
        .send({
          amount: 10.5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain("integer");
    });

    it("should handle validation errors for small fractional amount", async () => {
      const res = await request(app)
        .post("/v1/clients/client-123/accounts/account-123/credit")
        .send({
          amount: 0.3,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain("integer");
    });

    it("should handle account not found", async () => {
      (accountService.instance.creditPoints as jest.Mock).mockRejectedValue(
        new NotFoundError("LoyaltyAccount", "invalid-account")
      );

      const res = await request(app)
        .post("/v1/clients/client-123/accounts/invalid-account/credit")
        .send({
          amount: 50,
        });

      expect(res.status).toBe(404);
    });

    it("should credit on behalf of a family member", async () => {
      const mockAccount = {
        id: "account-123",
        account_name: "Main Account",
        points: 200,
        familyCircleConfig: null,
        created_at: "2024-01-04T00:00:00.000Z",
        updated_at: "2024-01-04T00:00:00.000Z",
      };
      (accountService.instance.creditPoints as jest.Mock).mockResolvedValue(
        mockAccount
      );
      (familyCircleService.validateMemberTransactionPermission as jest.Mock).mockResolvedValue(
        "spouse"
      );

      const res = await request(app)
        .post(
          "/v1/clients/client-123/accounts/account-123/credit?on_behalf_of=member-1"
        )
        .send({
          amount: 50,
          description: "Gift",
        });

      expect(res.status).toBe(200);
      expect(familyCircleService.validateMemberTransactionPermission).toHaveBeenCalledWith(
        "client-123",
        "member-1",
        "account-123",
        "credit"
      );
      expect(accountService.instance.creditPoints).toHaveBeenCalledWith(
        "client-123",
        "account-123",
        {
          amount: 50,
          description: "Gift",
        },
        { uid: "test-user", email: null },
        {
          clientId: "member-1",
          isCircleMember: true,
          relationshipType: "spouse",
        }
      );
    });
  });

  describe("POST /v1/clients/:clientId/accounts/:accountId/debit", () => {
    it("should debit points from an account", async () => {
      const mockAccount = {
        id: "account-123",
        account_name: "Main Account",
        points: 50,
        familyCircleConfig: null,
        created_at: "2024-01-05T00:00:00.000Z",
        updated_at: "2024-01-05T00:00:00.000Z",
      };
      (accountService.instance.debitPoints as jest.Mock).mockResolvedValue(
        mockAccount
      );

      const res = await request(app)
        .post("/v1/clients/client-123/accounts/account-123/debit")
        .send({
          amount: 50,
          description: "Redemption",
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockAccount);
      expect(accountService.instance.debitPoints).toHaveBeenCalledWith(
        "client-123",
        "account-123",
        {
          amount: 50,
          description: "Redemption",
        },
        { uid: "test-user", email: null },
        null
      );
    });

    it("should handle insufficient balance", async () => {
      const error = new AppError(
        "Insufficient balance",
        400,
        "INSUFFICIENT_BALANCE"
      );
      (accountService.instance.debitPoints as jest.Mock).mockRejectedValue(
        error
      );

      const res = await request(app)
        .post("/v1/clients/client-123/accounts/account-123/debit")
        .send({
          amount: 1000,
        });

      expect(res.status).toBe(400);
    });

    it("should handle validation errors for negative amount", async () => {
      const res = await request(app)
        .post("/v1/clients/client-123/accounts/account-123/debit")
        .send({
          amount: -10,
        });

      expect(res.status).toBe(400);
    });

    it("should handle validation errors for fractional amount", async () => {
      const res = await request(app)
        .post("/v1/clients/client-123/accounts/account-123/debit")
        .send({
          amount: 50.75,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain("integer");
    });

    it("should handle validation errors for zero amount", async () => {
      const res = await request(app)
        .post("/v1/clients/client-123/accounts/account-123/debit")
        .send({
          amount: 0,
        });

      expect(res.status).toBe(400);
    });

    it("should handle account not found", async () => {
      (accountService.instance.debitPoints as jest.Mock).mockRejectedValue(
        new NotFoundError("LoyaltyAccount", "invalid-account")
      );

      const res = await request(app)
        .post("/v1/clients/client-123/accounts/invalid-account/debit")
        .send({
          amount: 50,
        });

      expect(res.status).toBe(404);
    });

    it("should debit on behalf of a family member", async () => {
      const mockAccount = {
        id: "account-123",
        account_name: "Main Account",
        points: 0,
        familyCircleConfig: null,
        created_at: "2024-01-05T00:00:00.000Z",
        updated_at: "2024-01-05T00:00:00.000Z",
      };
      (accountService.instance.debitPoints as jest.Mock).mockResolvedValue(
        mockAccount
      );
      (familyCircleService.validateMemberTransactionPermission as jest.Mock).mockResolvedValue(
        "child"
      );

      const res = await request(app)
        .post(
          "/v1/clients/client-123/accounts/account-123/debit?on_behalf_of=member-2"
        )
        .send({
          amount: 25,
          description: "Family redemption",
        });

      expect(res.status).toBe(200);
      expect(familyCircleService.validateMemberTransactionPermission).toHaveBeenCalledWith(
        "client-123",
        "member-2",
        "account-123",
        "debit"
      );
      expect(accountService.instance.debitPoints).toHaveBeenCalledWith(
        "client-123",
        "account-123",
        {
          amount: 25,
          description: "Family redemption",
        },
        { uid: "test-user", email: null },
        {
          clientId: "member-2",
          isCircleMember: true,
          relationshipType: "child",
        }
      );
    });
  });

  describe("GET /v1/clients/:clientId/accounts/:accountId/transactions", () => {
    it("should list transactions with pagination", async () => {
      const mockTransactions = [
        {
          id: "tx-1",
          transaction_type: "credit",
          amount: 50,
          description: "Bonus",
          timestamp: "2024-01-06T00:00:00.000Z",
        },
        {
          id: "tx-2",
          transaction_type: "debit",
          amount: 25,
          description: "Redemption",
          timestamp: "2024-01-07T00:00:00.000Z",
        },
      ];
      (accountService.instance.listTransactions as jest.Mock).mockResolvedValue(
        {
          transactions: mockTransactions,
          nextCursor: "next-cursor",
        }
      );

      const res = await request(app).get(
        "/v1/clients/client-123/accounts/account-123/transactions?limit=10"
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockTransactions);
      expect(res.body.paging.next_cursor).toBe("next-cursor");
      expect(accountService.instance.listTransactions).toHaveBeenCalledWith(
        "client-123",
        "account-123",
        10,
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    it("should use default limit of 50", async () => {
      (accountService.instance.listTransactions as jest.Mock).mockResolvedValue(
        {
          transactions: [],
          nextCursor: null,
        }
      );

      const res = await request(app).get(
        "/v1/clients/client-123/accounts/account-123/transactions"
      );

      expect(res.status).toBe(200);
      expect(accountService.instance.listTransactions).toHaveBeenCalledWith(
        "client-123",
        "account-123",
        50,
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    it("should handle limit validation", async () => {
      const res = await request(app).get(
        "/v1/clients/client-123/accounts/account-123/transactions?limit=0"
      );

      expect(res.status).toBe(400);
    });

    it("should handle limit too large", async () => {
      const res = await request(app).get(
        "/v1/clients/client-123/accounts/account-123/transactions?limit=101"
      );

      expect(res.status).toBe(400);
    });

    it("should handle invalid start_date", async () => {
      const res = await request(app).get(
        "/v1/clients/client-123/accounts/account-123/transactions?start_date=not-a-date"
      );

      expect(res.status).toBe(400);
    });

    it("should handle invalid end_date", async () => {
      const res = await request(app).get(
        "/v1/clients/client-123/accounts/account-123/transactions?end_date=bad-date"
      );

      expect(res.status).toBe(400);
    });

    it("should handle start_date after end_date", async () => {
      const res = await request(app).get(
        "/v1/clients/client-123/accounts/account-123/transactions?start_date=2024-02-01T00:00:00Z&end_date=2024-01-01T00:00:00Z"
      );

      expect(res.status).toBe(400);
    });

    it("should handle invalid transaction_type", async () => {
      const res = await request(app).get(
        "/v1/clients/client-123/accounts/account-123/transactions?transaction_type=transfer"
      );

      expect(res.status).toBe(400);
    });

    it("should parse date filters and transaction_type", async () => {
      (accountService.instance.listTransactions as jest.Mock).mockResolvedValue({
        transactions: [],
        nextCursor: null,
      });

      const res = await request(app).get(
        "/v1/clients/client-123/accounts/account-123/transactions?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z&transaction_type=debit"
      );

      expect(res.status).toBe(200);
      expect(accountService.instance.listTransactions).toHaveBeenCalledWith(
        "client-123",
        "account-123",
        50,
        undefined,
        expect.any(Date),
        expect.any(Date),
        "debit"
      );
    });
  });

  describe("GET /v1/clients/:clientId/balance", () => {
    it("should get all balances for a client", async () => {
      const mockBalances = {
        "account-1": 100,
        "account-2": 50,
      };
      (accountService.instance.getAllBalances as jest.Mock).mockResolvedValue(
        mockBalances
      );

      const res = await request(app).get("/v1/clients/client-123/balance");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockBalances);
      expect(accountService.instance.getAllBalances).toHaveBeenCalledWith(
        "client-123"
      );
    });

    it("should handle client not found", async () => {
      (accountService.instance.getAllBalances as jest.Mock).mockRejectedValue(
        new NotFoundError("Client", "invalid-client")
      );

      const res = await request(app).get("/v1/clients/invalid-client/balance");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /v1/clients/:clientId/accounts/:accountId/balance", () => {
    it("should get balance for a specific account", async () => {
      const mockBalance = { points: 100 };
      (
        accountService.instance.getAccountBalance as jest.Mock
      ).mockResolvedValue(mockBalance);

      const res = await request(app).get(
        "/v1/clients/client-123/accounts/account-123/balance"
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockBalance);
      expect(accountService.instance.getAccountBalance).toHaveBeenCalledWith(
        "client-123",
        "account-123"
      );
    });

    it("should handle account not found", async () => {
      (
        accountService.instance.getAccountBalance as jest.Mock
      ).mockRejectedValue(
        new NotFoundError("LoyaltyAccount", "invalid-account")
      );

      const res = await request(app).get(
        "/v1/clients/client-123/accounts/invalid-account/balance"
      );

      expect(res.status).toBe(404);
    });
  });
});
