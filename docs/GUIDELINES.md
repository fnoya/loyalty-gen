# GUIDELINES.md - Directrices de Codificación (Stack TypeScript/Firebase)

Este documento establece las reglas y convenciones que el agente de IA debe seguir estrictamente durante el desarrollo de LoyaltyGen con TypeScript y Firebase.

## 1. Estilo de Código y Linting

-   **Estándar:** Se seguirá una guía de estilo estándar de la comunidad (ej. Google, Airbnb), reforzada por ESLint.
-   **Formateador:** **`Prettier`** es obligatorio para formatear todo el código de manera consistente.
-   **Linter:** **`ESLint`** con plugins para TypeScript (`@typescript-eslint/eslint-plugin`) y Node.js se usará para detectar errores de estilo y posibles bugs. El código no debe tener errores de linting.

## 2. Tipado Estricto (TypeScript)

-   **Obligatorio:** El modo estricto de TypeScript (`"strict": true` en `tsconfig.json`) debe estar activado.
-   **`any` está prohibido:** No se debe usar el tipo `any`. Usar `unknown` y realizar validación de tipo si es necesario.

## 3. Zod como Única Fuente de Verdad para Modelos

Para eliminar la duplicación y prevenir la desincronización entre la validación y el tipado, se establece la siguiente regla:

1.  **Definir el Schema de Zod:** La forma de los datos se define primero en un schema de Zod en un archivo `app/schemas/*.schema.ts`.
2.  **Inferir el Tipo de TypeScript:** El tipo de TypeScript se debe inferir directamente del schema de Zod.
    ```typescript
    // en app/schemas/client.schema.ts
    import { z } from 'zod';

    export const clientSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      // ... otros campos
    });

    export type Client = z.infer<typeof clientSchema>;
    ```
3.  **Eliminar Interfaces Manuales:** Los archivos `app/models/*.model.ts` no deben existir para objetos que ya están definidos por un schema de Zod. El schema es la única fuente de verdad.

## 3.1. Convenciones para Campos de Cliente

Para habilitar búsquedas eficientes en Firestore, se han establecido las siguientes convenciones para el modelo de Cliente:

### 3.1.1. Campos de Nombre Separados

-   **Requerimiento:** Los nombres de los clientes deben almacenarse en campos separados para permitir búsquedas específicas.
-   **Campos requeridos:**
    -   `firstName: string` - Primer nombre del cliente
    -   `firstSurname: string` - Primer apellido del cliente
-   **Campos opcionales:**
    -   `secondName?: string` - Segundo nombre del cliente
    -   `secondSurname?: string` - Segundo apellido del cliente

### 3.1.2. Campos Normalizados para Búsqueda Case-Insensitive

-   **Requerimiento:** Para cada campo de texto que necesite ser buscado de manera case-insensitive, se debe almacenar una versión normalizada con el sufijo `_lower`.
-   **Generación automática:** Los campos `_lower` deben ser generados automáticamente por el servicio antes de guardar en Firestore.
-   **Campos normalizados del Cliente:**
    -   `firstName_lower: string` - toLowerCase() de firstName
    -   `secondName_lower?: string` - toLowerCase() de secondName (si existe)
    -   `firstSurname_lower: string` - toLowerCase() de firstSurname
    -   `secondSurname_lower?: string` - toLowerCase() de secondSurname (si existe)
-   **Documento de identidad:**
    -   `identity_document.number_lower: string` - toLowerCase() del número de documento

**Ejemplo de implementación:**
```typescript
// En el servicio de clientes
function normalizeClientForSearch(client: CreateClientInput): ClientDocument {
  return {
    ...client,
    firstName_lower: client.firstName.toLowerCase(),
    secondName_lower: client.secondName?.toLowerCase() || null,
    firstSurname_lower: client.firstSurname.toLowerCase(),
    secondSurname_lower: client.secondSurname?.toLowerCase() || null,
    identity_document: client.identity_document ? {
      ...client.identity_document,
      number_lower: client.identity_document.number.toLowerCase()
    } : null
  };
}
```

