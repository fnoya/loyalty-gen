# API-DESIGN.md - Guía de Diseño de la API de LoyaltyGen

Este documento establece las convenciones y estándares de diseño que deben seguirse para toda la API de LoyaltyGen. El objetivo es garantizar que la API sea consistente, predecible y fácil de usar para los desarrolladores, en línea con nuestro principio rector de "La Experiencia del Desarrollador (DX) es Clave".

## 1. Versionado

-   **Estrategia:** El versionado se realizará a través de la URL. Todas las rutas de la API estarán prefijadas con la versión mayor.
-   **Formato:** `/api/v1/...`
-   **Justificación:** Este enfoque es explícito y garantiza que las actualizaciones que rompan la compatibilidad no afectarán a las integraciones existentes.

## 2. Convenciones de Nomenclatura

-   **Rutas (Endpoints):**
    -   Usar `kebab-case` (minúsculas y guiones).
    -   Los recursos deben nombrarse en plural.
    -   **Ejemplos:** `/api/v1/clients`, `/api/v1/accounts`

-   **Campos JSON (Request/Response Bodies):**
    -   Usar `camelCase`.
    -   **Ejemplos:** `clientId`, `accountName`, `createdAt`.

-   **Parámetros de Consulta (Query Parameters):**
    -   Usar `snake_case`.
    -   **Ejemplos:** `page_size`, `next_cursor`.

## 3. Autenticación

-   **Método:** Todas las peticiones a endpoints protegidos deben incluir un **ID Token de Firebase (JWT)** válido.
-   **Encabezado:** El token debe ser proporcionado en el encabezado `Authorization` con el esquema `Bearer`.
-   **Formato:** `Authorization: Bearer <ID_TOKEN>`
-   **Respuesta de Error (401 Unauthorized):** Si el token falta, es inválido o ha expirado, la API debe devolver un error 401 con un código claro.

## 4. Formato de Respuestas

### 4.1. Respuestas Exitosas

-   **`200 OK`:** Para peticiones exitosas de tipo `GET` y `PUT`. El cuerpo de la respuesta debe contener el recurso solicitado.
-   **`201 Created`:** Para peticiones `POST` que resultan en la creación de un nuevo recurso. El cuerpo debe contener el recurso recién creado, incluyendo su ID.
-   **`202 Accepted`:** Para peticiones que inician un proceso asíncrono (ej. eliminación en segundo plano). El cuerpo debe contener un mensaje que indique que la tarea ha sido aceptada.
-   **`204 No Content`:** Para peticiones exitosas que no devuelven un cuerpo (aunque se prefiere devolver una confirmación explícita con un `200 OK` y un mensaje simple como `{"status": "success"}`).

### 4.2. Respuestas de Error Estandarizadas

Para garantizar una DX predecible, todas las respuestas de error (`4xx` y `5xx`) deben adherirse al siguiente formato. Esta estructura permite a los clientes manejar los errores de forma programática.

```json
{
  "error": {
    "code": "ERROR_CODE_EN_MAYUSCULAS",
    "message": "Un mensaje descriptivo y claro para el desarrollador."
  }
}
```

-   **`code`:** Un identificador único y legible por máquina para el tipo de error.
-   **`message`:** Una explicación legible por humanos del error que ocurrió.

**Ejemplos de Códigos de Error:**

| Código de Estado | Código de Error Interno | Mensaje de Ejemplo                                           |
| :--------------- | :---------------------- | :----------------------------------------------------------- |
| `400 Bad Request`  | `INSUFFICIENT_BALANCE`  | "El saldo de la cuenta es insuficiente para realizar el débito." |
| `400 Bad Request`  | `VALIDATION_FAILED`     | "El campo 'email' no es un correo electrónico válido."           |
| `400 Bad Request`  | `MISSING_IDENTIFIER`    | "Debe proporcionar al menos un identificador: email o documento de identidad." |
| `400 Bad Request`  | `INVALID_DOCUMENT_TYPE` | "El tipo de documento 'xyz' no es válido. Use 'cedula_identidad' o 'pasaporte'." |
| `401 Unauthorized` | `INVALID_TOKEN`         | "El token de autenticación es inválido o ha expirado."       |
| `403 Forbidden`    | `PERMISSION_DENIED`     | "No tiene permiso para acceder a este recurso."              |
| `404 Not Found`    | `RESOURCE_NOT_FOUND`    | "El cliente con el ID 'xyz' no fue encontrado."              |
| `409 Conflict`     | `EMAIL_ALREADY_EXISTS`  | "El correo electrónico proporcionado ya está en uso."        |
| `409 Conflict`     | `IDENTITY_DOCUMENT_ALREADY_EXISTS` | "El documento de identidad proporcionado ya está registrado." |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | "Ocurrió un error inesperado en el servidor."               |

