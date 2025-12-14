import { Router, Request, Response, NextFunction } from "express";
import { accountService } from "../../services/account.service";
import { familyCircleService } from "../../services/family-circle.service";
import {
  authenticate,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import {
  createAccountRequestSchema,
  creditDebitRequestSchema,
} from "../../schemas/account.schema";
import { ValidationError } from "../../core/errors";
import { AuditActor } from "../../schemas/audit.schema";

const router = Router();

/**
 * Helper function to extract actor from authenticated request
 */
function getActor(req: Request): AuditActor {
  const authReq = req as AuthenticatedRequest;
  return {
    uid: authReq.user.uid,
    email: authReq.user.email || null,
  };
}

/**
 * @route GET /api/v1/clients/:clientId/accounts
 * @desc List all loyalty accounts for a client
 * @access Protected
 */
router.get(
  "/clients/:clientId/accounts",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId } = req.params;
      const accounts = await accountService.instance.listAccounts(clientId!);
      res.status(200).json(accounts);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/clients/:clientId/accounts
 * @desc Create a new loyalty account for a client
 * @access Protected
 */
router.post(
  "/clients/:clientId/accounts",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId } = req.params;
      const actor = getActor(req);
      const validated = createAccountRequestSchema.parse(req.body);
      const account = await accountService.instance.createAccount(
        clientId!,
        validated,
        actor
      );
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/clients/:clientId/accounts/:accountId/credit
 * @desc Credit points to a loyalty account
 * @query on_behalf_of - Optional: ID of family circle member crediting on behalf of holder
 * @access Protected
 */
router.post(
  "/clients/:clientId/accounts/:accountId/credit",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, accountId } = req.params;
      const onBehalfOf = req.query.on_behalf_of as string | undefined;
      const actor = getActor(req);
      const validated = creditDebitRequestSchema.parse(req.body);

      // If on_behalf_of is provided, validate family circle permission
      let originator = null;
      if (onBehalfOf) {
        const relationshipType = await familyCircleService.validateMemberTransactionPermission(
          clientId!,
          onBehalfOf,
          accountId!,
          "credit"
        );
        originator = {
          clientId: onBehalfOf,
          isCircleMember: true,
          relationshipType,
        };
      }

      const account = await accountService.instance.creditPoints(
        clientId!,
        accountId!,
        validated,
        actor,
        originator
      );
      res.status(200).json(account);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/clients/:clientId/accounts/:accountId/debit
 * @desc Debit points from a loyalty account
 * @query on_behalf_of - Optional: ID of family circle member debiting on behalf of holder
 * @access Protected
 */
router.post(
  "/clients/:clientId/accounts/:accountId/debit",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, accountId } = req.params;
      const onBehalfOf = req.query.on_behalf_of as string | undefined;
      const actor = getActor(req);
      const validated = creditDebitRequestSchema.parse(req.body);

      // If on_behalf_of is provided, validate family circle permission
      let originator = null;
      if (onBehalfOf) {
        const relationshipType = await familyCircleService.validateMemberTransactionPermission(
          clientId!,
          onBehalfOf,
          accountId!,
          "debit"
        );
        originator = {
          clientId: onBehalfOf,
          isCircleMember: true,
          relationshipType,
        };
      }

      const account = await accountService.instance.debitPoints(
        clientId!,
        accountId!,
        validated,
        actor,
        originator
      );
      res.status(200).json(account);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/clients/:clientId/accounts/:accountId/transactions
 * @desc List transactions for a loyalty account with pagination and filtering
 * @access Protected
 */
router.get(
  "/clients/:clientId/accounts/:accountId/transactions",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, accountId } = req.params;
      const limitParam = req.query.limit as string | undefined;
      const limit = limitParam ? parseInt(limitParam) : 50;
      const nextCursor = req.query.next_cursor as string | undefined;
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;
      const transactionType = req.query.transaction_type as string | undefined;

      if (limit < 1 || limit > 100) {
        throw new ValidationError("Limit must be between 1 and 100");
      }

      // Validate date filters
      let startDateObj: Date | undefined;
      let endDateObj: Date | undefined;

      if (startDate) {
        startDateObj = new Date(startDate);
        if (isNaN(startDateObj.getTime())) {
          throw new ValidationError("start_date must be a valid ISO 8601 date");
        }
      }

      if (endDate) {
        endDateObj = new Date(endDate);
        if (isNaN(endDateObj.getTime())) {
          throw new ValidationError("end_date must be a valid ISO 8601 date");
        }
      }

      if (startDateObj && endDateObj && startDateObj > endDateObj) {
        throw new ValidationError("start_date must be before end_date");
      }

      // Validate transaction type
      if (transactionType && !["credit", "debit"].includes(transactionType)) {
        throw new ValidationError(
          "transaction_type must be 'credit' or 'debit'"
        );
      }

      const { transactions, nextCursor: newCursor } =
        await accountService.instance.listTransactions(
          clientId!,
          accountId!,
          limit,
          nextCursor,
          startDateObj,
          endDateObj,
          transactionType as "credit" | "debit" | undefined
        );

      res.status(200).json({
        data: transactions,
        paging: {
          next_cursor: newCursor,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/clients/:clientId/balance
 * @desc Get all account balances for a client
 * @access Protected
 */
router.get(
  "/clients/:clientId/balance",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId } = req.params;
      const balances = await accountService.instance.getAllBalances(clientId!);
      res.status(200).json(balances);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/clients/:clientId/accounts/:accountId/balance
 * @desc Get balance for a specific account
 * @access Protected
 */
router.get(
  "/clients/:clientId/accounts/:accountId/balance",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, accountId } = req.params;
      const balance = await accountService.instance.getAccountBalance(
        clientId!,
        accountId!
      );
      res.status(200).json(balance);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