### 3.1.3. Números de Teléfono

-   **Campo:** `phoneNumbers: string[]` - Array de números de teléfono
-   **Formato:** Los números de teléfono deben almacenarse como strings, permitiendo caracteres comunes: dígitos, `+`, `-`, espacios, y paréntesis.
-   **Validación:** Pattern regex: `^[0-9+\\-\\s()]+$`

### 3.1.4. Migración de Datos Existentes

Si existen clientes con el schema antiguo (campo único `name`):
1.  Implementar un script de migración que divida `name` en `firstName` y `firstSurname`
2.  Generar los campos `_lower` correspondientes
3.  Actualizar las reglas de seguridad de Firestore para requerir los nuevos campos

### 3.1.5. Referencia de Documentación

Para más detalles sobre la estrategia de búsqueda y las limitaciones de Firestore, consultar:
-   `docs/FIRESTORE-SEARCH-SOLUTION.md` - Solución completa de búsqueda
-   `docs/ARCHITECTURE.md` - Modelo de datos actualizado
-   `openapi.yaml` - Especificación del endpoint `/clients/search`

## 4. Estructura de la Lógica de Negocio

-   **Rutas/Controladores (`app/api/routes/`):** Deben ser "delgados". Su única responsabilidad es validar la entrada (vía middleware), llamar al servicio apropiado y manejar la respuesta HTTP. No deben contener lógica de negocio.
-   **Servicios (`app/services/`):** Deben contener toda la lógica de negocio y de dominio. Interactúan con Firestore y orquestan las operaciones.

## 5. Pruebas (Testing)

-   **Framework:** Utilizar **`Jest`**.
-   **Tipos de Pruebas:** Se deben escribir pruebas unitarias para los servicios (usando mocks) y pruebas de integración para las Cloud Functions (usando `firebase-functions-test` y el emulador).
-   **Cobertura:** La cobertura de código debe ser superior al 80%.

## 6. Manejo de Desnormalización de Datos

-   **Regla de Oro - Atomicidad:** Es **crítico** mantener la consistencia de los datos desnormalizados. Cualquier operación que modifique la fuente de verdad (ej. `points` en `loyaltyAccount`) **debe** actualizar el dato desnormalizado (ej. `account_balances` en `client`) dentro de la **misma transacción atómica de Firestore**.

## 6.1. Manejo de Timestamps en Firebase

**CRÍTICO:** Al trabajar con Firebase emulators o producción:

### Reglas de Timestamps

1. **Siempre importar FieldValue desde firebase-admin/firestore:**
   ```typescript
   import { FieldValue } from "firebase-admin/firestore";
   ```

2. **NUNCA usar `admin.firestore.Timestamp.now()`** - está indefinido en entornos de emulator.

3. **Para escrituras, usar `FieldValue.serverTimestamp()`:**
   ```typescript
   await docRef.set({
     name: data.name,
     created_at: FieldValue.serverTimestamp(),
     updated_at: FieldValue.serverTimestamp()
   });
   ```

4. **Para lecturas, convertir Firestore Timestamps a Dates:**
   ```typescript
   const data = doc.data()!;
   return schema.parse({
     id: doc.id,
     name: data.name,
     created_at: data.created_at.toDate ? data.created_at.toDate() : data.created_at,
     updated_at: data.updated_at.toDate ? data.updated_at.toDate() : data.updated_at
   });
   ```

5. **NUNCA validar objetos que contienen `FieldValue.serverTimestamp()`** - es un valor centinela, no un Date:
   - Escribir a Firestore con centinela
   - Recuperar el documento después de la escritura
   - Convertir timestamps a Dates
   - Entonces validar con Zod

