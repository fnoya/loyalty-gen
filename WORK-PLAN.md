# WORK-PLAN.md - Plan de Trabajo para el MVP de LoyaltyGen

Este documento desglosa el trabajo necesario para implementar la primera versión (MVP) de la plataforma LoyaltyGen. Está dividido en Épicas y Tareas, con instrucciones específicas para cada una, diseñadas para ser ejecutadas por agentes de IA.

> **Nota para Agentes de IA:** 
> - Cada tarea incluye **Dependencias**, **Archivos a Crear/Modificar**, **Criterios de Aceptación** y una **Lista de Verificación**.
> - Completa las tareas en orden numérico dentro de cada épica.
> - Antes de comenzar una tarea, verifica que sus dependencias estén completadas.
> - Consulta siempre los documentos de referencia indicados (`openapi.yaml`, `docs/*.md`).

---

## Épica 1: Configuración del Proyecto y Core del Backend

**Objetivo:** Establecer la estructura base del backend, incluyendo la configuración del proyecto, dependencias y los middlewares esenciales para la operativa de la API.

**Orden de Ejecución:** Tarea 1.1 → Tarea 1.2 → Tarea 1.3

---

### Tarea 1.1: Andamiaje del Proyecto Backend

**Dependencias:** Ninguna (tarea inicial)

**Documentos de Referencia:**
-   `docs/ARCHITECTURE.md` - Sección 12 (Estructura de Directorios)
-   `docs/GUIDELINES.md` - Secciones 1, 2, 4

**Archivos a Crear:**
```
functions/
├── src/
│   ├── api/
│   │   ├── routes/          # (vacío por ahora)
│   │   └── middleware/      # (vacío por ahora)
│   ├── core/
│   │   └── errors.ts        # Clases de error personalizadas
│   ├── services/            # (vacío por ahora)
│   ├── schemas/             # (vacío por ahora)
│   └── index.ts             # Punto de entrada de la Cloud Function
├── package.json
├── tsconfig.json
├── .eslintrc.js
└── .prettierrc
```

**Instrucciones Detalladas:**
1.  Crea el directorio `functions/` en la raíz del proyecto.
2.  Dentro de `functions/`, ejecuta `npm init -y`.
3.  Crea la estructura de directorios exacta mostrada arriba.
4.  Instala las dependencias de producción:
    ```bash
    npm install express firebase-admin firebase-functions zod cors
    ```
5.  Instala las dependencias de desarrollo:
    ```bash
    npm install -D typescript @types/node @types/express @types/cors ts-node eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier
    ```
6.  Crea `tsconfig.json` con la siguiente configuración:
    ```json
    {
      "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": ["ES2020"],
        "outDir": "./lib",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "declaration": true,
        "declarationMap": true
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules", "lib"]
    }
    ```
7.  Crea `.eslintrc.js` con reglas de TypeScript estrictas (prohibir `any`).
8.  Crea `.prettierrc` con configuración estándar.
9.  En `src/index.ts`, configura Express con CORS y exporta como Cloud Function:
    ```typescript
    import * as functions from 'firebase-functions';
    import express from 'express';
    import cors from 'cors';

    const app = express();
    app.use(cors({ origin: true }));
    app.use(express.json());

    // Las rutas se añadirán en tareas posteriores
    app.get('/health', (req, res) => res.json({ status: 'ok' }));

    export const api = functions.https.onRequest(app);
    ```
10. En `src/core/errors.ts`, crea las clases de error base:
    ```typescript
    export class AppError extends Error {
      constructor(public code: string, message: string, public statusCode: number) {
        super(message);
        this.name = 'AppError';
      }
    }
    
    export class NotFoundError extends AppError {
      constructor(resource: string, id: string) {
        super('RESOURCE_NOT_FOUND', `${resource} con ID '${id}' no fue encontrado.`, 404);
      }
    }
    
    export class ConflictError extends AppError {
      constructor(message: string) {
        super('CONFLICT', message, 409);
      }
    }
    
    export class ValidationError extends AppError {
      constructor(message: string) {
        super('VALIDATION_FAILED', message, 400);
      }
    }
    
    export class MissingIdentifierError extends AppError {
      constructor() {
        super('MISSING_IDENTIFIER', 'Debe proporcionar al menos un identificador: email o documento de identidad.', 400);
      }
    }
    
    export class InsufficientBalanceError extends AppError {
      constructor() {
        super('INSUFFICIENT_BALANCE', 'El saldo de la cuenta es insuficiente para realizar el débito.', 400);
      }
    }
    ```
11. Añade los scripts a `package.json`:
    ```json
    "scripts": {
      "build": "tsc",
      "serve": "npm run build && firebase emulators:start --only functions",
      "lint": "eslint src/**/*.ts",
      "lint:fix": "eslint src/**/*.ts --fix"
    }
    ```

**Criterios de Aceptación:**
-   [ ] El proyecto compila sin errores (`npm run build`)
-   [ ] ESLint no reporta errores (`npm run lint`)
-   [ ] La estructura de directorios coincide con la especificada
-   [ ] El endpoint `/health` responde con `{"status": "ok"}`

---

### Tarea 1.2: Implementación del Middleware de Autenticación

**Dependencias:** Tarea 1.1 completada

**Documentos de Referencia:**
-   `openapi.yaml` - Sección `securitySchemes` y `components/responses/Unauthorized`
-   `docs/API-DESIGN.md` - Sección 3 (Autenticación)
-   `docs/GUIDELINES.md` - Sección 9 (Logging Seguro)

**Archivos a Crear:**
```
functions/src/api/middleware/
├── auth.middleware.ts
└── index.ts
```

**Instrucciones Detalladas:**
1.  Crea `src/api/middleware/auth.middleware.ts`:
    ```typescript
    import { Request, Response, NextFunction } from 'express';
    import * as admin from 'firebase-admin';
    
    // Extender el tipo Request para incluir el usuario autenticado
    declare global {
      namespace Express {
        interface Request {
          user?: admin.auth.DecodedIdToken;
        }
      }
    }
    
    export const authMiddleware = async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'El token de autenticación falta o tiene un formato inválido.'
          }
        });
        return;
      }
      
      const token = authHeader.split('Bearer ')[1];
      
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
      } catch (error) {
        // NO registrar el token en los logs (política de seguridad)
        console.error('Error verificando token de autenticación');
        res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'El token de autenticación es inválido o ha expirado.'
          }
        });
      }
    };
    ```
2.  Crea `src/api/middleware/index.ts` para exportar todos los middlewares:
    ```typescript
    export { authMiddleware } from './auth.middleware';
    ```

**Criterios de Aceptación:**
-   [ ] El middleware extrae correctamente el token del header `Authorization: Bearer <token>`
-   [ ] Responde con `401` y formato de error correcto cuando el token falta
-   [ ] Responde con `401` y formato de error correcto cuando el token es inválido
-   [ ] Adjunta `req.user` con los datos decodificados cuando el token es válido
-   [ ] NO registra el token ni información sensible en los logs

---

### Tarea 1.3: Implementación del Middleware de Manejo de Errores

**Dependencias:** Tareas 1.1 y 1.2 completadas

**Documentos de Referencia:**
-   `openapi.yaml` - Schema `Error`
-   `docs/ARCHITECTURE.md` - Sección 7 (Estrategia de Manejo de Errores)
-   `docs/API-DESIGN.md` - Sección 4.2 (Respuestas de Error Estandarizadas)

**Archivos a Crear/Modificar:**
```
functions/src/api/middleware/
└── error.middleware.ts  # CREAR
functions/src/index.ts   # MODIFICAR (añadir middleware al final)
```

**Instrucciones Detalladas:**
1.  Crea `src/api/middleware/error.middleware.ts`:
    ```typescript
    import { Request, Response, NextFunction } from 'express';
    import { ZodError } from 'zod';
    import { AppError } from '../../core/errors';
    
    export const errorMiddleware = (
      err: Error,
      req: Request,
      res: Response,
      _next: NextFunction
    ): void => {
      // Manejar errores de validación de Zod
      if (err instanceof ZodError) {
        const firstError = err.errors[0];
        res.status(400).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: `El campo '${firstError.path.join('.')}' ${firstError.message.toLowerCase()}`
          }
        });
        return;
      }
      
      // Manejar errores de aplicación personalizados
      if (err instanceof AppError) {
        res.status(err.statusCode).json({
          error: {
            code: err.code,
            message: err.message
          }
        });
        return;
      }
      
      // Registrar errores no esperados (sin stack trace en producción)
      console.error('Error no manejado:', err.message);
      
      // Error genérico para errores no manejados
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error inesperado en el servidor.'
        }
      });
    };
    ```
2.  Añade la exportación en `src/api/middleware/index.ts`:
    ```typescript
    export { authMiddleware } from './auth.middleware';
    export { errorMiddleware } from './error.middleware';
    ```
3.  Modifica `src/index.ts` para usar el middleware de errores **al final** de la pila:
    ```typescript
    import { errorMiddleware } from './api/middleware';
    
    // ... (rutas se añadirán aquí)
    
    // Middleware de errores DEBE ir al final
    app.use(errorMiddleware);
    
    export const api = functions.https.onRequest(app);
    ```

**Criterios de Aceptación:**
-   [ ] Los errores de Zod se formatean correctamente con código `VALIDATION_FAILED`
-   [ ] Los errores `AppError` se formatean con su código y statusCode correspondiente
-   [ ] Los errores no manejados devuelven `500` con `INTERNAL_SERVER_ERROR`
-   [ ] El formato de respuesta coincide exactamente con el schema `Error` de `openapi.yaml`
-   [ ] No se exponen stack traces en las respuestas

---

## Épica 2: Implementación de la API (Dominios)

**Objetivo:** Desarrollar todos los endpoints de la API definidos en el contrato de OpenAPI.

**Orden de Ejecución:** Tarea 2.1 → Tarea 2.2 → Tarea 2.3 → Tarea 2.4

---

### Tarea 2.1: Schemas de Zod y Tipos de TypeScript

**Dependencias:** Épica 1 completada

**Documentos de Referencia:**
-   `openapi.yaml` - Sección `components/schemas`
-   `docs/GUIDELINES.md` - Sección 3 (Zod como Única Fuente de Verdad)

**Archivos a Crear:**
```
functions/src/schemas/
├── client.schema.ts
├── group.schema.ts
├── account.schema.ts
├── transaction.schema.ts
├── common.schema.ts
└── index.ts
```

**Instrucciones Detalladas:**
1.  Crea `src/schemas/common.schema.ts` con schemas compartidos:
    ```typescript
    import { z } from 'zod';
    
    export const paginationParamsSchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(30),
      next_cursor: z.string().optional()
    });
    
    export type PaginationParams = z.infer<typeof paginationParamsSchema>;
    
    export interface PaginatedResponse<T> {
      data: T[];
      paging: {
        next_cursor: string | null;
      };
    }
    ```

2.  Crea `src/schemas/client.schema.ts`:
    ```typescript
    import { z } from 'zod';
    
    // Tipos de documento de identidad válidos para el MVP
    export const identityDocumentTypeSchema = z.enum(['cedula_identidad', 'pasaporte']);
    
    // Schema del documento de identidad
    export const identityDocumentSchema = z.object({
      type: identityDocumentTypeSchema,
      number: z.string()
        .min(1, 'El número de documento es requerido')
        .regex(/^[a-zA-Z0-9]+$/, 'El número de documento debe ser alfanumérico')
    });
    
    // Schema base para crear cliente (antes de la validación de identificadores)
    const baseCreateClientSchema = z.object({
      name: z.string().min(1, 'El nombre es requerido'),
      email: z.string().email('Debe ser un email válido').optional(),
      identity_document: identityDocumentSchema.optional(),
      extra_data: z.record(z.unknown()).optional()
    });
    
    // Schema de creación con validación: al menos uno de email o identity_document
    export const createClientSchema = baseCreateClientSchema.refine(
      (data) => data.email || data.identity_document,
      {
        message: 'Debe proporcionar al menos un identificador: email o documento de identidad'
        // Sin path para indicar que es un error a nivel de formulario
      }
    );
    
    export const updateClientSchema = z.object({
      name: z.string().min(1).optional(),
      extra_data: z.record(z.unknown()).optional()
    });
    
    export const clientSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email().nullable().optional(),
      identity_document: identityDocumentSchema.nullable().optional(),
      extra_data: z.record(z.unknown()).optional(),
      affinityGroupIds: z.array(z.string()),
      account_balances: z.record(z.number()),
      created_at: z.date(),
      updated_at: z.date()
    });
    
    export type IdentityDocumentType = z.infer<typeof identityDocumentTypeSchema>;
    export type IdentityDocument = z.infer<typeof identityDocumentSchema>;
    export type CreateClientRequest = z.infer<typeof createClientSchema>;
    export type UpdateClientRequest = z.infer<typeof updateClientSchema>;
    export type Client = z.infer<typeof clientSchema>;
    ```

