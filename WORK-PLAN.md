# WORK-PLAN.md - Plan de Trabajo para el MVP de LoyaltyGen

Este documento desglosa el trabajo necesario para implementar la primera versión (MVP) de la plataforma LoyaltyGen. Está dividido en Épicas y Tareas, con instrucciones específicas para cada una, diseñadas para ser ejecutadas por agentes de IA.

---

## Épica 1: Configuración del Proyecto y Core del Backend

**Objetivo:** Establecer la estructura base del backend, incluyendo la configuración del proyecto, dependencias y los middlewares esenciales para la operativa de la API.

### Tarea 1.1: Andamiaje del Proyecto Backend
-   **Instrucción para el agente:**
    1.  Crea un nuevo directorio `functions/` si no existe.
    2.  Dentro de `functions/`, inicializa un proyecto de Node.js (`npm init -y`) y crea la estructura de directorios (`src/api/routes`, `src/api/middleware`, `src/core`, `src/services`, `src/schemas`) como se define en el diagrama de `docs/ARCHITECTURE.md`.
    3.  Instala las dependencias de producción: `express`, `firebase-admin`, `firebase-functions`, `zod`, `cors`.
    4.  Instala las dependencias de desarrollo: `typescript`, `@types/node`, `@types/express`, `ts-node`, `eslint`, `prettier` y las configuraciones relevantes.
    5.  Crea un archivo `tsconfig.json` que active el modo `strict` y configure la salida de compilación al directorio `lib/`.
    6.  En `functions/src/index.ts`, configura la aplicación de Express, añade el middleware de `cors` y exporta la app como una Cloud Function de tipo `onRequest` llamada `api`.

### Tarea 1.2: Implementación de Middlewares Esenciales
-   **Instrucción para el agente:**
    1.  Crea el archivo `src/api/middleware/auth.middleware.ts`.
    2.  Implementa una función de middleware que verifique el token JWT proporcionado en el encabezado `Authorization: Bearer <token>` utilizando el `firebase-admin.auth()`.
    3.  Si el token es válido, decodifícalo y adjunta los datos del usuario (ej. `uid`) al objeto `request`. Si es inválido, responde con un error `401 Unauthorized` usando el formato de `openapi.yaml`.
    4.  Crea un middleware de manejo de errores global que capture excepciones y las formatee según el schema `Error` definido en `openapi.yaml`.

---

## Épica 2: Implementación de la API (Dominios)

**Objetivo:** Desarrollar todos los endpoints de la API definidos en el contrato de OpenAPI.

### Tarea 2.1: Endpoints del Dominio "Clients"
-   **Instrucción para el agente:**
    1.  Crea los schemas de Zod para las peticiones de cliente en `src/schemas/client.schema.ts`.
    2.  Crea el archivo de rutas `src/api/routes/client.routes.ts`.
    3.  Implementa todos los endpoints del recurso `/clients` (`GET`, `POST`, `PUT`, `DELETE`) según las especificaciones de `openapi.yaml`.
    4.  La lógica de negocio para interactuar con Firestore debe residir en un nuevo archivo `src/services/client.service.ts`.
    5.  Para el endpoint de búsqueda `GET /clients`, implementa un filtro básico que utilice consultas `startsWith` de Firestore, como se describe en la estrategia MVP de `ARCHITECTURE.md`.

### Tarea 2.2: Endpoints de los Dominios "Groups" y "Accounts"
-   **Instrucción para el agente:**
    1.  Siguiendo el mismo patrón que la Tarea 2.1, implementa todos los endpoints para los dominios de Grupos y Cuentas de Lealtad, como se definen en `openapi.yaml`.
    2.  **Crítico:** Para las operaciones de `credit` y `debit`, la implementación en el servicio **debe** utilizar transacciones de Firestore para actualizar atómicamente tanto el documento de la cuenta como el mapa desnormalizado `account_balances` en el documento del cliente. Esta es una regla mandatoria de `docs/GUIDELINES.md`.

---

## Épica 3: Configuración y Desarrollo del Frontend (MVP)

**Objetivo:** Construir la interfaz de usuario principal para la gestión de clientes, permitiendo a un administrador realizar las operaciones más críticas.

### Tarea 3.1: Andamiaje del Proyecto Frontend
-   **Instrucción para el agente:**
    1.  En el directorio raíz del proyecto (fuera de `functions/`), inicializa una nueva aplicación Next.js (v14+ con App Router) usando TypeScript y Tailwind CSS.
    2.  Sigue la guía en `docs/UI-UX-GUIDELINES.md` para instalar y configurar `shadcn/ui`.
    3.  Configura la fuente "Inter" y los colores primarios de la marca en `tailwind.config.js`.

### Tarea 3.2: Implementación del Layout y Listado de Clientes
-   **Instrucción para el agente:**
    1.  Implementa el layout principal de la aplicación, que debe incluir un menú lateral de navegación colapsable.
    2.  Desarrolla la página de listado de clientes para que cumpla los Criterios de Aceptación de las historias de usuario **HU1** y **HU7** (`docs/USER-STORIES.md`).
    3.  La página debe mostrar una tabla de clientes, gestionar los estados de carga con `Skeletons`, mostrar el estado vacío si no hay datos, e incluir una barra de búsqueda funcional.

### Tarea 3.3: Implementación del Flujo CRUD de Clientes
-   **Instrucción para el agente:**
    1.  Desarrolla el formulario y la página para la creación de un nuevo cliente, cumpliendo con la **HU2**.
    2.  Desarrolla la página de detalle del cliente, cumpliendo con la **HU4** (enfocándose en mostrar la información del cliente, el resto se puede añadir en tareas futuras).
    3.  Implementa el flujo de eliminación, asegurándote de que el `AlertDialog` de confirmación se utilice como se exige en la **HU3**.

---

## Épica 4: Calidad y Pruebas

**Objetivo:** Asegurar que la implementación es robusta, correcta y cumple con los estándares de calidad definidos.

### Tarea 4.1: Suite de Pruebas de la API
-   **Instrucción para el agente:**
    1.  Configura `Jest` y `firebase-functions-test` en el proyecto de `functions/`.
    2.  Escribe pruebas de integración para todos los endpoints de la API.
    3.  Las pruebas deben validar tanto los casos de éxito como los de error definidos en `openapi.yaml`.
    4.  El objetivo es alcanzar una cobertura de código superior al 80%, como se indica en `docs/GUIDELINES.md`.