6. **Usar FieldValue importado para operaciones de array:**
   ```typescript
   // ✅ CORRECTO
   affinityGroupIds: FieldValue.arrayUnion(groupId)
   
   // ❌ INCORRECTO - indefinido en emulators
   affinityGroupIds: admin.firestore.FieldValue.arrayUnion(groupId)
   ```

### Patrón para Operaciones de Creación

```typescript
async createEntity(data: CreateRequest): Promise<Entity> {
  const docRef = this.firestore.collection("entities").doc();
  
  // Escribir con centinela de timestamp del servidor
  await docRef.set({
    name: data.name,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp()
  });
  
  // Recuperar para obtener timestamps reales
  const doc = await docRef.get();
  const docData = doc.data()!;
  
  // Convertir y validar
  return entitySchema.parse({
    id: doc.id,
    name: docData.name,
    created_at: docData.created_at.toDate(),
    updated_at: docData.updated_at.toDate()
  });
}
```

### Patrón para Operaciones con Transacciones

```typescript
async updateWithTransaction(id: string, data: UpdateData): Promise<Entity> {
  const docRef = this.firestore.collection("entities").doc(id);
  
  // Ejecutar transacción con timestamp del servidor
  await this.firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);
    if (!doc.exists) throw new NotFoundError("Entity", id);
    
    transaction.update(docRef, {
      ...data,
      updated_at: FieldValue.serverTimestamp()
    });
  });
  
  // Recuperar después de la transacción para obtener timestamp real
  const updatedDoc = await docRef.get();
  const docData = updatedDoc.data()!;
  
  return entitySchema.parse({
    id: updatedDoc.id,
    ...docData,
    created_at: docData.created_at.toDate(),
    updated_at: docData.updated_at.toDate()
  });
}
```

### Lecciones Clave

- `FieldValue.serverTimestamp()` no puede ser validado en valores de retorno de transacciones
- Se deben recuperar documentos después de transacciones atómicas para obtener timestamps reales del servidor
- Todas las actualizaciones desnormalizadas deben estar en la misma transacción que las actualizaciones de la fuente de verdad
- Los tests de integración detectan problemas específicos de emulators que los tests unitarios no detectan

## 7. Gestión de la Configuración y Secretos

-   **Variables de Entorno de Firebase:** Los secretos (claves de API, etc.) y la configuración específica del entorno deben gestionarse a través de las variables de entorno de las funciones de Firebase (`functions.config()`).
-   **NO hardcodear:** Ningún secreto debe estar presente en el código fuente.

## 8. Mensajes de Commit

-   **Estilo:** Seguir estrictamente la especificación de **Conventional Commits**.

## 9. Política de Logging Seguro

Para prevenir la fuga de información sensible, se establecen las siguientes reglas de logging:

-   **NO registrar** Información Personal Identificable (PII) de los clientes, como:
    -   `email`
    -   `name` (estructura completa de nombres y apellidos)
    -   `identity_document` (número y tipo)
    -   `phones` (números telefónicos completos)
    -   `addresses` (direcciones físicas completas)
    -   Contenido de `extra_data` (puede contener información sensible)
