import { Router, Request, Response, NextFunction } from "express";
import { familyCircleService } from "../../services/family-circle.service";
import {
  authenticate,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import {
  addFamilyCircleMemberRequestSchema,
  updateFamilyCircleConfigRequestSchema,
} from "../../schemas/family-circle.schema";

export const familyCircleRouter = Router();

/**
 * Helper function to extract actor from authenticated request
 */
function getActor(req: Request): { uid: string; email: string | null } {
  const authReq = req as AuthenticatedRequest;
  return {
    uid: authReq.user.uid,
    email: authReq.user.email || null,
  };
}

/**
 * GET /clients/:clientId/family-circle
 * Get family circle information for a client
 */
familyCircleRouter.get(
  "/clients/:clientId/family-circle",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientId } = req.params;
      const info = await familyCircleService.getFamilyCircleInfo(clientId!);

      res.json(info);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /clients/:clientId/family-circle/members
 * Get all members of a family circle (holder only)
 */
familyCircleRouter.get(
  "/clients/:clientId/family-circle/members",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { clientId } = req.params;
      const requesterId = authReq.user.uid;

      const members = await familyCircleService.getFamilyCircleMembers(
        clientId!,
        requesterId
      );

      res.json(members);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /clients/:clientId/family-circle/members
 * Add a member to a family circle
 */
familyCircleRouter.post(
  "/clients/:clientId/family-circle/members",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId } = req.params;
      const actor = getActor(req);
      const validated = addFamilyCircleMemberRequestSchema.parse(req.body);

      const member = await familyCircleService.addFamilyCircleMember(
        clientId!,
        validated,
        actor
      );

      res.status(201).json({
        message: "Family circle member added successfully",
        member,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /clients/:clientId/family-circle/members/:memberId
 * Remove a member from a family circle
 */
familyCircleRouter.delete(
  "/clients/:clientId/family-circle/members/:memberId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, memberId } = req.params;
      const actor = getActor(req);

      await familyCircleService.removeFamilyCircleMember(
        clientId!,
        memberId!,
        actor
      );

      res.json({
        message: "Family circle member removed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /clients/:clientId/accounts/:accountId/family-circle-config
 * Get family circle configuration for a loyalty account
 */
familyCircleRouter.get(
  "/clients/:clientId/accounts/:accountId/family-circle-config",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, accountId } = req.params;

      const config = await familyCircleService.getFamilyCircleConfig(
        clientId!,
        accountId!
      );

      res.json(config);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /clients/:clientId/accounts/:accountId/family-circle-config
 * Update family circle configuration for a loyalty account
 */
familyCircleRouter.patch(
  "/clients/:clientId/accounts/:accountId/family-circle-config",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, accountId } = req.params;
      const actor = getActor(req);
      const validated = updateFamilyCircleConfigRequestSchema.parse(req.body);

      const config = await familyCircleService.updateFamilyCircleConfig(
        clientId!,
        accountId!,
        validated,
        actor
      );

      res.json({
        message: "Family circle configuration updated successfully",
        config,
      });
    } catch (error) {
      next(error);
    }
  }
);
