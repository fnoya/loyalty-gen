# SPECS.md - Especificaciones Funcionales y No Funcionales

Este documento define el contrato de la API y los requisitos operativos del sistema. Todas las implementaciones deben adherirse estrictamente a estas especificaciones.

---

## 1. Requisitos Funcionales (Endpoints de la API)

El diseño y comportamiento de los endpoints deben seguir las convenciones establecidas en `API-DESIGN.md`.

### Módulo de Autenticación
-   **Autenticación de Clientes:** Se realiza a través de los SDK de cliente de **Firebase Authentication** para obtener un **ID Token (JWT)**.
-   **Validación en Backend:** Todas las peticiones protegidas deben incluir el ID Token en el encabezado `Authorization: Bearer <token>`. Un middleware en Express (`auth.middleware.ts`) verificará su validez usando el Admin SDK de Firebase.

### Módulo de Clientes (`/clients`)

-   **`POST /clients`**
    -   **Descripción:** Crea un nuevo cliente.
    -   **Respuesta Exitosa (201 Created):** Devuelve el objeto del cliente creado.
    -   **Respuesta de Error (409 Conflict):** Si el email ya existe.

-   **`GET /clients`**
    -   **Descripción:** Lista los clientes usando paginación basada en cursor para un rendimiento óptimo.
    -   **Query Params:** `limit: int = 30`, `next_cursor: Optional[str] = None`.
    -   **Respuesta Exitosa (200 OK):** Devuelve un objeto con la lista de clientes y el cursor para la siguiente página, acorde a la estructura definida en `API-DESIGN.md`.

-   **`GET /clients/{client_id}`**
    -   **Descripción:** Obtiene un cliente por su ID.
    -   **Respuesta Exitosa (200 OK):** Devuelve el objeto del cliente.
    -   **Respuesta de Error (404 Not Found):** Si el cliente no existe.

-   **`PUT /clients/{client_id}`**
    -   **Descripción:** Actualiza los datos de un cliente.
    -   **Respuesta Exitosa (200 OK):** Devuelve el objeto del cliente actualizado.

-   **`DELETE /clients/{client_id}`**
    -   **Descripción:** Inicia el proceso de eliminación asíncrona de un cliente y todos sus datos asociados.
    -   **Respuesta Exitosa (202 Accepted):** `{"message": "El proceso de eliminación del cliente ha comenzado."}`.
    -   **Respuesta de Error (404 Not Found):** Si el cliente no existe.

### Módulo de Grupos (`/groups`)

-   **`POST /groups`**
    -   **Descripción:** Crea un nuevo grupo de afinidad.
    -   **Respuesta Exitosa (201 Created):** Devuelve el objeto del grupo creado.

-   **`GET /groups`**
    -   **Descripción:** Lista todos los grupos.
    -   **Respuesta Exitosa (200 OK):** Devuelve un array con todos los grupos.

-   **`POST /groups/{group_id}/clients/{client_id}`**
    -   **Descripción:** Asigna un cliente a un grupo.
    -   **Respuesta Exitosa (200 OK):** `{"message": "Client added to group"}`.

-   **`DELETE /groups/{group_id}/clients/{client_id}`**
    -   **Descripción:** Desasigna un cliente de un grupo.
    -   **Respuesta Exitosa (200 OK):** `{"message": "Client removed from group"}`.

### Módulo de Cuentas de Lealtad (`/accounts`)

-   **`POST /clients/{client_id}/accounts`**
    -   **Descripción:** Crea una nueva cuenta de lealtad para un cliente.
    -   **Respuesta Exitosa (201 Created):** Devuelve el objeto de la cuenta creada.

-   **`GET /clients/{client_id}/accounts`**
    -   **Descripción:** Lista todas las cuentas de un cliente.
    -   **Respuesta Exitosa (200 OK):** Devuelve un array con las cuentas.

-   **`POST /clients/{client_id}/accounts/{account_id}/credit`**
    -   **Descripción:** Acredita puntos a una cuenta.
    -   **Request Body:** `{"amount": 100, "description": "Bono de bienvenida"}`.
    -   **Respuesta Exitosa (200 OK):** Devuelve el objeto de la cuenta actualizado.