3.  Crea `src/schemas/group.schema.ts`:
    ```typescript
    import { z } from 'zod';
    
    export const createGroupSchema = z.object({
      name: z.string().min(1, 'El nombre es requerido'),
      description: z.string().optional()
    });
    
    export const groupSchema = z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      created_at: z.date()
    });
    
    export type CreateGroupRequest = z.infer<typeof createGroupSchema>;
    export type Group = z.infer<typeof groupSchema>;
    ```

4.  Crea `src/schemas/account.schema.ts`:
    ```typescript
    import { z } from 'zod';
    
    export const createAccountSchema = z.object({
      account_name: z.string().min(1, 'El nombre de la cuenta es requerido')
    });
    
    export const creditDebitSchema = z.object({
      amount: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
      description: z.string().optional()
    });
    
    export const loyaltyAccountSchema = z.object({
      id: z.string(),
      account_name: z.string(),
      points: z.number().int(),
      created_at: z.date(),
      updated_at: z.date()
    });
    
    export type CreateAccountRequest = z.infer<typeof createAccountSchema>;
    export type CreditDebitRequest = z.infer<typeof creditDebitSchema>;
    export type LoyaltyAccount = z.infer<typeof loyaltyAccountSchema>;
    ```

5.  Crea `src/schemas/transaction.schema.ts`:
    ```typescript
    import { z } from 'zod';
    
    export const transactionSchema = z.object({
      id: z.string(),
      transaction_type: z.enum(['credit', 'debit']),
      amount: z.number().int().positive(),
      description: z.string().optional(),
      timestamp: z.date()
    });
    
    export type Transaction = z.infer<typeof transactionSchema>;
    ```

6.  Crea `src/schemas/index.ts` exportando todo:
    ```typescript
    export * from './common.schema';
    export * from './client.schema';
    export * from './group.schema';
    export * from './account.schema';
    export * from './transaction.schema';
    ```

**Criterios de Aceptación:**
-   [ ] Todos los schemas validan correctamente según `openapi.yaml`
-   [ ] El schema de cliente valida que al menos uno de email o identity_document esté presente
-   [ ] El schema de identity_document valida el tipo (cedula_identidad o pasaporte) y el número alfanumérico
-   [ ] Los tipos de TypeScript se infieren de los schemas (no hay interfaces manuales duplicadas)
-   [ ] El código compila sin errores de tipo

---

### Tarea 2.2: Endpoints del Dominio "Clients"

**Dependencias:** Tarea 2.1 completada

**Documentos de Referencia:**
-   `openapi.yaml` - Sección `paths: /clients*`
-   `docs/ARCHITECTURE.md` - Sección 4 (Modelo de Datos) y Sección 3.1 (Estrategia de Búsqueda MVP)
-   `docs/SPECS.md` - Módulo de Clientes

**Archivos a Crear:**
```
functions/src/
├── services/
│   └── client.service.ts
├── api/routes/
│   └── client.routes.ts
```

**Archivos a Modificar:**
```
functions/src/index.ts  # Registrar las rutas
```

**Instrucciones Detalladas:**

1.  Crea `src/services/client.service.ts` con la lógica de negocio:
    ```typescript
    import * as admin from 'firebase-admin';
    import { CreateClientRequest, UpdateClientRequest, Client, PaginationParams, PaginatedResponse, IdentityDocument } from '../schemas';
    import { NotFoundError, ConflictError } from '../core/errors';
    
    const db = admin.firestore();
    const clientsCollection = db.collection('clients');
    
    export class ClientService {
      async create(data: CreateClientRequest): Promise<Client> {
        // Verificar email único (si se proporciona)
        if (data.email) {
          const existingByEmail = await clientsCollection.where('email', '==', data.email).limit(1).get();
          if (!existingByEmail.empty) {
            throw new ConflictError('El correo electrónico proporcionado ya está en uso.');
          }
        }
        
        // Verificar documento de identidad único (si se proporciona)
        if (data.identity_document) {
          const existingByDoc = await clientsCollection
            .where('identity_document.type', '==', data.identity_document.type)
            .where('identity_document.number', '==', data.identity_document.number)
            .limit(1)
            .get();
          if (!existingByDoc.empty) {
            throw new ConflictError('El documento de identidad proporcionado ya está registrado.');
          }
        }
        
        const now = admin.firestore.Timestamp.now();
        const docRef = clientsCollection.doc();
        const clientData = {
          name: data.name,
          email: data.email || null,
          identity_document: data.identity_document || null,
          extra_data: data.extra_data || {},
          affinityGroupIds: [],
          account_balances: {},
          created_at: now,
          updated_at: now
        };
        
        await docRef.set(clientData);
        
        return {
          id: docRef.id,
          name: data.name,
          email: data.email || null,
          identity_document: data.identity_document || null,
          extra_data: data.extra_data,
          affinityGroupIds: [],
          account_balances: {},
          created_at: now.toDate(),
          updated_at: now.toDate()
        };
      }
      
      async list(params: PaginationParams): Promise<PaginatedResponse<Client>> {
        let query = clientsCollection.orderBy('created_at', 'desc').limit(params.limit + 1);
        
        if (params.next_cursor) {
          const cursorDoc = await clientsCollection.doc(params.next_cursor).get();
          if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
          }
        }
        
        const snapshot = await query.get();
        const docs = snapshot.docs;
        const hasMore = docs.length > params.limit;
        const resultDocs = hasMore ? docs.slice(0, -1) : docs;
        
        const data = resultDocs.map(doc => this.docToClient(doc));
        
        return {
          data,
          paging: {
            next_cursor: hasMore ? resultDocs[resultDocs.length - 1].id : null
          }
        };
      }
      
      async getById(id: string): Promise<Client> {
        const doc = await clientsCollection.doc(id).get();
        if (!doc.exists) {
          throw new NotFoundError('Cliente', id);
        }
        return this.docToClient(doc);
      }
      
      async update(id: string, data: UpdateClientRequest): Promise<Client> {
        const docRef = clientsCollection.doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          throw new NotFoundError('Cliente', id);
        }
        
        const updateData = {
          ...data,
          updated_at: admin.firestore.Timestamp.now()
        };
        
        await docRef.update(updateData);
        
        return this.getById(id);
      }
      
      async delete(id: string): Promise<void> {
        const docRef = clientsCollection.doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          throw new NotFoundError('Cliente', id);
        }
        
        // Marcar para eliminación asíncrona (la extensión de Firebase se encargará)
        await docRef.delete();
      }
      
      private docToClient(doc: admin.firestore.DocumentSnapshot): Client {
        const data = doc.data()!;
        return {
          id: doc.id,
          name: data.name,
          email: data.email || null,
          identity_document: data.identity_document || null,
          extra_data: data.extra_data,
          affinityGroupIds: data.affinityGroupIds || [],
          account_balances: data.account_balances || {},
          created_at: data.created_at.toDate(),
          updated_at: data.updated_at.toDate()
        };
      }
    }
    
    export const clientService = new ClientService();
    ```

2.  Crea `src/api/routes/client.routes.ts`:
    ```typescript
    import { Router } from 'express';
    import { clientService } from '../../services/client.service';
    import { createClientSchema, updateClientSchema, paginationParamsSchema } from '../../schemas';
    import { authMiddleware } from '../middleware';
    
    const router = Router();
    
    // Todas las rutas requieren autenticación
    router.use(authMiddleware);
    
    // GET /clients - Listar clientes
    router.get('/', async (req, res, next) => {
      try {
        const params = paginationParamsSchema.parse(req.query);
        const result = await clientService.list(params);
        res.json(result);
      } catch (error) {
        next(error);
      }
    });
    
    // POST /clients - Crear cliente
    router.post('/', async (req, res, next) => {
      try {
        const data = createClientSchema.parse(req.body);
        const client = await clientService.create(data);
        res.status(201).json(client);
      } catch (error) {
        next(error);
      }
    });
    
    // GET /clients/:client_id - Obtener cliente
    router.get('/:client_id', async (req, res, next) => {
      try {
        const client = await clientService.getById(req.params.client_id);
        res.json(client);
      } catch (error) {
        next(error);
      }
    });
    
    // PUT /clients/:client_id - Actualizar cliente
    router.put('/:client_id', async (req, res, next) => {
      try {
        const data = updateClientSchema.parse(req.body);
        const client = await clientService.update(req.params.client_id, data);
        res.json(client);
      } catch (error) {
        next(error);
      }
    });
    
    // DELETE /clients/:client_id - Eliminar cliente
    router.delete('/:client_id', async (req, res, next) => {
      try {
        await clientService.delete(req.params.client_id);
        res.status(202).json({ 
          message: 'El proceso de eliminación del cliente ha comenzado.' 
        });
      } catch (error) {
        next(error);
      }
    });
    
    export default router;
    ```

3.  Modifica `src/index.ts` para registrar las rutas:
    ```typescript
    import clientRoutes from './api/routes/client.routes';
    
    // Registrar rutas de la API v1
    app.use('/api/v1/clients', clientRoutes);
    ```

**Criterios de Aceptación:**
-   [ ] `POST /clients` crea un cliente y retorna `201 Created`
-   [ ] `POST /clients` retorna `400 Bad Request` si no se proporciona email ni documento de identidad
-   [ ] `POST /clients` retorna `409 Conflict` si el email ya existe
-   [ ] `POST /clients` retorna `409 Conflict` si el documento de identidad ya existe
-   [ ] `GET /clients` retorna lista paginada con `next_cursor`
-   [ ] `GET /clients/:id` retorna el cliente o `404 Not Found`
-   [ ] `PUT /clients/:id` actualiza el cliente o `404 Not Found`
-   [ ] `DELETE /clients/:id` retorna `202 Accepted` o `404 Not Found`
-   [ ] Todos los endpoints requieren autenticación (retornan `401` sin token)
-   [ ] Las respuestas de error siguen el formato `{ error: { code, message } }`

---

### Tarea 2.3: Endpoints del Dominio "Groups"

**Dependencias:** Tarea 2.2 completada

**Documentos de Referencia:**
-   `openapi.yaml` - Sección `paths: /groups*`
-   `docs/ARCHITECTURE.md` - Sección 4 (Modelo de Datos: affinityGroups)

**Archivos a Crear:**
```
functions/src/
├── services/
│   └── group.service.ts
├── api/routes/
│   └── group.routes.ts
```

**Instrucciones Detalladas:**

1.  Crea `src/services/group.service.ts`:
    ```typescript
    import * as admin from 'firebase-admin';
    import { CreateGroupRequest, Group } from '../schemas';
    import { NotFoundError } from '../core/errors';
    
    const db = admin.firestore();
    const groupsCollection = db.collection('affinityGroups');
    const clientsCollection = db.collection('clients');
    
    export class GroupService {
      async create(data: CreateGroupRequest): Promise<Group> {
        const now = admin.firestore.Timestamp.now();
        const docRef = groupsCollection.doc();
        const groupData = {
          ...data,
          created_at: now
        };
        
        await docRef.set(groupData);
        
        return {
          id: docRef.id,
          ...data,
          created_at: now.toDate()
        };
      }
      
      async list(): Promise<Group[]> {
        const snapshot = await groupsCollection.orderBy('name').get();
        return snapshot.docs.map(doc => this.docToGroup(doc));
      }
      
      async addClientToGroup(groupId: string, clientId: string): Promise<void> {
        const groupRef = groupsCollection.doc(groupId);
        const clientRef = clientsCollection.doc(clientId);
        
        const [groupDoc, clientDoc] = await Promise.all([
          groupRef.get(),
          clientRef.get()
        ]);
        
        if (!groupDoc.exists) {
          throw new NotFoundError('Grupo', groupId);
        }
        if (!clientDoc.exists) {
          throw new NotFoundError('Cliente', clientId);
        }
        
        // Usar arrayUnion para añadir sin duplicados
        await clientRef.update({
          affinityGroupIds: admin.firestore.FieldValue.arrayUnion(groupId),
          updated_at: admin.firestore.Timestamp.now()
        });
      }
      
      async removeClientFromGroup(groupId: string, clientId: string): Promise<void> {
        const groupRef = groupsCollection.doc(groupId);
        const clientRef = clientsCollection.doc(clientId);
        
        const [groupDoc, clientDoc] = await Promise.all([
          groupRef.get(),
          clientRef.get()
        ]);
        
        if (!groupDoc.exists) {
          throw new NotFoundError('Grupo', groupId);
        }
        if (!clientDoc.exists) {
          throw new NotFoundError('Cliente', clientId);
        }
        
        await clientRef.update({
          affinityGroupIds: admin.firestore.FieldValue.arrayRemove(groupId),
          updated_at: admin.firestore.Timestamp.now()
        });
      }
      
      private docToGroup(doc: admin.firestore.DocumentSnapshot): Group {
        const data = doc.data()!;
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          created_at: data.created_at.toDate()
        };
      }
    }
    
    export const groupService = new GroupService();
    ```