-   **NO registrar** información sensible de autenticación, como tokens, encabezados `Authorization` o claves de API.
-   En producción, los logs de errores no deben incluir el `stack trace` completo, a menos que se envíen a un sistema de logging seguro con acceso restringido (ej. Google Cloud's operations suite).
-   **SÍ registrar** eventos de seguridad relevantes, como intentos de acceso fallidos, operaciones de eliminación o cambios de permisos.
-   **SÍ registrar** identificadores de recursos (`client_id`, `account_id`, `transaction_id`) para trazabilidad sin exponer PII.
-   **Excepción:** Los registros de auditoría en la colección `auditLogs` de Firestore SÍ pueden incluir PII en los campos `changes.before` y `changes.after`, pero estos registros deben tener permisos de acceso extremadamente restrictivos.

## 10. Gestión de Dependencias de Terceros

Para mitigar los riesgos de seguridad provenientes de paquetes `npm`:

-   **Auditoría de Vulnerabilidades:** Es obligatorio integrar una herramienta de escaneo de vulnerabilidades en el pipeline de CI/CD.
-   **Herramientas:** Utilizar `npm audit --audit-level=high` o una herramienta externa como **Snyk**.
-   **Política:** El build (la construcción del software) debe fallar si se detectan vulnerabilidades de severidad `high` o `critical` que no hayan sido resueltas o explícitamente ignoradas con justificación.

## 11. Sistema de Auditoría

El sistema de auditoría es crítico para garantizar la trazabilidad de todas las operaciones que afectan datos sensibles del negocio.

### 11.1. Principios de Auditoría

-   **Completitud:** Todas las operaciones de escritura (crear, actualizar, eliminar) deben generar un registro de auditoría.
-   **Inmutabilidad:** Los registros de auditoría no pueden ser modificados ni eliminados una vez creados.
-   **Atomicidad:** Para operaciones financieras (crédito/débito), el registro de auditoría debe crearse dentro de la misma transacción de Firestore.
-   **Trazabilidad:** Cada registro debe identificar claramente quién realizó la acción, cuándo y qué cambios se realizaron.

### 11.2. Datos a Incluir en Auditoría

**Obligatorios:**
-   `action`: Tipo de acción (CLIENT_CREATED, POINTS_CREDITED, etc.)
-   `resource_type`: Tipo de recurso afectado
-   `resource_id`: ID del recurso afectado
-   `actor.uid`: ID del usuario que realizó la acción
-   `timestamp`: Momento exacto de la operación

**Recomendados (cuando estén disponibles):**
-   `actor.email`: Email del actor
-   `changes.before`: Estado anterior del recurso
-   `changes.after`: Estado posterior del recurso
-   `metadata.ip_address`: IP del cliente
-   `metadata.user_agent`: User agent del cliente
-   `metadata.description`: Descripción de la operación

### 11.3. Implementación

> **Nota sobre resourceId vs clientId:**
> - `resourceId` siempre contiene el ID del recurso principal afectado por la operación
> - `clientId`, `accountId`, `groupId`, `transactionId` son campos de referencia que facilitan las consultas y filtros
> - Para operaciones sobre clientes, `resourceId` y `clientId` tendrán el mismo valor
> - Para operaciones sobre transacciones, `resourceId` será el ID de la transacción, pero `clientId` y `accountId` permitirán buscar todos los registros de un cliente/cuenta

```typescript
// Para operaciones no financieras (después de la operación principal)
await auditService.createAuditLog({
  action: 'CLIENT_CREATED',
  resourceType: 'client',
  resourceId: clientId,  // ID del recurso creado
  clientId: clientId,    // Referencia para búsquedas por cliente
  actor: { uid: req.user.uid, email: req.user.email },
  changes: { after: clientData },
  metadata: { ip_address: req.ip, user_agent: req.get('User-Agent') }
});

// Para operaciones financieras (DENTRO de la transacción)
await db.runTransaction(async (transaction) => {
  // ... actualizar balance ...
  
  // CRÍTICO: Crear auditoría en la misma transacción
  auditService.createAuditLogInTransaction(transaction, {
    action: 'POINTS_CREDITED',
    resourceType: 'transaction',
    resourceId: transactionId,
    clientId,
    accountId,
    transactionId,
    actor: { uid: req.user.uid, email: req.user.email },
    changes: { before: { points: oldBalance }, after: { points: newBalance } },
    metadata: { description: data.description }
  });
});
```

### 11.4. Política de Retención

-   Los registros de auditoría deben conservarse por un mínimo de **5 años**.
-   Después del período de retención activa, los registros pueden archivarse a BigQuery para análisis histórico.
-   La eliminación de registros archivados debe seguir las políticas de cumplimiento regulatorio aplicables.