-   **`POST /clients/{client_id}/accounts/{account_id}/debit`**
    -   **Descripción:** Debita puntos de una cuenta.
    -   **Request Body:** `{"amount": 50, "description": "Canje de producto"}`.
    -   **Respuesta Exitosa (200 OK):** Devuelve el objeto de la cuenta actualizado.
    -   **Respuesta de Error (400 Bad Request):** Si el balance es insuficiente.

-   **`GET /clients/{client_id}/accounts/{account_id}/transactions`**
    -   **Descripción:** Lista el historial de transacciones de una cuenta con paginación basada en cursor.
    -   **Query Params:** `limit: int = 100`, `next_cursor: Optional[str] = None`.
    -   **Respuesta Exitosa (200 OK):** Devuelve un objeto paginado con las transacciones.

---

## 2. Requisitos No Funcionales

### a. Seguridad

-   **Autenticación:** Toda la API (excepto la documentación) debe estar protegida y requerir un ID Token de Firebase Authentication válido.
-   **Autorización a Nivel de Base de Datos:** Las **Reglas de Seguridad de Firestore** son la primera línea de defensa. Deben implementarse para asegurar que un usuario solo pueda acceder y modificar sus propios datos.
-   **Autorización a Nivel de Servicio (Defensa en Profundidad):** Para operaciones críticas (ej. crear transacciones), la lógica de servicio (`*.service.ts`) debe realizar una verificación adicional para confirmar que el `uid` del usuario autenticado corresponde al propietario del recurso que se está intentando modificar.
-   **Validación en Base de Datos:** Las Reglas de Seguridad de Firestore también deben usarse para validar el schema y el contenido de los datos en el servidor, rechazando escrituras malformadas como una capa de seguridad adicional a la validación de Zod en la API.
-   **Límites de Tasa (Rate Limiting):** La API debe implementar un límite de tasa (ej. 100 peticiones por minuto por cliente/IP) para prevenir abusos y ataques de denegación de servicio. Un middleware en Express se encargará de esta lógica.

### b. Rendimiento

-   **Latencia de la API:** Las respuestas de la API deben completarse, en condiciones normales, en **menos de 500ms**.
-   **Consultas Eficientes:** Las consultas a Firestore deben ser eficientes, aprovechando la desnormalización y los índices. Se deben evitar escaneos de colecciones.
-   **Mitigación de "Cold Starts":** Para las funciones críticas que deben cumplir la meta de latencia, se debe evaluar y configurar un número mínimo de instancias de Cloud Function (`minInstances`) para mantenerlas "calientes" y reducir el impacto de los arranques en frío.

### c. Documentación

-   **OpenAPI:** El contrato de la API se define en el archivo `openapi.yaml`, que sirve como única fuente de verdad. Este archivo se usará para generar documentación visual e interactiva.

### d. Pruebas (Testing)

-   **Cobertura:** Se requiere una cobertura de pruebas de código de al menos el **80%**.
-   **Frameworks:** Las pruebas se implementarán con **Jest** y la librería **`firebase-functions-test`**, utilizando los emuladores locales de Firebase (Auth, Firestore, Functions).

### e. Escalabilidad

-   **Volumen de Datos:** El sistema debe estar diseñado para soportar un volumen de **millones de clientes y cientos de millones de transacciones**.
-   **Implicaciones Arquitectónicas:** Este requisito de escala prohíbe el uso de consultas que no escalan (como listados sin filtros o agregaciones sobre la base de datos transaccional). Implica el uso de servicios especializados para ciertas tareas, como se detalla en `ARCHITECTURE.md`:
    -   **Búsqueda:** La funcionalidad de búsqueda a gran escala (ej. buscar un cliente por nombre) se delegará a un servicio de búsqueda dedicado como Algolia o Elasticsearch.
    -   **Análisis de Datos:** Las consultas analíticas complejas y agregaciones se realizarán sobre un data warehouse (BigQuery), no sobre la base de datos transaccional en tiempo real (Firestore).