2.  Crea `src/api/routes/group.routes.ts`:
    ```typescript
    import { Router } from 'express';
    import { groupService } from '../../services/group.service';
    import { createGroupSchema } from '../../schemas';
    import { authMiddleware } from '../middleware';
    
    const router = Router();
    
    router.use(authMiddleware);
    
    // GET /groups - Listar grupos
    router.get('/', async (req, res, next) => {
      try {
        const groups = await groupService.list();
        res.json(groups);
      } catch (error) {
        next(error);
      }
    });
    
    // POST /groups - Crear grupo
    router.post('/', async (req, res, next) => {
      try {
        const data = createGroupSchema.parse(req.body);
        const group = await groupService.create(data);
        res.status(201).json(group);
      } catch (error) {
        next(error);
      }
    });
    
    // POST /groups/:group_id/clients/:client_id - Asignar cliente a grupo
    router.post('/:group_id/clients/:client_id', async (req, res, next) => {
      try {
        await groupService.addClientToGroup(req.params.group_id, req.params.client_id);
        res.json({ message: 'Client added to group' });
      } catch (error) {
        next(error);
      }
    });
    
    // DELETE /groups/:group_id/clients/:client_id - Desasignar cliente de grupo
    router.delete('/:group_id/clients/:client_id', async (req, res, next) => {
      try {
        await groupService.removeClientFromGroup(req.params.group_id, req.params.client_id);
        res.json({ message: 'Client removed from group' });
      } catch (error) {
        next(error);
      }
    });
    
    export default router;
    ```

3.  Registra las rutas en `src/index.ts`:
    ```typescript
    import groupRoutes from './api/routes/group.routes';
    app.use('/api/v1/groups', groupRoutes);
    ```

**Criterios de Aceptación:**
-   [ ] `POST /groups` crea un grupo y retorna `201 Created`
-   [ ] `GET /groups` retorna un array con todos los grupos
-   [ ] `POST /groups/:group_id/clients/:client_id` añade cliente al grupo
-   [ ] `DELETE /groups/:group_id/clients/:client_id` remueve cliente del grupo
-   [ ] Ambas operaciones de asignación retornan `404` si grupo o cliente no existen
-   [ ] El array `affinityGroupIds` del cliente se actualiza correctamente

---

### Tarea 2.4: Endpoints del Dominio "Accounts" (Cuentas de Lealtad)

**Dependencias:** Tarea 2.3 completada

**Documentos de Referencia:**
-   `openapi.yaml` - Sección `paths: /clients/{client_id}/accounts*`
-   `docs/ARCHITECTURE.md` - Sección 4 (Modelo de Datos: loyaltyAccounts, pointTransactions)
-   `docs/GUIDELINES.md` - Sección 6 (Manejo de Desnormalización: CRÍTICO)

**Archivos a Crear:**
```
functions/src/
├── services/
│   └── account.service.ts
├── api/routes/
│   └── account.routes.ts
```

**⚠️ ADVERTENCIA CRÍTICA:**
> Las operaciones de `credit` y `debit` **DEBEN** usar transacciones de Firestore para actualizar atómicamente:
> 1. El campo `points` en el documento de la cuenta
> 2. El mapa `account_balances` en el documento del cliente
> 
> Ver `docs/GUIDELINES.md` sección 6 y `docs/ARCHITECTURE.md` nota sobre desnormalización.

**Instrucciones Detalladas:**

1.  Crea `src/services/account.service.ts`:
    ```typescript
    import * as admin from 'firebase-admin';
    import { CreateAccountRequest, CreditDebitRequest, LoyaltyAccount, Transaction, PaginationParams, PaginatedResponse } from '../schemas';
    import { NotFoundError, InsufficientBalanceError } from '../core/errors';
    
    const db = admin.firestore();
    
    export class AccountService {
      private getAccountPath(clientId: string, accountId: string) {
        return `clients/${clientId}/loyaltyAccounts/${accountId}`;
      }
      
      private getTransactionsPath(clientId: string, accountId: string) {
        return `clients/${clientId}/loyaltyAccounts/${accountId}/transactions`;
      }
      
      async create(clientId: string, data: CreateAccountRequest): Promise<LoyaltyAccount> {
        const clientRef = db.collection('clients').doc(clientId);
        const clientDoc = await clientRef.get();
        
        if (!clientDoc.exists) {
          throw new NotFoundError('Cliente', clientId);
        }
        
        const now = admin.firestore.Timestamp.now();
        const accountRef = clientRef.collection('loyaltyAccounts').doc();
        
        const accountData = {
          account_name: data.account_name,
          points: 0,
          created_at: now,
          updated_at: now
        };
        
        // Usar transacción para crear cuenta y actualizar account_balances
        await db.runTransaction(async (transaction) => {
          transaction.set(accountRef, accountData);
          transaction.update(clientRef, {
            [`account_balances.${accountRef.id}`]: 0,
            updated_at: now
          });
        });
        
        return {
          id: accountRef.id,
          account_name: data.account_name,
          points: 0,
          created_at: now.toDate(),
          updated_at: now.toDate()
        };
      }
      
      async listByClient(clientId: string): Promise<LoyaltyAccount[]> {
        const clientRef = db.collection('clients').doc(clientId);
        const clientDoc = await clientRef.get();
        
        if (!clientDoc.exists) {
          throw new NotFoundError('Cliente', clientId);
        }
        
        const snapshot = await clientRef.collection('loyaltyAccounts').orderBy('created_at').get();
        return snapshot.docs.map(doc => this.docToAccount(doc));
      }
      
      async credit(clientId: string, accountId: string, data: CreditDebitRequest): Promise<LoyaltyAccount> {
        return this.adjustBalance(clientId, accountId, data, 'credit');
      }
      
      async debit(clientId: string, accountId: string, data: CreditDebitRequest): Promise<LoyaltyAccount> {
        return this.adjustBalance(clientId, accountId, data, 'debit');
      }
      
      private async adjustBalance(
        clientId: string, 
        accountId: string, 
        data: CreditDebitRequest, 
        type: 'credit' | 'debit'
      ): Promise<LoyaltyAccount> {
        const clientRef = db.collection('clients').doc(clientId);
        const accountRef = clientRef.collection('loyaltyAccounts').doc(accountId);
        const transactionsRef = accountRef.collection('transactions');
        
        // CRÍTICO: Usar transacción atómica
        const result = await db.runTransaction(async (transaction) => {
          const [clientDoc, accountDoc] = await Promise.all([
            transaction.get(clientRef),
            transaction.get(accountRef)
          ]);
          
          if (!clientDoc.exists) {
            throw new NotFoundError('Cliente', clientId);
          }
          if (!accountDoc.exists) {
            throw new NotFoundError('Cuenta', accountId);
          }
          
          const accountData = accountDoc.data()!;
          const currentPoints = accountData.points || 0;
          const delta = type === 'credit' ? data.amount : -data.amount;
          const newPoints = currentPoints + delta;
          
          if (newPoints < 0) {
            throw new InsufficientBalanceError();
          }
          
          const now = admin.firestore.Timestamp.now();
          
          // Crear transacción
          const transactionDoc = transactionsRef.doc();
          transaction.set(transactionDoc, {
            transaction_type: type,
            amount: data.amount,
            description: data.description || '',
            timestamp: now
          });
          
          // Actualizar cuenta
          transaction.update(accountRef, {
            points: newPoints,
            updated_at: now
          });
          
          // CRÍTICO: Actualizar balance desnormalizado en cliente
          transaction.update(clientRef, {
            [`account_balances.${accountId}`]: newPoints,
            updated_at: now
          });
          
          return {
            id: accountDoc.id,
            account_name: accountData.account_name,
            points: newPoints,
            created_at: accountData.created_at.toDate(),
            updated_at: now.toDate()
          };
        });
        
        return result;
      }
      
      async getBalance(clientId: string, accountId: string): Promise<{ points: number }> {
        const clientRef = db.collection('clients').doc(clientId);
        const accountRef = clientRef.collection('loyaltyAccounts').doc(accountId);
        
        const [clientDoc, accountDoc] = await Promise.all([
          clientRef.get(),
          accountRef.get()
        ]);
        
        if (!clientDoc.exists) {
          throw new NotFoundError('Cliente', clientId);
        }
        if (!accountDoc.exists) {
          throw new NotFoundError('Cuenta', accountId);
        }
        
        const accountData = accountDoc.data()!;
        return { points: accountData.points || 0 };
      }
      
      async getAllBalances(clientId: string): Promise<Record<string, number>> {
        const clientRef = db.collection('clients').doc(clientId);
        const clientDoc = await clientRef.get();
        
        if (!clientDoc.exists) {
          throw new NotFoundError('Cliente', clientId);
        }
        
        return clientDoc.data()!.account_balances || {};
      }
      
      async listTransactions(
        clientId: string, 
        accountId: string, 
        params: PaginationParams
      ): Promise<PaginatedResponse<Transaction>> {
        const clientRef = db.collection('clients').doc(clientId);
        const accountRef = clientRef.collection('loyaltyAccounts').doc(accountId);
        
        const [clientDoc, accountDoc] = await Promise.all([
          clientRef.get(),
          accountRef.get()
        ]);
        
        if (!clientDoc.exists) {
          throw new NotFoundError('Cliente', clientId);
        }
        if (!accountDoc.exists) {
          throw new NotFoundError('Cuenta', accountId);
        }
        
        let query = accountRef.collection('transactions')
          .orderBy('timestamp', 'desc')
          .limit(params.limit + 1);
        
        if (params.next_cursor) {
          const cursorDoc = await accountRef.collection('transactions').doc(params.next_cursor).get();
          if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
          }
        }
        
        const snapshot = await query.get();
        const docs = snapshot.docs;
        const hasMore = docs.length > params.limit;
        const resultDocs = hasMore ? docs.slice(0, -1) : docs;
        
        const data = resultDocs.map(doc => this.docToTransaction(doc));
        
        return {
          data,
          paging: {
            next_cursor: hasMore ? resultDocs[resultDocs.length - 1].id : null
          }
        };
      }
      
      private docToAccount(doc: admin.firestore.DocumentSnapshot): LoyaltyAccount {
        const data = doc.data()!;
        return {
          id: doc.id,
          account_name: data.account_name,
          points: data.points || 0,
          created_at: data.created_at.toDate(),
          updated_at: data.updated_at.toDate()
        };
      }
      
      private docToTransaction(doc: admin.firestore.DocumentSnapshot): Transaction {
        const data = doc.data()!;
        return {
          id: doc.id,
          transaction_type: data.transaction_type,
          amount: data.amount,
          description: data.description,
          timestamp: data.timestamp.toDate()
        };
      }
    }
    
    export const accountService = new AccountService();
    ```

2.  Crea `src/api/routes/account.routes.ts`:
    ```typescript
    import { Router } from 'express';
    import { accountService } from '../../services/account.service';
    import { createAccountSchema, creditDebitSchema, paginationParamsSchema } from '../../schemas';
    import { authMiddleware } from '../middleware';
    
    const router = Router({ mergeParams: true }); // Para acceder a :client_id del router padre
    
    router.use(authMiddleware);
    
    // GET /clients/:client_id/accounts - Listar cuentas
    router.get('/', async (req, res, next) => {
      try {
        const accounts = await accountService.listByClient(req.params.client_id);
        res.json(accounts);
      } catch (error) {
        next(error);
      }
    });
    
    // POST /clients/:client_id/accounts - Crear cuenta
    router.post('/', async (req, res, next) => {
      try {
        const data = createAccountSchema.parse(req.body);
        const account = await accountService.create(req.params.client_id, data);
        res.status(201).json(account);
      } catch (error) {
        next(error);
      }
    });
    
    // POST /clients/:client_id/accounts/:account_id/credit - Acreditar puntos
    router.post('/:account_id/credit', async (req, res, next) => {
      try {
        const data = creditDebitSchema.parse(req.body);
        const account = await accountService.credit(
          req.params.client_id, 
          req.params.account_id, 
          data
        );
        res.json(account);
      } catch (error) {
        next(error);
      }
    });
    
    // POST /clients/:client_id/accounts/:account_id/debit - Debitar puntos
    router.post('/:account_id/debit', async (req, res, next) => {
      try {
        const data = creditDebitSchema.parse(req.body);
        const account = await accountService.debit(
          req.params.client_id, 
          req.params.account_id, 
          data
        );
        res.json(account);
      } catch (error) {
        next(error);
      }
    });
    
    // GET /clients/:client_id/accounts/:account_id/balance - Saldo de cuenta
    router.get('/:account_id/balance', async (req, res, next) => {
      try {
        const balance = await accountService.getBalance(
          req.params.client_id, 
          req.params.account_id
        );
        res.json(balance);
      } catch (error) {
        next(error);
      }
    });
    
    // GET /clients/:client_id/accounts/:account_id/transactions - Transacciones
    router.get('/:account_id/transactions', async (req, res, next) => {
      try {
        const params = paginationParamsSchema.parse(req.query);
        const transactions = await accountService.listTransactions(
          req.params.client_id, 
          req.params.account_id, 
          params
        );
        res.json(transactions);
      } catch (error) {
        next(error);
      }
    });
    
    export default router;
    ```

