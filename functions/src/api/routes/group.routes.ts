import { Router, Request, Response, NextFunction } from "express";
import { groupService } from "../../services/group.service";
import { authenticate } from "../middleware/auth.middleware";
import { createGroupRequestSchema } from "../../schemas/group.schema";

const router = Router();

/**
 * @route GET /api/v1/groups
 * @desc List all affinity groups
 * @access Protected
 */
router.get(
  "/",
  authenticate,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const groups = await groupService.listGroups();
      res.status(200).json(groups);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/groups
 * @desc Create a new affinity group
 * @access Protected
 */
router.post(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = createGroupRequestSchema.parse(req.body);
      const group = await groupService.createGroup(validated);
      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/groups/:groupId/clients/:clientId
 * @desc Assign a client to an affinity group
 * @access Protected
 */
router.post(
  "/:groupId/clients/:clientId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { groupId, clientId } = req.params;
      await groupService.assignClientToGroup(groupId!, clientId!);
      res.status(200).json({
        message: `Client '${clientId}' assigned to group '${groupId}'`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/v1/groups/:groupId/clients/:clientId
 * @desc Remove a client from an affinity group
 * @access Protected
 */
router.delete(
  "/:groupId/clients/:clientId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { groupId, clientId } = req.params;
      await groupService.removeClientFromGroup(groupId!, clientId!);
      res.status(200).json({
        message: `Client '${clientId}' removed from group '${groupId}'`,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
