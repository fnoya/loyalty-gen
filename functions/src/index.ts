import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express, { Request, Response } from "express";
import cors from "cors";
import {
  errorHandler,
  notFoundHandler,
} from "./api/middleware/error.middleware";
import clientRoutes from "./api/routes/client.routes";

// Initialize Firebase Admin SDK
admin.initializeApp();

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
app.use("/api/v1/clients", clientRoutes);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Export the Express app as a Cloud Function
export const api = functions.https.onRequest(app);
