import { Router, Request, Response, NextFunction } from "express";
import { AuditService } from "../../services/audit.service";
import { authenticate } from "../middleware/auth.middleware";
import { ValidationError } from "../../core/errors";
import { AuditLogQuery } from "../../schemas/audit.schema";
import * as admin from "firebase-admin";

const router = Router();
let auditService: AuditService;

// Lazy initialization of AuditService
const getAuditService = (): AuditService => {
  if (!auditService) {
    auditService = new AuditService(admin.firestore());
  }
  return auditService;
};

/**
 * @route GET /api/v1/audit-logs
 * @desc List audit logs with optional filters
 * @access Protected
 */
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: Record<string, unknown> = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 30,
      };

      if (req.query.action) query.action = req.query.action as string;
      if (req.query.resource_type)
        query.resource_type = req.query.resource_type as string;
      if (req.query.client_id) query.client_id = req.query.client_id as string;
      if (req.query.account_id)
        query.account_id = req.query.account_id as string;
      if (req.query.from_date)
        query.start_date = req.query.from_date as string;
      if (req.query.to_date) query.end_date = req.query.to_date as string;
      if (req.query.next_cursor)
        query.next_cursor = req.query.next_cursor as string;

      // Validate limit
      const limit = query.limit as number;
      if (limit < 1 || limit > 100) {
        throw new ValidationError("Limit must be between 1 and 100");
      }

      const result = await getAuditService().listAuditLogs(
        query as AuditLogQuery
      );

      res.status(200).json({
        data: result.data,
        paging: result.paging,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/clients/:clientId/audit-logs
 * @desc Get audit logs for a specific client
 * @access Protected
 */
router.get(
  "/clients/:clientId/audit-logs",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const next_cursor = req.query.next_cursor as string | undefined;
      const action = req.query.action as string | undefined;

      // Validate limit
      if (limit < 1 || limit > 100) {
        throw new ValidationError("Limit must be between 1 and 100");
      }

      const query: AuditLogQuery = {
        client_id: clientId!,
        limit,
        next_cursor,
      };

      if (action) {
        query.action = action as any;
      }

      const result = await getAuditService().listAuditLogs(query);

      res.status(200).json({
        data: result.data,
        paging: result.paging,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/clients/:clientId/accounts/:accountId/audit-logs
 * @desc Get audit logs for a specific loyalty account
 * @access Protected
 */
router.get(
  "/clients/:clientId/accounts/:accountId/audit-logs",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { accountId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const next_cursor = req.query.next_cursor as string | undefined;
      const action = req.query.action as string | undefined;

      // Validate limit
      if (limit < 1 || limit > 100) {
        throw new ValidationError("Limit must be between 1 and 100");
      }

      const query: AuditLogQuery = {
        account_id: accountId!,
        limit,
        next_cursor,
      };

      if (action) {
        query.action = action as any;
      }

      const result = await getAuditService().listAuditLogs(query);

      res.status(200).json({
        data: result.data,
        paging: result.paging,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