## 5. Paginación

-   **Método:** Se utilizará paginación basada en cursor para todas las listas de recursos para garantizar un rendimiento escalable con Firestore.
-   **Parámetros de Consulta:**
    -   `limit`: `number` (Opcional, con un valor por defecto y máximo definido, ej. `default: 30, max: 100`).
    -   `next_cursor`: `string` (Opcional. El ID del último documento de la página anterior).
-   **Formato de Respuesta:** La respuesta de una lista paginada debe tener la siguiente estructura:

```json
{
  "data": [
    { "id": "doc1", ... },
    { "id": "doc2", ... }
  ],
  "paging": {
    "next_cursor": "doc2"
  }
}
```

-   `data`: Un array con los documentos de la página actual.
-   `paging.next_cursor`: El cursor a utilizar en la siguiente petición para obtener la página siguiente. Si es `null` o no está presente, significa que no hay más resultados.

## 6. Uso de Verbos HTTP

El uso de los verbos HTTP debe seguir el estándar RESTful.

| Verbo   | Uso                                     |
| :------ | :-------------------------------------- |
| `GET`     | Recuperar recursos. Es una operación segura (no tiene efectos secundarios). |
| `POST`    | Crear un nuevo recurso o ejecutar una acción (ej. `/credit`). |
| `PUT`     | Reemplazar/Actualizar un recurso existente de forma completa. |
| `PATCH`   | Actualizar parcialmente un recurso existente (aunque se prefiere `PUT` para simplicidad en este proyecto). |
| `DELETE`  | Eliminar un recurso.                    |

## 7. Auditoría y Trazabilidad

Todas las operaciones que modifican datos deben generar registros de auditoría para garantizar la trazabilidad completa del sistema.

### 7.1. Operaciones Auditadas

| Operación | Acción de Auditoría | Prioridad |
| :-------- | :------------------ | :-------- |
| Crear cliente | `CLIENT_CREATED` | Alta |
| Actualizar cliente | `CLIENT_UPDATED` | Alta |
| Eliminar cliente | `CLIENT_DELETED` | Alta |
| Crear cuenta de lealtad | `ACCOUNT_CREATED` | Alta |
| Acreditar puntos | `POINTS_CREDITED` | **Crítica** |
| Debitar puntos | `POINTS_DEBITED` | **Crítica** |
| Crear grupo | `GROUP_CREATED` | Media |
| Añadir cliente a grupo | `CLIENT_ADDED_TO_GROUP` | Media |
| Remover cliente de grupo | `CLIENT_REMOVED_FROM_GROUP` | Media |

### 7.2. Estructura del Registro de Auditoría

Cada registro de auditoría debe incluir:

```json
{
  "id": "audit-log-id",
  "action": "POINTS_CREDITED",
  "resource_type": "transaction",
  "resource_id": "transaction-id",
  "client_id": "client-id",
  "account_id": "account-id",
  "transaction_id": "transaction-id",
  "actor": {
    "uid": "firebase-auth-uid",
    "email": "user@example.com"
  },
  "changes": {
    "before": { "points": 100 },
    "after": { "points": 150 }
  },
  "metadata": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "description": "Bonus por compra"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 7.3. Reglas Críticas de Auditoría

1.  **Atomicidad en Operaciones Financieras:** Las operaciones de crédito y débito **DEBEN** crear el registro de auditoría dentro de la misma transacción atómica de Firestore que actualiza el balance. Esto garantiza que si la operación falla, no se cree un registro de auditoría huérfano, y viceversa.

2.  **No Modificabilidad:** Los registros de auditoría son inmutables. Una vez creados, no pueden ser modificados ni eliminados.

3.  **Retención:** Los registros deben conservarse por un mínimo de 5 años para cumplir con requisitos regulatorios.

4.  **Información del Actor:** Todos los registros deben incluir la información del usuario que realizó la acción (Firebase Auth UID y email).

### 7.4. Endpoints de Auditoría

Los registros de auditoría solo pueden consultarse (no crearse, modificarse ni eliminarse) a través de la API:

-   `GET /audit-logs` - Listar todos los registros con filtros
-   `GET /audit-logs/{id}` - Obtener un registro específico
-   `GET /clients/{client_id}/audit-logs` - Auditoría de un cliente
-   `GET /clients/{client_id}/accounts/{account_id}/audit-logs` - Auditoría de una cuenta
-   `GET .../transactions/{transaction_id}/audit-logs` - Auditoría de una transacción
