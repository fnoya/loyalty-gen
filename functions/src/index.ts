import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Las rutas se añadirán en tareas posteriores
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export const api = functions.https.onRequest(app);
