import express, { Request, Response } from "express";
import cors from "cors";
import {
  errorHandler,
  notFoundHandler,
} from "./api/middleware/error.middleware";
import clientRoutes from "./api/routes/client.routes";
import groupRoutes from "./api/routes/group.routes";
import accountRoutes from "./api/routes/account.routes";
import auditRoutes from "./api/routes/audit.routes";

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Health check endpoint (public - no auth required)
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "loyalty-gen-api",
    version: "1.0.0",
  });
});

// API v1 routes
app.use("/v1/clients", clientRoutes);
app.use("/v1/groups", groupRoutes);
app.use("/v1", accountRoutes);
app.use("/v1/audit-logs", auditRoutes);
app.use("/v1", auditRoutes); // For /clients/:id/audit-logs paths

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
