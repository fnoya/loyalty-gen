import { Router, Request, Response, NextFunction } from "express";
import { accountService } from "../../services/account.service";
import { authenticate } from "../middleware/auth.middleware";
import {
  createAccountRequestSchema,
  creditDebitRequestSchema,
} from "../../schemas/account.schema";
import { ValidationError } from "../../core/errors";

const router = Router();

/**
 * @route GET /api/v1/clients/:clientId/accounts
 * @desc List all loyalty accounts for a client
 * @access Protected
 */
router.get(
  "/:clientId/accounts",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId } = req.params;
      const accounts = await accountService.listAccounts(clientId!);
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
  "/:clientId/accounts",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId } = req.params;
      const validated = createAccountRequestSchema.parse(req.body);
      const account = await accountService.createAccount(clientId!, validated);
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/clients/:clientId/accounts/:accountId/credit
 * @desc Credit points to a loyalty account
 * @access Protected
 */
router.post(
  "/:clientId/accounts/:accountId/credit",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, accountId } = req.params;
      const validated = creditDebitRequestSchema.parse(req.body);
      const account = await accountService.creditPoints(
        clientId!,
        accountId!,
        validated
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
 * @access Protected
 */
router.post(
  "/:clientId/accounts/:accountId/debit",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, accountId } = req.params;
      const validated = creditDebitRequestSchema.parse(req.body);
      const account = await accountService.debitPoints(
        clientId!,
        accountId!,
        validated
      );
      res.status(200).json(account);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/clients/:clientId/accounts/:accountId/transactions
 * @desc List transactions for a loyalty account with pagination
 * @access Protected
 */
router.get(
  "/:clientId/accounts/:accountId/transactions",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, accountId } = req.params;
      const limitParam = req.query.limit as string | undefined;
      const limit = limitParam ? parseInt(limitParam) : 50;
      const nextCursor = req.query.next_cursor as string | undefined;

      if (limit < 1 || limit > 100) {
        throw new ValidationError("Limit must be between 1 and 100");
      }

      const { transactions, nextCursor: newCursor } =
        await accountService.listTransactions(
          clientId!,
          accountId!,
          limit,
          nextCursor
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
  "/:clientId/balance",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId } = req.params;
      const balances = await accountService.getAllBalances(clientId!);
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
  "/:clientId/accounts/:accountId/balance",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId, accountId } = req.params;
      const balance = await accountService.getAccountBalance(
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
