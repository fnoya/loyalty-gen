import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import app from "./app";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export the Express app as a Cloud Function
export const api = functions.https.onRequest(app);