3.  Crea rutas adicionales para balance total. Modifica `src/api/routes/client.routes.ts`:
    ```typescript
    import { accountService } from '../../services/account.service';
    
    // GET /clients/:client_id/balance - Todos los saldos del cliente
    router.get('/:client_id/balance', async (req, res, next) => {
      try {
        const balances = await accountService.getAllBalances(req.params.client_id);
        res.json(balances);
      } catch (error) {
        next(error);
      }
    });
    ```

4.  Registra las rutas en `src/index.ts`:
    ```typescript
    import accountRoutes from './api/routes/account.routes';
    
    // Las rutas de accounts son sub-rutas de clients
    app.use('/api/v1/clients/:client_id/accounts', accountRoutes);
    ```

**Criterios de Aceptación:**
-   [ ] `POST /clients/:id/accounts` crea cuenta con `points: 0`
-   [ ] `GET /clients/:id/accounts` lista todas las cuentas del cliente
-   [ ] `POST .../credit` incrementa puntos correctamente
-   [ ] `POST .../debit` decrementa puntos correctamente
-   [ ] `POST .../debit` retorna `400 INSUFFICIENT_BALANCE` si saldo insuficiente
-   [ ] **CRÍTICO:** Las operaciones credit/debit actualizan `account_balances` en el cliente
-   [ ] Las operaciones credit/debit crean registro en `transactions`
-   [ ] `GET .../transactions` retorna lista paginada
-   [ ] `GET /clients/:id/balance` retorna el mapa desnormalizado

---

## Épica 2.5: Implementación del Sistema de Auditoría

**Objetivo:** Implementar un sistema completo de auditoría que registre todas las operaciones realizadas en el sistema para garantizar la trazabilidad y el cumplimiento regulatorio.

**Orden de Ejecución:** Tarea 2.5.1 → Tarea 2.5.2 → Tarea 2.5.3 → Tarea 2.5.4

---

### Tarea 2.5.1: Schema de Auditoría y Servicio Base

**Dependencias:** Tarea 2.1 completada

**Documentos de Referencia:**
-   `docs/ARCHITECTURE.md` - Sección 4.1 (Modelo de Datos de Auditoría)
-   `openapi.yaml` - Schemas de Auditoría (`AuditLog`, `AuditAction`, etc.)

**Archivos a Crear:**
```
functions/src/
├── schemas/
│   └── audit.schema.ts
├── services/
│   └── audit.service.ts
```

**Instrucciones Detalladas:**

1.  Crea `src/schemas/audit.schema.ts` con los schemas de Zod:
    ```typescript
    import { z } from 'zod';

    export const auditActionSchema = z.enum([
      'CLIENT_CREATED',
      'CLIENT_UPDATED',
      'CLIENT_DELETED',
      'ACCOUNT_CREATED',
      'POINTS_CREDITED',
      'POINTS_DEBITED',
      'GROUP_CREATED',
      'CLIENT_ADDED_TO_GROUP',
      'CLIENT_REMOVED_FROM_GROUP'
    ]);

    export const auditResourceTypeSchema = z.enum([
      'client',
      'account',
      'transaction',
      'group'
    ]);

    export const auditActorSchema = z.object({
      uid: z.string(),
      email: z.string().email().nullable()
    });

    export const auditChangesSchema = z.object({
      before: z.record(z.unknown()).nullable().optional(),
      after: z.record(z.unknown()).nullable().optional()
    });

    export const auditMetadataSchema = z.object({
      ip_address: z.string().nullable().optional(),
      user_agent: z.string().nullable().optional(),
      description: z.string().nullable().optional()
    });

    export const auditLogSchema = z.object({
      id: z.string(),
      action: auditActionSchema,
      resource_type: auditResourceTypeSchema,
      resource_id: z.string(),
      client_id: z.string().nullable(),
      account_id: z.string().nullable(),
      group_id: z.string().nullable(),
      transaction_id: z.string().nullable(),
      actor: auditActorSchema,
      changes: auditChangesSchema.nullable().optional(),
      metadata: auditMetadataSchema,
      timestamp: z.date()
    });

    export const auditFilterParamsSchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      next_cursor: z.string().optional(),
      client_id: z.string().optional(),
      account_id: z.string().optional(),
      group_id: z.string().optional(),
      action: auditActionSchema.optional(),
      from_date: z.coerce.date().optional(),
      to_date: z.coerce.date().optional()
    });

    export type AuditAction = z.infer<typeof auditActionSchema>;
    export type AuditResourceType = z.infer<typeof auditResourceTypeSchema>;
    export type AuditActor = z.infer<typeof auditActorSchema>;
    export type AuditChanges = z.infer<typeof auditChangesSchema>;
    export type AuditMetadata = z.infer<typeof auditMetadataSchema>;
    export type AuditLog = z.infer<typeof auditLogSchema>;
    export type AuditFilterParams = z.infer<typeof auditFilterParamsSchema>;
    ```

2.  Crea `src/services/audit.service.ts`:
    ```typescript
    import * as admin from 'firebase-admin';
    import { AuditAction, AuditResourceType, AuditActor, AuditChanges, AuditMetadata, AuditLog, AuditFilterParams } from '../schemas';
    import { PaginatedResponse } from '../schemas/common.schema';
    import { NotFoundError } from '../core/errors';

    const db = admin.firestore();
    const auditLogsCollection = db.collection('auditLogs');

    interface CreateAuditLogParams {
      action: AuditAction;
      resourceType: AuditResourceType;
      resourceId: string;
      clientId?: string | null;
      accountId?: string | null;
      groupId?: string | null;
      transactionId?: string | null;
      actor: AuditActor;
      changes?: AuditChanges | null;
      metadata?: Partial<AuditMetadata>;
    }

    export class AuditService {
      /**
       * Crea un registro de auditoría de forma asíncrona (no bloquea la operación principal).
       * Para operaciones financieras (POINTS_CREDITED, POINTS_DEBITED), usar createAuditLogInTransaction.
       */
      async createAuditLog(params: CreateAuditLogParams): Promise<void> {
        const now = admin.firestore.Timestamp.now();
        const docRef = auditLogsCollection.doc();

        await docRef.set({
          action: params.action,
          resource_type: params.resourceType,
          resource_id: params.resourceId,
          client_id: params.clientId || null,
          account_id: params.accountId || null,
          group_id: params.groupId || null,
          transaction_id: params.transactionId || null,
          actor: params.actor,
          changes: params.changes || null,
          metadata: {
            ip_address: params.metadata?.ip_address || null,
            user_agent: params.metadata?.user_agent || null,
            description: params.metadata?.description || null
          },
          timestamp: now
        });
      }

      /**
       * Crea un registro de auditoría dentro de una transacción existente.
       * CRÍTICO: Usar para operaciones de crédito/débito (POINTS_CREDITED, POINTS_DEBITED).
       */
      createAuditLogInTransaction(
        transaction: admin.firestore.Transaction,
        params: CreateAuditLogParams
      ): string {
        const now = admin.firestore.Timestamp.now();
        const docRef = auditLogsCollection.doc();

        transaction.set(docRef, {
          action: params.action,
          resource_type: params.resourceType,
          resource_id: params.resourceId,
          client_id: params.clientId || null,
          account_id: params.accountId || null,
          group_id: params.groupId || null,
          transaction_id: params.transactionId || null,
          actor: params.actor,
          changes: params.changes || null,
          metadata: {
            ip_address: params.metadata?.ip_address || null,
            user_agent: params.metadata?.user_agent || null,
            description: params.metadata?.description || null
          },
          timestamp: now
        });

        return docRef.id;
      }

      async list(params: AuditFilterParams): Promise<PaginatedResponse<AuditLog>> {
        let query: admin.firestore.Query = auditLogsCollection.orderBy('timestamp', 'desc');

        // Aplicar filtros
        if (params.client_id) {
          query = query.where('client_id', '==', params.client_id);
        }
        if (params.account_id) {
          query = query.where('account_id', '==', params.account_id);
        }
        if (params.action) {
          query = query.where('action', '==', params.action);
        }
        if (params.from_date) {
          query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(params.from_date));
        }
        if (params.to_date) {
          query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(params.to_date));
        }

        query = query.limit(params.limit + 1);

        if (params.next_cursor) {
          const cursorDoc = await auditLogsCollection.doc(params.next_cursor).get();
          if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
          }
        }

        const snapshot = await query.get();
        const docs = snapshot.docs;
        const hasMore = docs.length > params.limit;
        const resultDocs = hasMore ? docs.slice(0, -1) : docs;

        const data = resultDocs.map(doc => this.docToAuditLog(doc));

        return {
          data,
          paging: {
            next_cursor: hasMore ? resultDocs[resultDocs.length - 1].id : null
          }
        };
      }

      async getById(id: string): Promise<AuditLog> {
        const doc = await auditLogsCollection.doc(id).get();
        if (!doc.exists) {
          throw new NotFoundError('Registro de auditoría', id);
        }
        return this.docToAuditLog(doc);
      }

      async getByClientId(clientId: string, params: AuditFilterParams): Promise<PaginatedResponse<AuditLog>> {
        return this.list({ ...params, client_id: clientId });
      }

      async getByAccountId(clientId: string, accountId: string, params: AuditFilterParams): Promise<PaginatedResponse<AuditLog>> {
        // Verificar que el cliente y la cuenta existen
        const clientDoc = await db.collection('clients').doc(clientId).get();
        if (!clientDoc.exists) {
          throw new NotFoundError('Cliente', clientId);
        }
        const accountDoc = await db.collection('clients').doc(clientId).collection('loyaltyAccounts').doc(accountId).get();
        if (!accountDoc.exists) {
          throw new NotFoundError('Cuenta', accountId);
        }

        return this.list({ ...params, account_id: accountId });
      }

      async getByTransactionId(clientId: string, accountId: string, transactionId: string): Promise<AuditLog> {
        // Verificar que el cliente, cuenta y transacción existen
        const clientDoc = await db.collection('clients').doc(clientId).get();
        if (!clientDoc.exists) {
          throw new NotFoundError('Cliente', clientId);
        }
        const accountDoc = await db.collection('clients').doc(clientId).collection('loyaltyAccounts').doc(accountId).get();
        if (!accountDoc.exists) {
          throw new NotFoundError('Cuenta', accountId);
        }
        const transactionDoc = await db.collection('clients').doc(clientId)
          .collection('loyaltyAccounts').doc(accountId)
          .collection('transactions').doc(transactionId).get();
        if (!transactionDoc.exists) {
          throw new NotFoundError('Transacción', transactionId);
        }

        // Buscar el registro de auditoría por transaction_id
        const snapshot = await auditLogsCollection
          .where('transaction_id', '==', transactionId)
          .limit(1)
          .get();

        if (snapshot.empty) {
          throw new NotFoundError('Registro de auditoría para transacción', transactionId);
        }

        return this.docToAuditLog(snapshot.docs[0]);
      }

      private docToAuditLog(doc: admin.firestore.DocumentSnapshot): AuditLog {
        const data = doc.data()!;
        return {
          id: doc.id,
          action: data.action,
          resource_type: data.resource_type,
          resource_id: data.resource_id,
          client_id: data.client_id,
          account_id: data.account_id,
          group_id: data.group_id,
          transaction_id: data.transaction_id,
          actor: data.actor,
          changes: data.changes,
          metadata: data.metadata,
          timestamp: data.timestamp.toDate()
        };
      }
    }

    export const auditService = new AuditService();
    ```

**Criterios de Aceptación:**
-   [ ] Los schemas de Zod validan correctamente los datos de auditoría
-   [ ] El servicio puede crear registros de auditoría de forma asíncrona
-   [ ] El servicio puede crear registros dentro de una transacción
-   [ ] El servicio puede listar y filtrar registros de auditoría
-   [ ] El código compila sin errores de tipo

