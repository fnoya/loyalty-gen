import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import app from "./app";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export the Express app as a Cloud Function
export const api = onRequest(app);
