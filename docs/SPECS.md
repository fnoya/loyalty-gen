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
    -   **Descripción:** Crea un nuevo cliente. Requiere al menos uno de los identificadores: email o documento de identidad.
    -   **Request Body:**
        -   `name: object` (obligatorio)
            -   `firstName: string` (obligatorio, 1-50 caracteres, solo letras, espacios, guiones, apóstrofes)
            -   `secondName: string` (opcional, máximo 50 caracteres)
            -   `firstLastName: string` (obligatorio, 1-50 caracteres, solo letras, espacios, guiones, apóstrofes)
            -   `secondLastName: string` (opcional, máximo 50 caracteres)
        -   `email: string` (opcional, debe ser único si se proporciona)
        -   `identity_document: object` (opcional, debe ser único si se proporciona)
            -   `type: string` (obligatorio si identity_document está presente, valores: "cedula_identidad", "pasaporte")
            -   `number: string` (obligatorio si identity_document está presente, alfanumérico)
        -   `phones: array` (opcional, puede estar vacío)
            -   `type: string` (valores: "mobile", "home", "work", "other")
            -   `number: string` (formato E.164 preferido, ej: "+598 99 123 456")
            -   `extension: string` (opcional, solo dígitos, máximo 10 caracteres)
            -   `isPrimary: boolean` (solo uno puede ser true)
        -   `addresses: array` (opcional, puede estar vacío)
            -   `type: string` (valores: "home", "work", "other")
            -   `street: string` (obligatorio, máximo 100 caracteres)
            -   `buildingBlock: string` (opcional, máximo 50 caracteres)
            -   `number: string` (obligatorio, máximo 20 caracteres)
            -   `apartment: string` (opcional, máximo 20 caracteres)
            -   `locality: string` (obligatorio, máximo 100 caracteres)
            -   `state: string` (obligatorio, máximo 100 caracteres)
            -   `postalCode: string` (obligatorio, máximo 20 caracteres)
            -   `country: string` (obligatorio, código ISO 3166-1 alpha-2, ej: "UY", "AR")
            -   `isPrimary: boolean` (solo una puede ser true)
        -   `extra_data: object` (opcional)
    -   **Validación:** 
        -   Al menos uno de `email` o `identity_document` debe estar presente.
        -   Solo un teléfono puede tener `isPrimary: true`.
        -   Solo una dirección puede tener `isPrimary: true`.
        -   Los códigos de país deben validarse contra ISO 3166-1 alpha-2.
    -   **Respuesta Exitosa (201 Created):** Devuelve el objeto del cliente creado.
    -   **Respuesta de Error (400 Bad Request):** Si no se proporciona ningún identificador (ni email ni documento de identidad), o si las validaciones de formato fallan.
    -   **Respuesta de Error (409 Conflict):** Si el email o el documento de identidad ya existe.
    -   **🔍 Auditoría:** Debe crear un registro de auditoría con `action: CLIENT_CREATED`, incluyendo los datos del cliente creado en `changes.after`.

-   **`GET /clients`**
    -   **Descripción:** Lista los clientes usando paginación basada en cursor para un rendimiento óptimo.
    -   **Query Params:** `limit: int = 30`, `next_cursor: Optional[str] = None`.
    -   **Respuesta Exitosa (200 OK):** Devuelve un objeto con la lista de clientes y el cursor para la siguiente página, acorde a la estructura definida en `API-DESIGN.md`.

-   **`GET /clients/{client_id}`**
    -   **Descripción:** Obtiene un cliente por su ID.
    -   **Respuesta Exitosa (200 OK):** Devuelve el objeto del cliente completo, incluyendo todos los campos de nombre, teléfonos y direcciones.
    -   **Respuesta de Error (404 Not Found):** Si el cliente no existe.