---

### Tarea 2.5.2: Integración de Auditoría en Servicios Existentes

**Dependencias:** Tareas 2.2, 2.3, 2.4 y 2.5.1 completadas

**Documentos de Referencia:**
-   `docs/SPECS.md` - Requisitos de auditoría por endpoint
-   `docs/GUIDELINES.md` - Sección 6 (Manejo de Desnormalización)

**Archivos a Modificar:**
```
functions/src/services/
├── client.service.ts   # MODIFICAR
├── group.service.ts    # MODIFICAR
└── account.service.ts  # MODIFICAR
```

**Instrucciones Detalladas:**

1.  Modifica `client.service.ts` para crear registros de auditoría:
    -   En `create()`: Crear registro `CLIENT_CREATED` después de la creación exitosa
    -   En `update()`: Crear registro `CLIENT_UPDATED` con los cambios (before/after)
    -   En `delete()`: Crear registro `CLIENT_DELETED` con los datos del cliente eliminado

2.  Modifica `group.service.ts` para crear registros de auditoría:
    -   En `create()`: Crear registro `GROUP_CREATED`
    -   En `addClientToGroup()`: Crear registro `CLIENT_ADDED_TO_GROUP`
    -   En `removeClientFromGroup()`: Crear registro `CLIENT_REMOVED_FROM_GROUP`

3.  **CRÍTICO:** Modifica `account.service.ts` para crear registros de auditoría dentro de las transacciones atómicas:
    -   En `create()`: Crear registro `ACCOUNT_CREATED` dentro de la transacción
    -   En `credit()`: Crear registro `POINTS_CREDITED` dentro de la misma transacción que actualiza el balance
    -   En `debit()`: Crear registro `POINTS_DEBITED` dentro de la misma transacción que actualiza el balance

    Ejemplo de integración en el método `adjustBalance`:
    ```typescript
    // Dentro del db.runTransaction
    // ... código existente de actualización de balance ...

    // Crear registro de auditoría DENTRO de la misma transacción
    auditService.createAuditLogInTransaction(transaction, {
      action: type === 'credit' ? 'POINTS_CREDITED' : 'POINTS_DEBITED',
      resourceType: 'transaction',
      resourceId: transactionDoc.id,
      clientId,
      accountId,
      transactionId: transactionDoc.id,
      actor: {
        uid: req.user.uid,
        email: req.user.email || null
      },
      changes: {
        before: { points: currentPoints },
        after: { points: newPoints }
      },
      metadata: {
        description: data.description,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    });
    ```

**Criterios de Aceptación:**
-   [ ] Todas las operaciones de creación de cliente crean registro `CLIENT_CREATED`
-   [ ] Todas las operaciones de actualización de cliente crean registro `CLIENT_UPDATED`
-   [ ] Todas las operaciones de eliminación de cliente crean registro `CLIENT_DELETED`
-   [ ] Todas las operaciones de grupos crean los registros correspondientes
-   [ ] **CRÍTICO:** Las operaciones de crédito/débito crean registros dentro de la misma transacción atómica
-   [ ] Los registros de auditoría incluyen información del actor (uid, email)
-   [ ] Los registros de auditoría incluyen metadatos cuando están disponibles

---

### Tarea 2.5.3: Endpoints de Consulta de Auditoría

**Dependencias:** Tarea 2.5.1 completada

**Documentos de Referencia:**
-   `openapi.yaml` - Endpoints de `/audit-logs`

**Archivos a Crear:**
```
functions/src/api/routes/
└── audit.routes.ts
```

**Instrucciones Detalladas:**

1.  Crea `src/api/routes/audit.routes.ts`:
    ```typescript
    import { Router } from 'express';
    import { auditService } from '../../services/audit.service';
    import { auditFilterParamsSchema } from '../../schemas';
    import { authMiddleware } from '../middleware';

    const router = Router();

    router.use(authMiddleware);

    // GET /audit-logs - Listar registros de auditoría
    router.get('/', async (req, res, next) => {
      try {
        const params = auditFilterParamsSchema.parse(req.query);
        const result = await auditService.list(params);
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // GET /audit-logs/:audit_log_id - Obtener registro específico
    router.get('/:audit_log_id', async (req, res, next) => {
      try {
        const auditLog = await auditService.getById(req.params.audit_log_id);
        res.json(auditLog);
      } catch (error) {
        next(error);
      }
    });

    export default router;
    ```

2.  Añade rutas de auditoría a `client.routes.ts`:
    ```typescript
    // GET /clients/:client_id/audit-logs
    router.get('/:client_id/audit-logs', async (req, res, next) => {
      try {
        const params = auditFilterParamsSchema.parse(req.query);
        const result = await auditService.getByClientId(req.params.client_id, params);
        res.json(result);
      } catch (error) {
        next(error);
      }
    });
    ```

3.  Añade rutas de auditoría a `account.routes.ts`:
    ```typescript
    // GET /clients/:client_id/accounts/:account_id/audit-logs
    router.get('/:account_id/audit-logs', async (req, res, next) => {
      try {
        const params = auditFilterParamsSchema.parse(req.query);
        const result = await auditService.getByAccountId(
          req.params.client_id,
          req.params.account_id,
          params
        );
        res.json(result);
      } catch (error) {
        next(error);
      }
    });

    // GET /clients/:client_id/accounts/:account_id/transactions/:transaction_id/audit-logs
    router.get('/:account_id/transactions/:transaction_id/audit-logs', async (req, res, next) => {
      try {
        const auditLog = await auditService.getByTransactionId(
          req.params.client_id,
          req.params.account_id,
          req.params.transaction_id
        );
        res.json(auditLog);
      } catch (error) {
        next(error);
      }
    });
    ```

4.  Registra las rutas en `src/index.ts`:
    ```typescript
    import auditRoutes from './api/routes/audit.routes';
    app.use('/api/v1/audit-logs', auditRoutes);
    ```

**Criterios de Aceptación:**
-   [ ] `GET /audit-logs` retorna lista paginada de todos los registros
-   [ ] `GET /audit-logs` soporta filtros por client_id, account_id, action, fechas
-   [ ] `GET /audit-logs/:id` retorna un registro específico o 404
-   [ ] `GET /clients/:client_id/audit-logs` retorna auditoría de un cliente
-   [ ] `GET /clients/:client_id/accounts/:account_id/audit-logs` retorna auditoría de una cuenta
-   [ ] `GET .../transactions/:transaction_id/audit-logs` retorna auditoría de una transacción
-   [ ] Todos los endpoints requieren autenticación

---

### Tarea 2.5.4: Pruebas del Sistema de Auditoría

**Dependencias:** Tareas 2.5.1, 2.5.2 y 2.5.3 completadas

**Documentos de Referencia:**
-   `docs/GUIDELINES.md` - Sección 5 (Testing)

**Archivos a Crear:**
```
functions/src/__tests__/
├── services/
│   └── audit.service.test.ts
└── api/
    └── audit.routes.test.ts
```

**Criterios de Aceptación:**
-   [ ] Pruebas unitarias para `audit.service.ts`
-   [ ] Pruebas de integración para los endpoints de auditoría
-   [ ] Pruebas que verifican la creación de auditoría en operaciones de crédito/débito
-   [ ] Pruebas que verifican que la auditoría se crea dentro de la transacción atómica
-   [ ] Cobertura de código superior al 80%

---

## Épica 3: Configuración y Desarrollo del Frontend (MVP)

**Objetivo:** Construir la interfaz de usuario principal para la gestión de clientes, permitiendo a un administrador realizar las operaciones más críticas.

**Orden de Ejecución:** Tarea 3.1 → Tarea 3.2 → Tarea 3.3 → Tarea 3.4 → Tarea 3.5

---

### Tarea 3.1: Andamiaje del Proyecto Frontend

**Dependencias:** Ninguna (puede ejecutarse en paralelo con Épica 1 y 2)

**Documentos de Referencia:**
-   `docs/UI-UX-GUIDELINES.md` - Sección 2 (Identidad Visual) y 3 (Guía de Componentes)
-   `docs/ARCHITECTURE.md` - Sección 11 (Arquitectura del Frontend)

