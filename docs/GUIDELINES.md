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

## 4. Estructura de la Lógica de Negocio

-   **Rutas/Controladores (`app/api/routes/`):** Deben ser "delgados". Su única responsabilidad es validar la entrada (vía middleware), llamar al servicio apropiado y manejar la respuesta HTTP. No deben contener lógica de negocio.
-   **Servicios (`app/services/`):** Deben contener toda la lógica de negocio y de dominio. Interactúan con Firestore y orquestan las operaciones.

## 5. Pruebas (Testing)

-   **Framework:** Utilizar **`Jest`**.
-   **Tipos de Pruebas:** Se deben escribir pruebas unitarias para los servicios (usando mocks) y pruebas de integración para las Cloud Functions (usando `firebase-functions-test` y el emulador).
-   **Cobertura:** La cobertura de código debe ser superior al 80%.

## 6. Manejo de Desnormalización de Datos

-   **Regla de Oro - Atomicidad:** Es **crítico** mantener la consistencia de los datos desnormalizados. Cualquier operación que modifique la fuente de verdad (ej. `points` en `loyaltyAccount`) **debe** actualizar el dato desnormalizado (ej. `account_balances` en `client`) dentro de la **misma transacción atómica de Firestore**.

## 7. Gestión de la Configuración y Secretos

-   **Variables de Entorno de Firebase:** Los secretos (claves de API, etc.) y la configuración específica del entorno deben gestionarse a través de las variables de entorno de las funciones de Firebase (`functions.config()`).
-   **NO hardcodear:** Ningún secreto debe estar presente en el código fuente.

## 8. Mensajes de Commit

-   **Estilo:** Seguir estrictamente la especificación de **Conventional Commits**.

## 9. Política de Logging Seguro

Para prevenir la fuga de información sensible, se establecen las siguientes reglas de logging:

-   **NO registrar** Información Personal Identificable (PII) de los clientes, como `email`, `name`, o contenido de `extra_data`.
-   **NO registrar** información sensible de autenticación, como tokens, encabezados `Authorization` o claves de API.
-   En producción, los logs de errores no deben incluir el `stack trace` completo, a menos que se envíen a un sistema de logging seguro con acceso restringido (ej. Google Cloud's operations suite).
-   **SÍ registrar** eventos de seguridad relevantes, como intentos de acceso fallidos, operaciones de eliminación o cambios de permisos.

## 10. Gestión de Dependencias de Terceros

Para mitigar los riesgos de seguridad provenientes de paquetes `npm`:

-   **Auditoría de Vulnerabilidades:** Es obligatorio integrar una herramienta de escaneo de vulnerabilidades en el pipeline de CI/CD.
-   **Herramientas:** Utilizar `npm audit --audit-level=high` o una herramienta externa como **Snyk**.
-   **Política:** El build (la construcción del software) debe fallar si se detectan vulnerabilidades de severidad `high` o `critical` que no hayan sido resueltas o explícitamente ignoradas con justificación.