-   **`PUT /clients/{client_id}`**
    -   **Descripción:** Actualiza los datos de un cliente. No se permite modificar el email ni el documento de identidad una vez creados.
    -   **Request Body:**
        -   `name: object` (opcional, si se proporciona, puede incluir cualquier combinación de campos)
            -   `firstName: string` (opcional)
            -   `secondName: string` (opcional)
            -   `firstLastName: string` (opcional)
            -   `secondLastName: string` (opcional)
        -   `phones: array` (opcional, reemplaza la lista completa de teléfonos)
        -   `addresses: array` (opcional, reemplaza la lista completa de direcciones)
        -   `extra_data: object` (opcional)
    -   **Validación:**
        -   Si se proporciona `phones`, validar que solo uno tenga `isPrimary: true`.
        -   Si se proporciona `addresses`, validar que solo una tenga `isPrimary: true`.
    -   **Respuesta Exitosa (200 OK):** Devuelve el objeto del cliente actualizado.
    -   **🔍 Auditoría:** Debe crear un registro de auditoría con `action: CLIENT_UPDATED`, incluyendo el estado anterior en `changes.before` y el estado posterior en `changes.after`.

-   **`DELETE /clients/{client_id}`**
    -   **Descripción:** Inicia el proceso de eliminación asíncrona de un cliente y todos sus datos asociados.
    -   **Respuesta Exitosa (202 Accepted):** `{"message": "El proceso de eliminación del cliente ha comenzado."}`.
    -   **Respuesta de Error (404 Not Found):** Si el cliente no existe.
    -   **🔍 Auditoría:** Debe crear un registro de auditoría con `action: CLIENT_DELETED`, incluyendo los datos del cliente eliminado en `changes.before`.

### Módulo de Grupos (`/groups`)

-   **`POST /groups`**
    -   **Descripción:** Crea un nuevo grupo de afinidad.
    -   **Respuesta Exitosa (201 Created):** Devuelve el objeto del grupo creado.
    -   **🔍 Auditoría:** Debe crear un registro de auditoría con `action: GROUP_CREATED`, incluyendo los datos del grupo creado en `changes.after`.

-   **`GET /groups`**
    -   **Descripción:** Lista todos los grupos.
    -   **Respuesta Exitosa (200 OK):** Devuelve un array con todos los grupos.

-   **`POST /groups/{group_id}/clients/{client_id}`**
    -   **Descripción:** Asigna un cliente a un grupo.
    -   **Respuesta Exitosa (200 OK):** `{"message": "Client added to group"}`.
    -   **🔍 Auditoría:** Debe crear un registro de auditoría con `action: CLIENT_ADDED_TO_GROUP`, vinculando tanto el `client_id` como el `group_id` en el registro.

-   **`DELETE /groups/{group_id}/clients/{client_id}`**
    -   **Descripción:** Desasigna un cliente de un grupo.
    -   **Respuesta Exitosa (200 OK):** `{"message": "Client removed from group"}`.
    -   **🔍 Auditoría:** Debe crear un registro de auditoría con `action: CLIENT_REMOVED_FROM_GROUP`, vinculando tanto el `client_id` como el `group_id` en el registro.

### Módulo de Círculos de Afinidad Familiares (`/family-circle`)

-   **`POST /clients/{client_id}/family-circle/members`**
    -   **Descripción:** Añade un cliente como miembro del círculo de afinidad familiar del titular especificado.
    -   **Request Body:**
        ```json
        {
          "memberId": "client-id-123",
          "relationshipType": "child"
        }
        ```
        -   `memberId: string` (obligatorio) - ID del cliente a añadir como miembro
        -   `relationshipType: string` (obligatorio) - Tipo de relación: "spouse", "child", "parent", "sibling", "friend", "other"
    -   **Validaciones:**
        -   El cliente titular debe existir y no ser miembro de otro círculo
        -   El miembro debe existir y no estar en otro círculo
        -   El miembro no puede ser el mismo que el titular
        -   Solo el titular autenticado puede añadir miembros a su círculo
    -   **Respuesta Exitosa (200 OK):** `{"message": "Member added to family circle successfully", "member": {...}}`.
    -   **Respuesta de Error (409 Conflict):** Si el cliente ya es miembro de otro círculo (`MEMBER_ALREADY_IN_CIRCLE`).
    -   **Respuesta de Error (400 Bad Request):** Si se intenta añadir al mismo titular (`CANNOT_ADD_SELF`).
    -   **Respuesta de Error (403 Forbidden):** Si el usuario no es el titular (`NOT_CIRCLE_HOLDER`).
    -   **🔍 Auditoría:** Debe crear un registro de auditoría con `action: FAMILY_CIRCLE_MEMBER_ADDED` dentro de la misma transacción atómica.

