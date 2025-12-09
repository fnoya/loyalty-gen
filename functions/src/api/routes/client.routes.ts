import { Router, Request, Response, NextFunction } from "express";
import { clientService } from "../../services/client.service";
import { photoService } from "../../services/photo.service";
import { authenticate } from "../middleware/auth.middleware";
import { ValidationError } from "../../core/errors";
import Busboy from "busboy";

const router = Router();

// Helper interface for Firebase Functions Request
interface FirebaseRequest extends Request {
  rawBody?: Buffer;
}

/**
 * @route POST /api/v1/clients
 * @desc Create a new client
 * @access Protected
 */
router.post(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const client = await clientService.createClient(req.body);
      res.status(201).json(client);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/clients
 * @desc List clients with pagination
 * @access Protected
 */
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const nextCursor = req.query.next_cursor as string | undefined;

      if (limit < 1 || limit > 100) {
        throw new ValidationError("Limit must be between 1 and 100");
      }

      const { clients, nextCursor: newCursor } =
        await clientService.listClients(limit, nextCursor);

      res.status(200).json({
        data: clients,
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
 * @route GET /api/v1/clients/search
 * @desc Search clients by query string
 * @access Protected
 */
router.get(
  "/search",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 30;

      if (!query) {
        throw new ValidationError("Query parameter 'q' is required");
      }

      if (limit < 1 || limit > 100) {
        throw new ValidationError("Limit must be between 1 and 100");
      }

      const clients = await clientService.searchClients(query, limit);

      // Determine search type for metadata
      const hasDigits = /\d/.test(query);
      const hasLetters = /[a-z]/i.test(query);
      let searchType: "name" | "number" | "multi_field";

      if (hasDigits && !hasLetters) {
        searchType = "number";
      } else if (hasLetters && !hasDigits) {
        searchType = "name";
      } else {
        searchType = "multi_field";
      }

      res.status(200).json({
        data: clients,
        paging: {
          next_cursor: null, // Search doesn't support pagination in MVP
        },
        metadata: {
          total_results: clients.length,
          query: query,
          search_type: searchType,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/v1/clients/:id
 * @desc Get a client by ID
 * @access Protected
 */
router.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const client = await clientService.getClient(req.params.id!);
      res.status(200).json(client);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/v1/clients/:id
 * @desc Update a client
 * @access Protected
 */
router.put(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const client = await clientService.updateClient(req.params.id!, req.body);
      res.status(200).json(client);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/v1/clients/:id
 * @desc Delete a client
 * @access Protected
 */
router.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await clientService.deleteClient(req.params.id!);
      res.status(202).json({
        message: `Client deletion process initiated for ID '${req.params.id}'`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/v1/clients/:id/photo
 * @desc Upload or update client profile photo
 * @access Protected
 */
router.post(
  "/:id/photo",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const busboy = Busboy({ headers: req.headers });
      let fileBuffer: Buffer | null = null;
      let fileMimeType = "";

      busboy.on("file", (fieldname, file, info) => {
        const { mimeType } = info;
        fileMimeType = mimeType;
        const chunks: Buffer[] = [];
        file.on("data", (chunk) => chunks.push(chunk));
        file.on("end", () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });

      busboy.on("finish", async () => {
        try {
          if (!fileBuffer) {
            // If no file uploaded, check if it was a validation error or just missing
            // But here we assume missing if finish is called without file
            throw new ValidationError("No file uploaded");
          }

          await photoService.uploadPhoto(
            req.params.id!,
            fileBuffer,
            fileMimeType
          );

          // Return updated client
          const client = await clientService.getClient(req.params.id!);
          res.status(200).json(client);
        } catch (error) {
          next(error);
        }
      });

      busboy.on("error", (error) => {
        next(error);
      });

      if ((req as FirebaseRequest).rawBody) {
        busboy.end((req as FirebaseRequest).rawBody);
      } else {
        req.pipe(busboy);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/v1/clients/:id/photo
 * @desc Delete client profile photo
 * @access Protected
 */
router.delete(
  "/:id/photo",
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await photoService.deletePhoto(req.params.id!);
      res.status(200).json({
        message: `Profile photo deleted for client '${req.params.id}'`,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