**Estructura de Directorios a Crear:**
```
web/                        # Directorio del frontend (en raíz, fuera de functions/)
├── app/
│   ├── layout.tsx          # Layout raíz
│   ├── page.tsx            # Página de inicio (redirect a dashboard)
│   ├── globals.css         # Estilos globales + Tailwind
│   └── dashboard/
│       ├── layout.tsx      # Layout del dashboard con sidebar
│       └── clients/
│           └── page.tsx    # Página de listado (implementar en 3.2)
├── components/
│   ├── ui/                 # Componentes de shadcn/ui
│   └── layout/
│       └── sidebar.tsx     # Menú lateral
├── lib/
│   ├── utils.ts            # Utilidades (cn de shadcn)
│   └── api.ts              # Cliente API
├── hooks/
│   └── use-debounce.ts     # Hook de debounce
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

**Instrucciones Detalladas:**

1.  En la **raíz del proyecto** (fuera de `functions/`), crea la aplicación Next.js:
    ```bash
    npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
    ```

2.  Entra al directorio y configura shadcn/ui:
    ```bash
    cd web
    npx shadcn-ui@latest init
    ```
    Cuando pregunte, selecciona:
    - Style: Default
    - Base color: Slate
    - CSS variables: Yes

3.  Instala los componentes de shadcn/ui necesarios:
    ```bash
    npx shadcn-ui@latest add button input label table skeleton toast alert-dialog dropdown-menu card badge select combobox
    ```

4.  Instala dependencias adicionales:
    ```bash
    npm install zustand lucide-react date-fns
    npm install -D @types/node
    ```

5.  Configura la fuente "Inter" en `app/layout.tsx`:
    ```typescript
    import { Inter } from 'next/font/google';
    
    const inter = Inter({ subsets: ['latin'] });
    
    export default function RootLayout({ children }) {
      return (
        <html lang="es">
          <body className={inter.className}>{children}</body>
        </html>
      );
    }
    ```

6.  Actualiza `tailwind.config.ts` con los colores de la marca según `UI-UX-GUIDELINES.md`:
    ```typescript
    // Los colores ya están configurados por shadcn, pero asegúrate de que:
    // - primary usa blue-600
    // - background usa slate-50
    // - card usa white
    ```

7.  Crea `lib/api.ts` - Cliente para comunicarse con la API:
    ```typescript
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    
    export async function fetchApi<T>(
      endpoint: string, 
      options: RequestInit = {}
    ): Promise<T> {
      const token = await getAuthToken(); // Implementar con Firebase Auth
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Error en la petición');
      }
      
      return response.json();
    }
    ```

8.  Crea `hooks/use-debounce.ts`:
    ```typescript
    import { useState, useEffect } from 'react';
    
    export function useDebounce<T>(value: T, delay: number): T {
      const [debouncedValue, setDebouncedValue] = useState<T>(value);
      
      useEffect(() => {
        const handler = setTimeout(() => {
          setDebouncedValue(value);
        }, delay);
        
        return () => clearTimeout(handler);
      }, [value, delay]);
      
      return debouncedValue;
    }
    ```

**Criterios de Aceptación:**
-   [ ] El proyecto Next.js se crea sin errores
-   [ ] `npm run dev` inicia el servidor de desarrollo correctamente
-   [ ] `npm run build` compila sin errores
-   [ ] Los componentes de shadcn/ui están instalados en `components/ui/`
-   [ ] La fuente Inter se carga correctamente
-   [ ] Los colores siguen la paleta definida en `UI-UX-GUIDELINES.md`

---

### Tarea 3.2: Implementación del Layout Principal y Sidebar

**Dependencias:** Tarea 3.1 completada

**Documentos de Referencia:**
-   `docs/UI-UX-GUIDELINES.md` - Sección 4.a (Flujo CRUD)

**Archivos a Crear:**
```
web/
├── components/layout/
│   ├── sidebar.tsx
│   └── header.tsx
├── app/dashboard/
│   └── layout.tsx
```

**Instrucciones Detalladas:**

1.  Crea `components/layout/sidebar.tsx`:
    ```typescript
    'use client';
    
    import Link from 'next/link';
    import { usePathname } from 'next/navigation';
    import { Users, Tags, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { cn } from '@/lib/utils';
    import { useState } from 'react';
    
    const navItems = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/clients', icon: Users, label: 'Clientes' },
      { href: '/dashboard/groups', icon: Tags, label: 'Grupos' },
    ];
    
    export function Sidebar() {
      const pathname = usePathname();
      const [collapsed, setCollapsed] = useState(false);
      
      return (
        <aside className={cn(
          "h-screen bg-white border-r border-slate-200 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}>
          <div className="flex items-center justify-between p-4 border-b">
            {!collapsed && <h1 className="text-xl font-bold text-slate-900">LoyaltyGen</h1>}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          
          <nav className="p-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  pathname === item.href 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon className="h-5 w-5" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </aside>
      );
    }
    ```

2.  Crea `app/dashboard/layout.tsx`:
    ```typescript
    import { Sidebar } from '@/components/layout/sidebar';
    import { Toaster } from '@/components/ui/toaster';
    
    export default function DashboardLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return (
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          <main className="flex-1 p-6">
            {children}
          </main>
          <Toaster />
        </div>
      );
    }
    ```

3.  Crea `app/page.tsx` con redirección:
    ```typescript
    import { redirect } from 'next/navigation';
    
    export default function Home() {
      redirect('/dashboard/clients');
    }
    ```

**Criterios de Aceptación:**
-   [ ] El sidebar se muestra a la izquierda de la pantalla
-   [ ] El sidebar es colapsable (muestra solo iconos cuando está colapsado)
-   [ ] Los items de navegación tienen el hover correcto
-   [ ] El item activo se resalta con fondo azul
-   [ ] La página raíz redirige a `/dashboard/clients`

---

### Tarea 3.3: Página de Listado de Clientes

**Dependencias:** Tarea 3.2 completada

**Documentos de Referencia:**
-   `docs/USER-STORIES.md` - **HU1** y **HU7**

**Archivos a Crear:**
```
web/
├── components/
│   ├── clients/
│   │   ├── clients-table.tsx
│   │   ├── client-search.tsx
│   │   └── client-actions.tsx
│   └── empty-state.tsx
├── app/dashboard/clients/
│   └── page.tsx
```

**Instrucciones Detalladas:**

1.  Crea `components/empty-state.tsx`:
    ```typescript
    import { LucideIcon } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    
    interface EmptyStateProps {
      icon: LucideIcon;
      title: string;
      description: string;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
    
    export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icon className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">{title}</h3>
          <p className="text-sm text-slate-500 mb-4">{description}</p>
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      );
    }
    ```

2.  Crea `components/clients/client-search.tsx`:
    ```typescript
    'use client';
    
    import { Search, X } from 'lucide-react';
    import { Input } from '@/components/ui/input';
    import { Button } from '@/components/ui/button';
    
    interface ClientSearchProps {
      value: string;
      onChange: (value: string) => void;
      onClear: () => void;
    }
    
    export function ClientSearch({ value, onChange, onClear }: ClientSearchProps) {
      return (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar cliente..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    }
    ```

3.  Crea `components/clients/clients-table.tsx` - Tabla con skeleton y acciones (ver HU1 para detalles completos). La tabla debe mostrar columnas para Nombre, Email y Documento de Identidad. El documento de identidad debe mostrarse en formato "Tipo: Número" (ej. "Pasaporte: AB123456") o "-" si no está presente.

4.  Crea `app/dashboard/clients/page.tsx`:
    ```typescript
    'use client';
    
    import { useState, useEffect } from 'react';
    import { useRouter } from 'next/navigation';
    import { Users, Plus } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { ClientsTable } from '@/components/clients/clients-table';
    import { ClientSearch } from '@/components/clients/client-search';
    import { EmptyState } from '@/components/empty-state';
    import { useDebounce } from '@/hooks/use-debounce';
    import { fetchApi } from '@/lib/api';
    
    export default function ClientsPage() {
      const router = useRouter();
      const [clients, setClients] = useState([]);
      const [loading, setLoading] = useState(true);
      const [searchTerm, setSearchTerm] = useState('');
      const debouncedSearch = useDebounce(searchTerm, 300);
      
      useEffect(() => {
        loadClients();
      }, []);
      
      async function loadClients() {
        setLoading(true);
        try {
          const response = await fetchApi('/clients');
          setClients(response.data);
        } catch (error) {
          console.error('Error loading clients:', error);
        } finally {
          setLoading(false);
        }
      }
      
      // Filtrado cliente-side para MVP (ver HU7)
      // Busca por nombre, email y número de documento de identidad
      const filteredClients = clients.filter(client => {
        const search = debouncedSearch.toLowerCase();
        const matchesName = client.name.toLowerCase().includes(search);
        const matchesEmail = client.email?.toLowerCase().includes(search) || false;
        const matchesDocument = client.identity_document?.number?.toLowerCase().includes(search) || false;
        return matchesName || matchesEmail || matchesDocument;
      });
      
      const hasNoClients = !loading && clients.length === 0;
      const hasNoResults = !loading && clients.length > 0 && filteredClients.length === 0;
      
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
            <Button onClick={() => router.push('/dashboard/clients/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Nuevo Cliente
            </Button>
          </div>
          
          {!hasNoClients && (
            <ClientSearch
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
            />
          )}
          
          {loading ? (
            <ClientsTable.Skeleton />
          ) : hasNoClients ? (
            <EmptyState
              icon={Users}
              title="Aún no se han creado clientes"
              description="Comienza creando tu primer cliente"
              action={{
                label: 'Crear Nuevo Cliente',
                onClick: () => router.push('/dashboard/clients/new')
              }}
            />
          ) : hasNoResults ? (
            <EmptyState
              icon={Users}
              title={`No se encontraron clientes para "${searchTerm}"`}
              description="Intenta con otro término de búsqueda"
              action={{
                label: 'Limpiar búsqueda',
                onClick: () => setSearchTerm('')
              }}
            />
          ) : (
            <ClientsTable clients={filteredClients} onRefresh={loadClients} />
          )}
        </div>
      );
    }
    ```

**Criterios de Aceptación:**
-   [ ] La tabla muestra las columnas "Nombre" y "Email"
-   [ ] El skeleton se muestra mientras cargan los datos
-   [ ] El estado vacío se muestra cuando no hay clientes
-   [ ] El estado vacío de búsqueda se muestra cuando no hay resultados
-   [ ] La búsqueda tiene debounce de 300ms
-   [ ] La búsqueda filtra por nombre y email (case-insensitive)
-   [ ] El menú de acciones tiene opciones Ver, Editar, Eliminar

---

### Tarea 3.4: Formulario y Página de Creación de Cliente

**Dependencias:** Tarea 3.3 completada

**Documentos de Referencia:**
-   `docs/USER-STORIES.md` - **HU2**
-   `openapi.yaml` - Schema `CreateClientRequest`

**Archivos a Crear:**
```
web/
├── components/clients/
│   └── client-form.tsx
├── app/dashboard/clients/
│   └── new/
│       └── page.tsx
```

**Instrucciones Detalladas:**

1.  Instala react-hook-form y resolver de Zod:
    ```bash
    npm install react-hook-form @hookform/resolvers zod
    ```

2.  Crea `components/clients/client-form.tsx`:
    ```typescript
    'use client';
    
    import { useForm, useWatch } from 'react-hook-form';
    import { zodResolver } from '@hookform/resolvers/zod';
    import { z } from 'zod';
    import { Loader2 } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    
    // Tipos de documento de identidad válidos
    const identityDocumentTypes = [
      { value: 'cedula_identidad', label: 'Cédula de Identidad' },
      { value: 'pasaporte', label: 'Pasaporte' },
    ] as const;
    
    const clientFormSchema = z.object({
      name: z.string().min(1, 'El nombre es requerido'),
      email: z.string().email('Debe ser un email válido').optional().or(z.literal('')),
      identity_document_type: z.enum(['cedula_identidad', 'pasaporte']).optional().or(z.literal('')),
      identity_document_number: z.string()
        .regex(/^[a-zA-Z0-9]*$/, 'El número de documento debe ser alfanumérico')
        .optional()
        .or(z.literal('')),
    }).refine(
      (data) => {
        // Al menos uno de email o documento de identidad debe estar presente
        const hasEmail = data.email && data.email.length > 0;
        const hasDocument = data.identity_document_type && 
                           data.identity_document_type !== '' && 
                           data.identity_document_number && 
                           data.identity_document_number.length > 0;
        return hasEmail || hasDocument;
      },
      {
        message: 'Debe proporcionar al menos un identificador: email o documento de identidad',
        // Sin path para indicar que es un error a nivel de formulario
      }
    ).refine(
      (data) => {
        // Si se proporciona el tipo de documento, el número es obligatorio y viceversa
        const hasType = data.identity_document_type && data.identity_document_type !== '';
        const hasNumber = data.identity_document_number && data.identity_document_number.length > 0;
        return (hasType && hasNumber) || (!hasType && !hasNumber);
      },
      {
        message: 'Debe proporcionar tanto el tipo como el número del documento',
        path: ['identity_document_number'],
      }
    );
    
    type ClientFormData = z.infer<typeof clientFormSchema>;
    
    interface ClientFormProps {
      onSubmit: (data: ClientFormData) => Promise<void>;
      isSubmitting: boolean;
      serverError?: string;
      serverErrorField?: 'email' | 'identity_document';
      formError?: string; // Error a nivel de formulario (ej. falta de identificador)
    }
    
    export function ClientForm({ onSubmit, isSubmitting, serverError, serverErrorField, formError }: ClientFormProps) {
      const { register, handleSubmit, formState: { errors, isValid }, control, setValue } = useForm<ClientFormData>({
        resolver: zodResolver(clientFormSchema),
        mode: 'onChange',
        defaultValues: {
          name: '',
          email: '',
          identity_document_type: '',
          identity_document_number: '',
        }
      });
      
      const documentType = useWatch({ control, name: 'identity_document_type' });
      
      // Obtener error a nivel de formulario de Zod (errores sin path específico)
      const zodFormError = errors.root?.message;
      
      return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              {...register('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              aria-invalid={!!errors.email || (serverErrorField === 'email' && !!serverError)}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
            {serverErrorField === 'email' && serverError && (
              <p className="text-sm text-red-500">{serverError}</p>
            )}
          </div>
          
          <div className="border-t pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Proporcione email o documento de identidad (al menos uno es requerido)
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="identity_document_type">Tipo de Documento</Label>
              <Select
                value={documentType || ''}
                onValueChange={(value) => setValue('identity_document_type', value as 'cedula_identidad' | 'pasaporte' | '', { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  {identityDocumentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="identity_document_number">Número de Documento</Label>
              <Input
                id="identity_document_number"
                {...register('identity_document_number')}
                aria-invalid={!!errors.identity_document_number || (serverErrorField === 'identity_document' && !!serverError)}
                disabled={!documentType}
                placeholder="Ej: AB123456"
              />
              {errors.identity_document_number && (
                <p className="text-sm text-red-500">{errors.identity_document_number.message}</p>
              )}
              {serverErrorField === 'identity_document' && serverError && (
                <p className="text-sm text-red-500">{serverError}</p>
              )}
            </div>
            
            {/* Mostrar error a nivel de formulario (falta de identificador) */}
            {zodFormError && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{zodFormError}</p>
            )}
          </div>
          
          <Button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </form>
      );
    }
    ```

3.  Crea `app/dashboard/clients/new/page.tsx`:
    ```typescript
    'use client';
    
    import { useState } from 'react';
    import { useRouter } from 'next/navigation';
    import { ArrowLeft } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
    import { ClientForm } from '@/components/clients/client-form';
    import { useToast } from '@/components/ui/use-toast';
    import { fetchApi } from '@/lib/api';
    
    interface ClientFormData {
      name: string;
      email?: string;
      identity_document_type?: string;
      identity_document_number?: string;
    }
    
    export default function NewClientPage() {
      const router = useRouter();
      const { toast } = useToast();
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [serverError, setServerError] = useState<string>();
      const [serverErrorField, setServerErrorField] = useState<'email' | 'identity_document'>();
      
      async function handleSubmit(data: ClientFormData) {
        setIsSubmitting(true);
        setServerError(undefined);
        setServerErrorField(undefined);
        
        // Transformar los datos del formulario al formato de la API
        const payload: Record<string, unknown> = {
          name: data.name,
        };
        
        if (data.email && data.email.length > 0) {
          payload.email = data.email;
        }
        
        if (data.identity_document_type && data.identity_document_number) {
          payload.identity_document = {
            type: data.identity_document_type,
            number: data.identity_document_number,
          };
        }
        
        try {
          await fetchApi('/clients', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          
          toast({
            title: 'Cliente creado',
            description: 'El cliente ha sido creado exitosamente.',
          });
          
          router.push('/dashboard/clients');
        } catch (error: any) {
          if (error.message.includes('correo electrónico') || error.message.includes('email')) {
            setServerError('El correo electrónico proporcionado ya está en uso.');
            setServerErrorField('email');
          } else if (error.message.includes('documento de identidad') || error.message.includes('identity_document')) {
            setServerError('El documento de identidad proporcionado ya está registrado.');
            setServerErrorField('identity_document');
          } else {
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive',
            });
          }
        } finally {
          setIsSubmitting(false);
        }
      }
      
      return (
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle>Crear Nuevo Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientForm 
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                serverError={serverError}
                serverErrorField={serverErrorField}
              />
            </CardContent>
          </Card>
        </div>
      );
    }
    ```

**Criterios de Aceptación:**
-   [ ] El formulario valida campos obligatorios (nombre, al menos un identificador)
-   [ ] El selector de tipo de documento muestra las opciones "Cédula de Identidad" y "Pasaporte"
-   [ ] El campo de número de documento se habilita solo si se selecciona un tipo
-   [ ] El botón Guardar está deshabilitado cuando el formulario es inválido
-   [ ] El spinner se muestra durante el envío
-   [ ] Error 409 (email duplicado) se muestra junto al campo email
-   [ ] Error 409 (documento duplicado) se muestra junto al campo de número de documento
-   [ ] Tras éxito, redirige a listado y muestra toast

---

### Tarea 3.5: Flujo de Eliminación de Cliente

**Dependencias:** Tarea 3.3 completada

**Documentos de Referencia:**
-   `docs/USER-STORIES.md` - **HU3**

**Archivos a Crear:**
```
web/components/clients/
└── delete-client-dialog.tsx
```

**Instrucciones Detalladas:**

1.  Crea `components/clients/delete-client-dialog.tsx`:
    ```typescript
    'use client';
    
    import { useState } from 'react';
    import { Loader2 } from 'lucide-react';
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
    } from '@/components/ui/alert-dialog';
    import { useToast } from '@/components/ui/use-toast';
    import { fetchApi } from '@/lib/api';
    
    interface DeleteClientDialogProps {
      clientId: string;
      clientName: string;
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onDeleted: () => void;
    }
    
    export function DeleteClientDialog({
      clientId,
      clientName,
      open,
      onOpenChange,
      onDeleted,
    }: DeleteClientDialogProps) {
      const { toast } = useToast();
      const [isDeleting, setIsDeleting] = useState(false);
      
      async function handleDelete() {
        setIsDeleting(true);
        
        try {
          await fetchApi(`/clients/${clientId}`, { method: 'DELETE' });
          
          toast({
            title: 'Proceso iniciado',
            description: 'El proceso de eliminación del cliente ha comenzado.',
          });
          
          onOpenChange(false);
          onDeleted();
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
        } finally {
          setIsDeleting(false);
        }
      }
      
      return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible. Se eliminarán todos los datos de 
                <strong> {clientName}</strong>, incluyendo sus cuentas de lealtad 
                y transacciones.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    ```

2.  Integra el diálogo en la tabla de clientes (actualizar `clients-table.tsx`)

**Criterios de Aceptación:**
-   [ ] El AlertDialog se abre al hacer clic en "Eliminar"
-   [ ] El diálogo muestra el mensaje de advertencia correcto
-   [ ] El botón Cancelar cierra el diálogo
-   [ ] El botón Eliminar muestra spinner durante la petición
-   [ ] Tras éxito, se cierra el diálogo y muestra toast

---

### Tarea 3.6: Componentes de Auditoría Base

**Dependencias:** Tarea 3.3 completada

**Documentos de Referencia:**
-   `docs/USER-STORIES.md` - **HU10, HU11, HU12**
-   `openapi.yaml` - Schemas de Auditoría

**Archivos a Crear:**
```
web/components/audit/
├── audit-logs-list.tsx
├── audit-log-item.tsx
├── audit-log-dialog.tsx
├── audit-action-badge.tsx
└── audit-filters.tsx
```

**Instrucciones Detalladas:**

1.  Crea `components/audit/audit-action-badge.tsx` para mostrar el tipo de acción:
    ```typescript
    import { Badge } from '@/components/ui/badge';

    const actionLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      CLIENT_CREATED: { label: 'Cliente Creado', variant: 'default' },
      CLIENT_UPDATED: { label: 'Cliente Actualizado', variant: 'secondary' },
      CLIENT_DELETED: { label: 'Cliente Eliminado', variant: 'destructive' },
      ACCOUNT_CREATED: { label: 'Cuenta Creada', variant: 'default' },
      POINTS_CREDITED: { label: 'Puntos Acreditados', variant: 'default' },
      POINTS_DEBITED: { label: 'Puntos Debitados', variant: 'outline' },
      GROUP_CREATED: { label: 'Grupo Creado', variant: 'default' },
      CLIENT_ADDED_TO_GROUP: { label: 'Añadido a Grupo', variant: 'secondary' },
      CLIENT_REMOVED_FROM_GROUP: { label: 'Removido de Grupo', variant: 'outline' },
    };

    export function AuditActionBadge({ action }: { action: string }) {
      const { label, variant } = actionLabels[action] || { label: action, variant: 'default' };
      return <Badge variant={variant}>{label}</Badge>;
    }
    ```

2.  Crea `components/audit/audit-log-item.tsx`:
    ```typescript
    import { formatDistanceToNow } from 'date-fns';
    import { es } from 'date-fns/locale';
    import { AuditActionBadge } from './audit-action-badge';

    interface AuditLogItemProps {
      auditLog: {
        id: string;
        action: string;
        resource_type: string;
        resource_id: string;
        actor: { uid: string; email: string | null };
        timestamp: string;
      };
      onClick: () => void;
    }

    export function AuditLogItem({ auditLog, onClick }: AuditLogItemProps) {
      return (
        <div
          className="flex items-center justify-between p-4 border-b hover:bg-slate-50 cursor-pointer"
          onClick={onClick}
        >
          <div className="flex items-center gap-4">
            <AuditActionBadge action={auditLog.action} />
            <div>
              <p className="text-sm font-medium text-slate-900">
                {auditLog.resource_type} ({auditLog.resource_id.slice(0, 8)}...)
              </p>
              <p className="text-xs text-slate-500">
                por {auditLog.actor.email || auditLog.actor.uid}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400">
            {formatDistanceToNow(new Date(auditLog.timestamp), { addSuffix: true, locale: es })}
          </span>
        </div>
      );
    }
    ```

3.  Crea `components/audit/audit-log-dialog.tsx` para mostrar los detalles completos.

4.  Crea `components/audit/audit-filters.tsx` con filtros por tipo de acción y rango de fechas.

5.  Crea `components/audit/audit-logs-list.tsx` que combine los componentes anteriores.

**Criterios de Aceptación:**
-   [ ] Los badges muestran el tipo de acción con el color correcto
-   [ ] Los items muestran la información resumida del registro
-   [ ] El diálogo muestra los detalles completos incluyendo cambios before/after
-   [ ] Los filtros funcionan correctamente
-   [ ] El código compila sin errores de tipo

---

### Tarea 3.7: Sección de Auditoría en Detalle de Cliente

**Dependencias:** Tareas 3.3 y 3.6 completadas

**Documentos de Referencia:**
-   `docs/USER-STORIES.md` - **HU10**

**Archivos a Modificar:**
```
web/app/dashboard/clients/[id]/page.tsx
```

**Instrucciones Detalladas:**

1.  Añade una sección "Historial de Auditoría" a la página de detalle del cliente.
2.  La sección debe usar los componentes de auditoría creados en la tarea 3.6.
3.  Implementa paginación con "Cargar más" o scroll infinito.
4.  Añade filtro por tipo de acción.

**Criterios de Aceptación:**
-   [ ] La sección de auditoría se muestra en la página de detalle
-   [ ] Los registros se cargan del endpoint `/clients/{client_id}/audit-logs`
-   [ ] El filtro por tipo de acción funciona
-   [ ] La paginación funciona correctamente
-   [ ] El diálogo de detalles se abre al hacer clic en un registro

---

### Tarea 3.8: Auditoría de Transacciones

**Dependencias:** Tareas 3.6 completadas

**Documentos de Referencia:**
-   `docs/USER-STORIES.md` - **HU11**

**Archivos a Modificar:**
```
web/components/clients/transactions-list.tsx
```

**Instrucciones Detalladas:**

1.  Añade un botón/ícono "Ver Auditoría" a cada transacción en la lista.
2.  Al hacer clic, consulta el endpoint `/clients/{client_id}/accounts/{account_id}/transactions/{transaction_id}/audit-logs`.
3.  Muestra el resultado en un `Dialog` usando los componentes de auditoría.

**Criterios de Aceptación:**
-   [ ] El botón "Ver Auditoría" aparece en cada transacción
-   [ ] El diálogo muestra la información de auditoría de la transacción
-   [ ] Se maneja correctamente el caso de transacciones sin registro de auditoría

---

### Tarea 3.9: Panel Global de Auditoría

**Dependencias:** Tareas 3.2 y 3.6 completadas

**Documentos de Referencia:**
-   `docs/USER-STORIES.md` - **HU12**

**Archivos a Crear:**
```
web/app/dashboard/audit/page.tsx
```

**Archivos a Modificar:**
```
web/components/layout/sidebar.tsx  # Añadir entrada "Auditoría"
```

**Instrucciones Detalladas:**

1.  Añade una entrada "Auditoría" en el sidebar (usar ícono `FileSearch` de lucide-react).
2.  Crea la página `/dashboard/audit` con:
    -   Tabla de registros de auditoría
    -   Filtros avanzados (fechas, tipo de acción, cliente, cuenta)
    -   Paginación
    -   Diálogo de detalles al hacer clic en una fila

**Criterios de Aceptación:**
-   [ ] La entrada "Auditoría" aparece en el sidebar
-   [ ] La página muestra la tabla de registros
-   [ ] Los filtros funcionan correctamente con debounce
-   [ ] La paginación funciona
-   [ ] El diálogo de detalles se abre correctamente

---

## Épica 4: Calidad y Pruebas

**Objetivo:** Asegurar que la implementación es robusta, correcta y cumple con los estándares de calidad definidos.

**Orden de Ejecución:** Tarea 4.1 → Tarea 4.2

---

### Tarea 4.1: Configuración del Entorno de Pruebas

**Dependencias:** Épica 1 completada

**Documentos de Referencia:**
-   `docs/GUIDELINES.md` - Sección 5 (Testing)
-   `docs/SPECS.md` - Sección 2.d (Pruebas)

**Archivos a Crear:**
```
functions/
├── jest.config.js
├── src/__tests__/
│   ├── setup.ts
│   └── helpers/
│       └── firebase-mock.ts
```

**Instrucciones Detalladas:**

1.  Instala las dependencias de testing:
    ```bash
    cd functions
    npm install -D jest @types/jest ts-jest firebase-functions-test supertest @types/supertest
    ```

2.  Crea `jest.config.js`:
    ```javascript
    module.exports = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/__tests__/**',
        '!src/index.ts'
      ],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    };
    ```

3.  Crea `src/__tests__/setup.ts`:
    ```typescript
    import * as admin from 'firebase-admin';
    
    // Mock de Firebase Admin
    jest.mock('firebase-admin', () => {
      const firestoreMock = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        startAfter: jest.fn().mockReturnThis(),
        runTransaction: jest.fn(),
      };
      
      return {
        initializeApp: jest.fn(),
        firestore: jest.fn(() => firestoreMock),
        auth: jest.fn(() => ({
          verifyIdToken: jest.fn(),
        })),
      };
    });
    
    // Limpiar mocks entre tests
    beforeEach(() => {
      jest.clearAllMocks();
    });
    ```

4.  Crea `src/__tests__/helpers/firebase-mock.ts`:
    ```typescript
    import * as admin from 'firebase-admin';
    
    // Helper para crear snapshots de documentos mock
    export function createMockDocSnapshot(id: string, data: object | null) {
      return {
        id,
        exists: data !== null,
        data: () => data,
        ref: {
          id,
          collection: jest.fn(),
        }
      };
    }
    
    // Helper para crear snapshots de queries mock
    export function createMockQuerySnapshot(docs: Array<{ id: string; data: object }>) {
      return {
        empty: docs.length === 0,
        docs: docs.map(doc => createMockDocSnapshot(doc.id, doc.data)),
      };
    }
    ```

5.  Añade scripts a `package.json`:
    ```json
    "scripts": {
      "test": "jest",
      "test:watch": "jest --watch",
      "test:coverage": "jest --coverage"
    }
    ```

**Criterios de Aceptación:**
-   [ ] `npm test` ejecuta sin errores de configuración
-   [ ] Los mocks de Firebase están configurados correctamente
-   [ ] El threshold de cobertura está configurado al 80%

---

### Tarea 4.2: Suite de Pruebas de la API

**Dependencias:** Tarea 4.1 y Épica 2 completadas

**Documentos de Referencia:**
-   `openapi.yaml` - Todos los endpoints y respuestas
-   `docs/API-DESIGN.md` - Formato de respuestas de error

**Archivos a Crear:**
```
functions/src/__tests__/
├── services/
│   ├── client.service.test.ts
│   ├── group.service.test.ts
│   └── account.service.test.ts
├── api/
│   ├── client.routes.test.ts
│   ├── group.routes.test.ts
│   └── account.routes.test.ts
└── middleware/
    ├── auth.middleware.test.ts
    └── error.middleware.test.ts
```

**Instrucciones Detalladas:**

1.  Crea `src/__tests__/middleware/auth.middleware.test.ts`:
    ```typescript
    import { Request, Response, NextFunction } from 'express';
    import * as admin from 'firebase-admin';
    import { authMiddleware } from '../../api/middleware/auth.middleware';
    
    describe('Auth Middleware', () => {
      let mockRequest: Partial<Request>;
      let mockResponse: Partial<Response>;
      let nextFunction: NextFunction;
      
      beforeEach(() => {
        mockRequest = {
          headers: {}
        };
        mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        nextFunction = jest.fn();
      });
      
      it('should return 401 when Authorization header is missing', async () => {
        await authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: {
            code: 'INVALID_TOKEN',
            message: expect.any(String)
          }
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });
      
      it('should return 401 when token format is invalid', async () => {
        mockRequest.headers = { authorization: 'InvalidFormat' };
        
        await authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
      });
      
      it('should call next() with user data when token is valid', async () => {
        const mockDecodedToken = { uid: 'test-uid', email: 'test@example.com' };
        mockRequest.headers = { authorization: 'Bearer valid-token' };
        
        (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue(mockDecodedToken);
        
        await authMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
        
        expect(nextFunction).toHaveBeenCalled();
        expect(mockRequest.user).toEqual(mockDecodedToken);
      });
    });
    ```

2.  Crea `src/__tests__/services/client.service.test.ts`:
    ```typescript
    import { clientService } from '../../services/client.service';
    import { createMockDocSnapshot, createMockQuerySnapshot } from '../helpers/firebase-mock';
    import * as admin from 'firebase-admin';
    
    describe('ClientService', () => {
      const mockFirestore = admin.firestore();
      
      describe('create', () => {
        it('should create a new client with email successfully', async () => {
          // Mock: email no existe
          (mockFirestore.collection('clients').where as jest.Mock)
            .mockReturnValue({
              limit: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ empty: true })
              })
            });
          
          // Mock: crear documento
          const mockDocRef = { id: 'new-client-id', set: jest.fn() };
          (mockFirestore.collection('clients').doc as jest.Mock)
            .mockReturnValue(mockDocRef);
          
          const result = await clientService.create({
            name: 'Test Client',
            email: 'test@example.com'
          });
          
          expect(result.id).toBe('new-client-id');
          expect(result.name).toBe('Test Client');
          expect(result.email).toBe('test@example.com');
          expect(mockDocRef.set).toHaveBeenCalled();
        });
        
        it('should create a new client with identity document successfully', async () => {
          // Mock: documento no existe
          (mockFirestore.collection('clients').where as jest.Mock)
            .mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue({ empty: true })
                })
              })
            });
          
          // Mock: crear documento
          const mockDocRef = { id: 'new-client-id', set: jest.fn() };
          (mockFirestore.collection('clients').doc as jest.Mock)
            .mockReturnValue(mockDocRef);
          
          const result = await clientService.create({
            name: 'Test Client',
            identity_document: {
              type: 'cedula_identidad',
              number: 'ABC123456'
            }
          });
          
          expect(result.id).toBe('new-client-id');
          expect(result.name).toBe('Test Client');
          expect(result.identity_document).toEqual({
            type: 'cedula_identidad',
            number: 'ABC123456'
          });
          expect(mockDocRef.set).toHaveBeenCalled();
        });
        
        it('should throw ConflictError when email already exists', async () => {
          // Mock: email existe
          (mockFirestore.collection('clients').where as jest.Mock)
            .mockReturnValue({
              limit: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ empty: false })
              })
            });
          
          await expect(
            clientService.create({ name: 'Test', email: 'existing@example.com' })
          ).rejects.toThrow('ya está en uso');
        });
        
        it('should throw ConflictError when identity document already exists', async () => {
          // Mock: documento existe
          (mockFirestore.collection('clients').where as jest.Mock)
            .mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue({ empty: false })
                })
              })
            });
          
          await expect(
            clientService.create({ 
              name: 'Test', 
              identity_document: {
                type: 'pasaporte',
                number: 'EXISTING123'
              }
            })
          ).rejects.toThrow('ya está registrado');
        });
      });
      
      describe('getById', () => {
        it('should return client when found', async () => {
          const mockData = {
            name: 'Test',
            email: 'test@example.com',
            identity_document: null,
            affinityGroupIds: [],
            account_balances: {},
            created_at: { toDate: () => new Date() },
            updated_at: { toDate: () => new Date() },
          };
          
          (mockFirestore.collection('clients').doc('client-1').get as jest.Mock)
            .mockResolvedValue(createMockDocSnapshot('client-1', mockData));
          
          const result = await clientService.getById('client-1');
          
          expect(result.id).toBe('client-1');
          expect(result.name).toBe('Test');
        });
        
        it('should throw NotFoundError when client does not exist', async () => {
          (mockFirestore.collection('clients').doc('nonexistent').get as jest.Mock)
            .mockResolvedValue(createMockDocSnapshot('nonexistent', null));
          
          await expect(
            clientService.getById('nonexistent')
          ).rejects.toThrow('no fue encontrado');
        });
      });
    });
    ```

3.  Crea `src/__tests__/services/account.service.test.ts`:
    ```typescript
    import { accountService } from '../../services/account.service';
    import * as admin from 'firebase-admin';
    
    describe('AccountService', () => {
      const mockFirestore = admin.firestore();
      
      describe('credit', () => {
        it('should credit points atomically', async () => {
          const mockTransaction = {
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn(),
          };
          
          // Simular cliente y cuenta existentes
          mockTransaction.get.mockResolvedValueOnce(
            { exists: true, data: () => ({ account_balances: {} }) }
          );
          mockTransaction.get.mockResolvedValueOnce(
            { exists: true, data: () => ({ points: 100, account_name: 'Test' }) }
          );
          
          (mockFirestore.runTransaction as jest.Mock).mockImplementation(
            async (fn) => fn(mockTransaction)
          );
          
          const result = await accountService.credit('client-1', 'account-1', {
            amount: 50,
            description: 'Test credit'
          });
          
          expect(result.points).toBe(150);
          expect(mockTransaction.update).toHaveBeenCalled();
        });
      });
      
      describe('debit', () => {
        it('should throw InsufficientBalanceError when balance is insufficient', async () => {
          const mockTransaction = {
            get: jest.fn(),
          };
          
          mockTransaction.get.mockResolvedValueOnce(
            { exists: true, data: () => ({}) }
          );
          mockTransaction.get.mockResolvedValueOnce(
            { exists: true, data: () => ({ points: 30 }) }
          );
          
          (mockFirestore.runTransaction as jest.Mock).mockImplementation(
            async (fn) => fn(mockTransaction)
          );
          
          await expect(
            accountService.debit('client-1', 'account-1', { amount: 50 })
          ).rejects.toThrow('insuficiente');
        });
      });
    });
    ```

4.  **Escribe pruebas similares para:**
    -   `group.service.test.ts` - Crear grupo, asignar/desasignar cliente
    -   `audit.service.test.ts` - Crear y listar registros de auditoría
    -   `error.middleware.test.ts` - Formateo de ZodError, AppError, errores genéricos
    -   Pruebas de integración con supertest para las rutas

**Criterios de Aceptación:**
-   [ ] Todas las pruebas pasan (`npm test`)
-   [ ] La cobertura de código es superior al 80% (`npm run test:coverage`)
-   [ ] Se prueban tanto casos de éxito como de error
-   [ ] Las pruebas de middleware validan el formato de respuesta de error
-   [ ] Las pruebas de servicios validan la lógica de negocio crítica (transacciones atómicas)
-   [ ] Las pruebas de auditoría validan que los registros se crean correctamente

---

## Resumen de Dependencias entre Tareas

```
Épica 1: Configuración del Proyecto y Core del Backend
├── Tarea 1.1: Andamiaje (inicio)
├── Tarea 1.2: Auth Middleware (depende de 1.1)
└── Tarea 1.3: Error Middleware (depende de 1.1, 1.2)

Épica 2: Implementación de la API
├── Tarea 2.1: Schemas de Zod (depende de Épica 1)
├── Tarea 2.2: Endpoints Clients (depende de 2.1)
├── Tarea 2.3: Endpoints Groups (depende de 2.2)
└── Tarea 2.4: Endpoints Accounts (depende de 2.3) [CRÍTICA: transacciones atómicas]

Épica 2.5: Sistema de Auditoría [NUEVA]
├── Tarea 2.5.1: Schema y Servicio de Auditoría (depende de 2.1)
├── Tarea 2.5.2: Integración en Servicios (depende de 2.2, 2.3, 2.4, 2.5.1) [CRÍTICA: transacciones atómicas en credit/debit]
├── Tarea 2.5.3: Endpoints de Auditoría (depende de 2.5.1)
└── Tarea 2.5.4: Pruebas de Auditoría (depende de 2.5.1, 2.5.2, 2.5.3)

Épica 3: Frontend (puede ejecutarse en paralelo con Épica 1 y 2)
├── Tarea 3.1: Andamiaje Next.js (inicio)
├── Tarea 3.2: Layout y Sidebar (depende de 3.1)
├── Tarea 3.3: Listado de Clientes (depende de 3.2) [HU1, HU7]
├── Tarea 3.4: Crear Cliente (depende de 3.3) [HU2]
├── Tarea 3.5: Eliminar Cliente (depende de 3.3) [HU3]
├── Tarea 3.6: Componentes de Auditoría Base (depende de 3.3) [HU10, HU11, HU12]
├── Tarea 3.7: Auditoría en Detalle de Cliente (depende de 3.6) [HU10]
├── Tarea 3.8: Auditoría de Transacciones (depende de 3.6) [HU11]
└── Tarea 3.9: Panel Global de Auditoría (depende de 3.2, 3.6) [HU12]

Épica 4: Calidad y Pruebas
├── Tarea 4.1: Config Testing (depende de Épica 1)
└── Tarea 4.2: Suite de Pruebas (depende de 4.1, Épica 2, Épica 2.5)
```

---

## Checklist de Finalización del MVP

Antes de considerar el MVP como completo, verifica:

**Backend:**
-   [ ] Todos los endpoints de `openapi.yaml` están implementados
-   [ ] El middleware de autenticación funciona correctamente
-   [ ] El formato de errores es consistente con `API-DESIGN.md`
-   [ ] Las operaciones de credit/debit usan transacciones atómicas
-   [ ] La validación de identificadores (email o documento de identidad) funciona correctamente
-   [ ] La validación de unicidad de email y documento de identidad funciona
-   [ ] La cobertura de pruebas es superior al 80%
-   [ ] El código compila sin errores de TypeScript

**Auditoría:**
-   [ ] Todas las operaciones de creación generan registro de auditoría
-   [ ] Todas las operaciones de actualización generan registro de auditoría con cambios before/after
-   [ ] Todas las operaciones de eliminación generan registro de auditoría
-   [ ] Las operaciones de credit/debit generan registro dentro de la misma transacción atómica
-   [ ] Los endpoints de consulta de auditoría funcionan con filtros
-   [ ] Los registros incluyen información del actor (uid, email)
-   [ ] Los registros incluyen metadatos cuando están disponibles (IP, user agent)

**Frontend:**
-   [ ] El listado de clientes funciona y muestra email y documento de identidad (HU1)
-   [ ] La creación de clientes funciona con email y/o documento de identidad (HU2)
-   [ ] La eliminación de clientes funciona con confirmación (HU3)
-   [ ] La búsqueda de clientes funciona por nombre, email y documento (HU7)
-   [ ] La sección de auditoría se muestra en el detalle de cliente (HU10)
-   [ ] La auditoría de transacciones es accesible desde cada transacción (HU11)
-   [ ] El panel global de auditoría funciona con filtros (HU12)
-   [ ] Todos los estados (carga, vacío, error) están implementados
-   [ ] La UI sigue las guías de `UI-UX-GUIDELINES.md`

**Integración:**
-   [ ] El frontend se comunica correctamente con el backend
-   [ ] La autenticación con Firebase Auth funciona
-   [ ] El deploy a Firebase Hosting funciona
-   [ ] El deploy de Cloud Functions funciona