-   **`DELETE /clients/{client_id}/family-circle/members/{member_id}`**
    -   **Descripción:** Remueve un miembro del círculo de afinidad familiar del titular.
    -   **Validaciones:**
        -   El cliente debe ser efectivamente miembro del círculo del titular
        -   Solo el titular autenticado puede remover miembros
    -   **Respuesta Exitosa (200 OK):** `{"message": "Member removed from family circle successfully"}`.
    -   **Respuesta de Error (404 Not Found):** Si el miembro no está en el círculo (`MEMBER_NOT_IN_CIRCLE`).
    -   **🔍 Auditoría:** Debe crear un registro de auditoría con `action: FAMILY_CIRCLE_MEMBER_REMOVED` dentro de la misma transacción atómica.

-   **`GET /clients/{client_id}/family-circle`**
    -   **Descripción:** Obtiene información sobre el círculo de afinidad del cliente (como titular o como miembro).
    -   **Respuesta Exitosa (200 OK) - Titular:** 
        ```json
        {
          "role": "holder",
          "members": [...],
          "totalMembers": 2
        }
        ```
    -   **Respuesta Exitosa (200 OK) - Miembro:**
        ```json
        {
          "role": "member",
          "holderId": "client-id-100",
          "relationshipType": "child",
          "joinedAt": "2025-12-08T12:00:00.000Z"
        }
        ```
    -   **Respuesta Exitosa (200 OK) - Sin círculo:**
        ```json
        {
          "role": null,
          "message": "Client is not part of any family circle"
        }
        ```

-   **`GET /clients/{client_id}/family-circle/members`**
    -   **Descripción:** Lista todos los miembros del círculo de afinidad del titular.
    -   **Validaciones:** Solo el titular puede listar sus miembros.
    -   **Respuesta Exitosa (200 OK):** Devuelve un array con los miembros y su información básica.

-   **`PATCH /clients/{client_id}/accounts/{account_id}/family-circle-config`**
    -   **Descripción:** Actualiza la configuración de permisos de círculo familiar para una cuenta específica.
    -   **Request Body:**
        ```json
        {
          "allowMemberCredits": true,
          "allowMemberDebits": false
        }
        ```
        -   `allowMemberCredits: boolean` (opcional) - Permite que miembros del círculo generen créditos
        -   `allowMemberDebits: boolean` (opcional) - Permite que miembros del círculo generen débitos
        -   **Nota:** Al menos uno de los campos debe estar presente
    -   **Validaciones:** Solo el titular de la cuenta puede modificar la configuración.
    -   **Respuesta Exitosa (200 OK):** `{"message": "Family circle configuration updated successfully", "config": {...}}`.
    -   **🔍 Auditoría:** Debe crear un registro de auditoría con `action: LOYALTY_ACCOUNT_FAMILY_CONFIG_UPDATED`.

-   **`GET /clients/{client_id}/accounts/{account_id}/family-circle-config`**
    -   **Descripción:** Obtiene la configuración actual de permisos de círculo familiar para una cuenta.
    -   **Respuesta Exitosa (200 OK):** Devuelve la configuración actual o valores por defecto si no está configurada.

**Modificaciones a endpoints existentes:**

-   **`POST /clients/{client_id}/accounts/{account_id}/credit`**
    -   **Query Parameter adicional:** `on_behalf_of` (opcional) - ID del cliente miembro que origina la transacción.
    -   **Comportamiento:** Si se proporciona `on_behalf_of`, el sistema valida que el cliente sea miembro del círculo del titular y que `allowMemberCredits = true` en la cuenta. La transacción se registra con el campo `originatedBy` indicando el miembro originador.
    -   **Respuesta de Error (403 Forbidden):** Si `allowMemberCredits = false` (`CIRCLE_CREDITS_NOT_ALLOWED`).
    -   **🔍 Auditoría:** Debe usar `action: POINTS_CREDITED_BY_CIRCLE_MEMBER` si la transacción es originada por un miembro.

-   **`POST /clients/{client_id}/accounts/{account_id}/debit`**
    -   **Query Parameter adicional:** `on_behalf_of` (opcional) - ID del cliente miembro que origina la transacción.
    -   **Comportamiento:** Similar a crédito, pero valida `allowMemberDebits = true`.
    -   **Respuesta de Error (403 Forbidden):** Si `allowMemberDebits = false` (`CIRCLE_DEBITS_NOT_ALLOWED`).
    -   **🔍 Auditoría:** Debe usar `action: POINTS_DEBITED_BY_CIRCLE_MEMBER` si la transacción es originada por un miembro.

-   **`GET /clients/{client_id}/accounts/{account_id}/transactions`**
    -   **Query Parameter adicional:** `originated_by` (opcional) - Filtrar por ID del cliente que originó las transacciones.
    -   **Query Parameter adicional:** `circle_members_only` (opcional, boolean) - Si es `true`, solo devuelve transacciones originadas por miembros del círculo.
    -   **Comportamiento:** Las transacciones incluyen el campo `originatedBy` si fueron originadas por un miembro del círculo.

### Módulo de Cuentas de Lealtad (`/accounts`)

-   **`POST /clients/{client_id}/accounts`**
    -   **Descripción:** Crea una nueva cuenta de lealtad para un cliente.
    -   **Respuesta Exitosa (201 Created):** Devuelve el objeto de la cuenta creada.
    -   **🔍 Auditoría:** Debe crear un registro de auditoría con `action: ACCOUNT_CREATED`, vinculando el `client_id` y el `account_id` en el registro.

-   **`GET /clients/{client_id}/accounts`**
    -   **Descripción:** Lista todas las cuentas de un cliente.
    -   **Respuesta Exitosa (200 OK):** Devuelve un array con las cuentas.

-   **`POST /clients/{client_id}/accounts/{account_id}/credit`**
    -   **Descripción:** Acredita puntos a una cuenta.
    -   **Request Body:** `{"amount": 100, "description": "Bono de bienvenida"}`.
    -   **Respuesta Exitosa (200 OK):** Devuelve el objeto de la cuenta actualizado.
    -   **🔍 Auditoría:** **CRÍTICO** - Debe crear un registro de auditoría con `action: POINTS_CREDITED` dentro de la misma transacción atómica de Firestore. El registro debe incluir `client_id`, `account_id`, `transaction_id`, el monto acreditado y el balance resultante.

-   **`POST /clients/{client_id}/accounts/{account_id}/debit`**
    -   **Descripción:** Debita puntos de una cuenta.
    -   **Request Body:** `{"amount": 50, "description": "Canje de producto"}`.
    -   **Respuesta Exitosa (200 OK):** Devuelve el objeto de la cuenta actualizado.
    -   **Respuesta de Error (400 Bad Request):** Si el balance es insuficiente.
    -   **🔍 Auditoría:** **CRÍTICO** - Debe crear un registro de auditoría con `action: POINTS_DEBITED` dentro de la misma transacción atómica de Firestore. El registro debe incluir `client_id`, `account_id`, `transaction_id`, el monto debitado y el balance resultante.

-   **`GET /clients/{client_id}/accounts/{account_id}/transactions`**
    -   **Descripción:** Lista el historial de transacciones de una cuenta con paginación basada en cursor.
    -   **Query Params:** `limit: int = 100`, `next_cursor: Optional[str] = None`.
    -   **Respuesta Exitosa (200 OK):** Devuelve un objeto paginado con las transacciones.

### Módulo de Auditoría (`/audit-logs`)

-   **`GET /audit-logs`**
    -   **Descripción:** Lista registros de auditoría con filtros opcionales.
    -   **Query Params:** `limit: int = 50`, `next_cursor: Optional[str] = None`, `client_id: Optional[str]`, `account_id: Optional[str]`, `action: Optional[AuditAction]`, `from_date: Optional[datetime]`, `to_date: Optional[datetime]`.
    -   **Respuesta Exitosa (200 OK):** Devuelve un objeto paginado con los registros de auditoría.

-   **`GET /audit-logs/{audit_log_id}`**
    -   **Descripción:** Obtiene un registro de auditoría por su ID.
    -   **Respuesta Exitosa (200 OK):** Devuelve el objeto del registro de auditoría con todos los detalles.
    -   **Respuesta de Error (404 Not Found):** Si el registro no existe.

-   **`GET /clients/{client_id}/audit-logs`**
    -   **Descripción:** Lista todos los registros de auditoría relacionados con un cliente específico.
    -   **Query Params:** `limit: int = 50`, `next_cursor: Optional[str] = None`, `action: Optional[AuditAction]`.
    -   **Respuesta Exitosa (200 OK):** Devuelve un objeto paginado con los registros de auditoría del cliente.
    -   **Respuesta de Error (404 Not Found):** Si el cliente no existe.

-   **`GET /clients/{client_id}/accounts/{account_id}/audit-logs`**
    -   **Descripción:** Lista todos los registros de auditoría relacionados con una cuenta de lealtad.
    -   **Query Params:** `limit: int = 50`, `next_cursor: Optional[str] = None`, `action: Optional[AuditAction]`.
    -   **Respuesta Exitosa (200 OK):** Devuelve un objeto paginado con los registros de auditoría de la cuenta.
    -   **Respuesta de Error (404 Not Found):** Si el cliente o la cuenta no existe.

-   **`GET /clients/{client_id}/accounts/{account_id}/transactions/{transaction_id}/audit-logs`**
    -   **Descripción:** Obtiene el registro de auditoría asociado a una transacción específica.
    -   **Respuesta Exitosa (200 OK):** Devuelve el registro de auditoría de la transacción.
    -   **Respuesta de Error (404 Not Found):** Si la transacción o el registro de auditoría no existe.

---

## 2. Requisitos No Funcionales

### a. Seguridad

-   **Autenticación:** Toda la API (excepto la documentación) debe estar protegida y requerir un ID Token de Firebase Authentication válido.
-   **Autorización a Nivel de Base de Datos:** Las **Reglas de Seguridad de Firestore** son la primera línea de defensa. Deben implementarse para asegurar que un usuario solo pueda acceder y modificar sus propios datos.
-   **Autorización a Nivel de Servicio (Defensa en Profundidad):** Para operaciones críticas (ej. crear transacciones), la lógica de servicio (`*.service.ts`) debe realizar una verificación adicional para confirmar que el `uid` del usuario autenticado corresponde al propietario del recurso que se está intentando modificar.
-   **Validación en Base de Datos:** Las Reglas de Seguridad de Firestore también deben usarse para validar el schema y el contenido de los datos en el servidor, rechazando escrituras malformadas como una capa de seguridad adicional a la validación de Zod en la API.
-   **Límites de Tasa (Rate Limiting):** La API debe implementar un límite de tasa (ej. 100 peticiones por minuto por cliente/IP) para prevenir abusos y ataques de denegación de servicio. Un middleware en Express se encargará de esta lógica.

#### Protección de Información Personal Identificable (PII)

Los campos del modelo de Cliente contienen **Información Personal Identificable (PII)** que debe protegerse con las máximas medidas de seguridad:

-   **Campos PII Sensibles:**
    -   `name` (nombre completo estructurado)
    -   `email`
    -   `identity_document`
    -   `phones` (números telefónicos)
    -   `addresses` (direcciones físicas completas)
    -   `extra_data` (puede contener información sensible según el caso de uso)

-   **Política de Logging:**
    -   **PROHIBIDO:** Registrar en logs de aplicación: `email`, `name`, `identity_document`, `phones`, `addresses`, o cualquier campo de `extra_data`.
    -   **PERMITIDO:** Registrar solo los IDs de recursos (`client_id`, `account_id`), códigos de error, y eventos de seguridad.
    -   **Excepciones:** Los registros de auditoría en la colección `auditLogs` de Firestore **SÍ** deben incluir estos datos en `changes.before` y `changes.after`, pero con permisos de acceso extremadamente restrictivos.

-   **Validación y Sanitización:**
    -   Todos los campos de entrada deben validarse contra patrones seguros usando Zod para prevenir inyección de código.
    -   Los números telefónicos deben validarse contra el formato E.164.
    -   Los códigos de país deben validarse contra la lista oficial ISO 3166-1 alpha-2.
    -   Las expresiones regulares para validar nombres deben permitir solo caracteres alfabéticos, espacios, guiones y apóstrofes.

-   **Almacenamiento Seguro:**
    -   Todos los datos PII deben almacenarse en Firestore con reglas de seguridad restrictivas.
    -   Solo usuarios autenticados y autorizados pueden acceder a datos PII.
    -   Considerar encriptación adicional a nivel de aplicación para campos extremadamente sensibles en futuras versiones.

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
