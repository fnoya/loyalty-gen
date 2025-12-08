# USER-STORIES.md - Historias de Usuario para el Frontend

Este documento contiene las Historias de Usuario para la aplicación de administración (frontend) de LoyaltyGen. Sirven como base para el desarrollo de la interfaz y para la creación de casos de prueba detallados.

> **Nota para Agentes de IA:** Este documento incluye especificaciones técnicas detalladas para facilitar la implementación. Cada historia incluye referencias a los endpoints de la API (`openapi.yaml`), componentes UI (`shadcn/ui`) y archivos a crear/modificar.

---

### **Épica: Gestión de Clientes**

#### HU1: Visualización del Listado de Clientes
*   **Como** administrador,
*   **Quiero** ver una lista de todos los clientes existentes en una tabla,
*   **Para** tener un panorama general de mi base de clientes.

**Referencias Técnicas:**
-   **Endpoint API:** `GET /clients` (ver `openapi.yaml`)
-   **Ruta Frontend:** `/dashboard/clients`
-   **Archivo Principal:** `app/dashboard/clients/page.tsx`

**Criterios de Aceptación:**
1.  Al navegar a la sección de clientes (`/dashboard/clients`), se debe mostrar una tabla con las columnas "Nombre", "Email" y "Documento de Identidad".
2.  La columna "Email" debe mostrar el email si existe, o "-" si no fue proporcionado.
3.  La columna "Documento de Identidad" debe mostrar el tipo y número del documento si existe (ej. "Pasaporte: AB123456"), o "-" si no fue proporcionado.
4.  Mientras los datos cargan, se debe visualizar un esqueleto de la tabla usando el componente `Skeleton` de shadcn/ui.
5.  Si no existen clientes, la tabla no se muestra. En su lugar, aparece un componente de "Estado Vacío" (crear `components/empty-state.tsx`) con:
    -   Un ícono representativo (usar `lucide-react`)
    -   El mensaje "Aún no se han creado clientes"
    -   Un `Button` primario de shadcn/ui para "Crear Nuevo Cliente" que navegue a `/dashboard/clients/new`
6.  Cada fila de la tabla debe tener un `DropdownMenu` de shadcn/ui con las acciones: "Ver" (navega a `/dashboard/clients/[id]`), "Editar" (navega a `/dashboard/clients/[id]/edit`), "Eliminar" (abre `AlertDialog`).
7.  La tabla debe usar el componente `Table` de shadcn/ui.

**Criterios de Verificación (para el agente):**
-   [ ] La página renderiza sin errores en `/dashboard/clients`
-   [ ] El skeleton se muestra durante la carga de datos
-   [ ] El estado vacío se muestra cuando `data.length === 0`
-   [ ] Los clientes se muestran en la tabla con nombre, email y documento de identidad
-   [ ] Las columnas muestran "-" cuando el campo no está presente
-   [ ] El menú de acciones funciona correctamente

#### HU2: Creación de un Nuevo Cliente
*   **Como** administrador,
*   **Quiero** completar un formulario para crear un nuevo cliente,
*   **Para** poder registrar nuevos miembros en la plataforma.

**Referencias Técnicas:**
-   **Endpoint API:** `POST /clients` (ver `openapi.yaml`, schema `CreateClientRequest`)
-   **Ruta Frontend:** `/dashboard/clients/new`
-   **Archivos a Crear:**
    -   `app/dashboard/clients/new/page.tsx` - Página del formulario
    -   `components/clients/client-form.tsx` - Formulario reutilizable para crear/editar

**Criterios de Aceptación:**
1.  Desde la página de listado de clientes (`/dashboard/clients`), debe existir un `Button` primario "Crear Nuevo Cliente" que navegue a `/dashboard/clients/new`.
2.  El formulario debe usar los componentes `Input`, `Label`, `Select` y `Button` de shadcn/ui.
3.  El formulario debe solicitar, como mínimo, "Nombre" (campo `name`) y al menos uno de los siguientes identificadores:
    -   "Email" (campo `email`)
    -   "Documento de Identidad" que incluye:
        -   Tipo de documento (campo `identity_document.type`): `Select` con opciones "Cédula de Identidad" o "Pasaporte"
        -   Número de documento (campo `identity_document.number`): `Input` alfanumérico
4.  La validación debe usar **Zod** con el mismo schema usado en el backend (o uno compatible). El schema debe validar que al menos uno de los identificadores (email o documento de identidad) esté presente.
5.  El `Button` "Guardar" permanecerá deshabilitado hasta que los campos obligatorios sean válidos y al menos un identificador esté completo.
6.  Durante el envío, el botón debe mostrar un `Spinner` y estar deshabilitado.
7.  Al guardar exitosamente, el usuario es redirigido a `/dashboard/clients` y recibe una notificación de éxito usando el componente `Toast` de shadcn/ui.
8.  Si la API devuelve un error `409 Conflict` (email o documento de identidad duplicado), se debe mostrar un mensaje de error claro junto al campo correspondiente.

**Criterios de Verificación (para el agente):**
-   [ ] El formulario renderiza correctamente en `/dashboard/clients/new`
-   [ ] La validación con Zod funciona (nombre obligatorio, al menos un identificador)
-   [ ] El selector de tipo de documento muestra las opciones correctas
-   [ ] El botón está deshabilitado cuando el formulario es inválido
-   [ ] El spinner se muestra durante el envío
-   [ ] La redirección y toast funcionan tras éxito
-   [ ] El error 409 se maneja mostrando mensaje en el campo email o documento

#### HU3: Eliminación de un Cliente
*   **Como** administrador,
*   **Quiero** eliminar un cliente existente,
*   **Para** dar de baja a usuarios que ya no forman parte del programa.

**Referencias Técnicas:**
-   **Endpoint API:** `DELETE /clients/{client_id}` - Responde con `202 Accepted`
-   **Componente UI:** `AlertDialog` de shadcn/ui (requerido)
-   **Archivos a Crear/Modificar:**
    -   `components/clients/delete-client-dialog.tsx` - Componente del diálogo de confirmación

**Criterios de Aceptación:**
1.  Desde el `DropdownMenu` de acciones en el listado o desde la página de detalle del cliente, debe existir una opción "Eliminar" con variante destructiva.
2.  Al hacer clic en "Eliminar", **siempre** se debe abrir un `AlertDialog` de shadcn/ui solicitando confirmación explícita.
3.  El diálogo debe contener:
    -   Título: "¿Eliminar cliente?"
    -   Descripción: "Esta acción es irreversible. Se eliminarán todos los datos del cliente, incluyendo sus cuentas de lealtad y transacciones."
    -   Botón "Cancelar" (variante `outline`)
    -   Botón "Eliminar" (variante `destructive`)
4.  El botón "Eliminar" del diálogo debe mostrar un `Spinner` durante la petición.
5.  Solo al confirmar en el diálogo se procederá con la eliminación.
6.  Tras confirmar, el usuario es redirigido a `/dashboard/clients` y recibe una notificación (`Toast`) con el mensaje "El proceso de eliminación del cliente ha comenzado".

**Criterios de Verificación (para el agente):**
-   [ ] El AlertDialog se abre al hacer clic en "Eliminar"
-   [ ] El diálogo tiene el texto de advertencia correcto
-   [ ] El botón Cancelar cierra el diálogo sin ejecutar acción
-   [ ] El botón Eliminar muestra spinner durante la petición
-   [ ] La petición DELETE se envía correctamente
-   [ ] El toast de confirmación se muestra tras el 202 Accepted

---

### **Épica: Gestión de Cuentas de Lealtad**

#### HU4: Visualización del Panel de un Cliente
*   **Como** administrador,
*   **Quiero** acceder a una página de detalle de un cliente específico,
*   **Para** poder consultar y gestionar toda su información de lealtad en un solo lugar.

**Referencias Técnicas:**
-   **Endpoints API:**
    -   `GET /clients/{client_id}` - Datos del cliente
    -   `GET /clients/{client_id}/accounts` - Cuentas de lealtad
    -   `GET /clients/{client_id}/balance` - Saldos desnormalizados
    -   `GET /clients/{client_id}/accounts/{account_id}/transactions` - Transacciones
-   **Ruta Frontend:** `/dashboard/clients/[id]`
-   **Archivos a Crear:**
    -   `app/dashboard/clients/[id]/page.tsx` - Página de detalle
    -   `components/clients/client-info-card.tsx` - Card con info básica
    -   `components/clients/accounts-summary.tsx` - Resumen de saldos
    -   `components/clients/account-card.tsx` - Card de cuenta individual
    -   `components/clients/transactions-list.tsx` - Lista de transacciones

**Criterios de Aceptación:**
1.  Al hacer clic en "Ver" en un cliente del listado, se navega a `/dashboard/clients/[id]`.
2.  La página debe mostrar claramente la información básica del cliente (nombre, email) en un `Card` de shadcn/ui.
3.  La página debe mostrar los grupos de afinidad a los que pertenece el cliente (usar `Badge` de shadcn/ui para cada grupo).
4.  La página debe mostrar un resumen con los saldos de todas sus cuentas de lealtad (usar endpoint `/balance` para lectura rápida).
5.  La página debe contener una sección (usando `Card`) para cada cuenta de lealtad, mostrando:
    -   Nombre de la cuenta
    -   Saldo actual de puntos
    -   Formularios para acreditar/debitar (ver HU5, HU6)
    -   Lista de transacciones recientes (últimas 5, con opción de "Ver más")
6.  Mientras cargan los datos, mostrar `Skeleton` en cada sección.

**Criterios de Verificación (para el agente):**
-   [ ] La página carga correctamente con el ID del cliente
-   [ ] Se muestra el nombre y email del cliente
-   [ ] Los grupos de afinidad se muestran como badges
-   [ ] Los saldos de todas las cuentas se muestran correctamente
-   [ ] Cada cuenta muestra sus transacciones recientes
-   [ ] Los skeletons se muestran durante la carga

#### HU5: Acreditar Puntos a un Cliente
*   **Como** administrador,
*   **Quiero** añadir puntos a una de las cuentas de lealtad de un cliente,
*   **Para** recompensarlo por una compra o acción específica.

**Referencias Técnicas:**
-   **Endpoint API:** `POST /clients/{client_id}/accounts/{account_id}/credit`
-   **Request Body Schema:** `CreditDebitRequest` - `{ amount: number (min 1), description?: string }`
-   **Archivo a Crear:** `components/clients/credit-debit-form.tsx` - Formulario reutilizable

**Criterios de Aceptación:**
1.  En la página de detalle del cliente (`/dashboard/clients/[id]`), dentro del `Card` de cada cuenta, debe existir un formulario para "Acreditar Puntos".
2.  El formulario debe tener:
    -   Campo `Input` para "Cantidad" (numérico, mínimo 1)
    -   Campo `Input` para "Descripción" (opcional)
    -   `Button` "Acreditar" (variante `default`)
3.  La validación debe usar Zod para asegurar que `amount >= 1`.
4.  Al hacer clic en "Acreditar", el botón debe mostrar un `Spinner` y deshabilitarse.
5.  Tras una acreditación exitosa:
    -   El saldo de la cuenta debe actualizarse automáticamente (idealmente usando `onSnapshot` de Firestore o refetch)
    -   La lista de transacciones debe mostrar la nueva transacción
    -   El formulario debe resetearse
6.  Se debe mostrar un `Toast` de éxito con el mensaje "Puntos acreditados exitosamente".

**Criterios de Verificación (para el agente):**
-   [ ] El formulario valida que amount sea >= 1
-   [ ] El spinner se muestra durante el envío
-   [ ] El saldo se actualiza tras la operación exitosa
-   [ ] La nueva transacción aparece en la lista
-   [ ] El toast de éxito se muestra
-   [ ] El formulario se resetea tras el éxito

#### HU6: Canjear Puntos de un Cliente
*   **Como** administrador,
*   **Quiero** debitar puntos de una de las cuentas de lealtad de un cliente,
*   **Para** que pueda canjear un premio o producto.

**Referencias Técnicas:**
-   **Endpoint API:** `POST /clients/{client_id}/accounts/{account_id}/debit`
-   **Request Body Schema:** `CreditDebitRequest` - `{ amount: number (min 1), description?: string }`
-   **Error Esperado:** `400 Bad Request` con código `INSUFFICIENT_BALANCE` si saldo insuficiente
-   **Archivo:** Reutilizar `components/clients/credit-debit-form.tsx` con prop `type="debit"`

**Criterios de Aceptación:**
1.  En la página de detalle del cliente, dentro del `Card` de cada cuenta, debe existir un formulario para "Debitar Puntos".
2.  El formulario debe tener los mismos campos que el de crédito: "Cantidad" y "Descripción".
3.  La validación con Zod debe asegurar que `amount >= 1`.
4.  Si la API devuelve `400 Bad Request` con código `INSUFFICIENT_BALANCE`:
    -   Mostrar un mensaje de error en el formulario: "El saldo de la cuenta es insuficiente para realizar el débito."
    -   Usar el componente de error de formulario de shadcn/ui
5.  Al hacer clic en "Debitar", el botón debe mostrar un `Spinner` y deshabilitarse.
6.  Tras un débito exitoso:
    -   El saldo de la cuenta debe actualizarse automáticamente
    -   La lista de transacciones debe mostrar la nueva transacción
    -   Mostrar `Toast` de éxito
7.  El botón "Debitar" debe usar la variante `secondary` para diferenciarlo visualmente del de crédito.

**Criterios de Verificación (para el agente):**
-   [ ] El formulario valida que amount sea >= 1
-   [ ] El error de saldo insuficiente se muestra correctamente
-   [ ] El saldo se actualiza tras la operación exitosa
-   [ ] La nueva transacción aparece en la lista
-   [ ] El botón usa la variante correcta (secondary)

---
### **Épica: Búsqueda y Filtrado**

#### HU7: Búsqueda Rápida de Clientes
*   **Como** administrador,
*   **Quiero** un campo de búsqueda en la parte superior de la lista de clientes,
*   **Para** poder encontrar un cliente específico por su nombre, email o documento de identidad de forma inmediata.

**Referencias Técnicas:**
-   **Estrategia MVP:** Búsqueda usando queries `startsWith` de Firestore (ver `ARCHITECTURE.md` sección 3.1 y sobre todo `FIRESTORE-SEARCH-SOLUTION.md`)
-   **Componente UI:** `Input` de shadcn/ui con ícono de búsqueda (usar `lucide-react`)
-   **Archivo a Crear:** `components/clients/client-search.tsx`

**Criterios de Aceptación:**
1.  Existe un campo `Input` con placeholder "Buscar cliente..." encima de la tabla de clientes.
2.  El campo debe tener un ícono de búsqueda (Search de lucide-react) a la izquierda.
3.  Al escribir en el campo, usar **debounce de 300ms** antes de ejecutar la búsqueda (usar hook `useDebouncedValue` o similar).
4.  **Implementación MVP:** Filtrar cliente-side los resultados ya cargados por nombre, email o número de documento de identidad (case-insensitive).
5.  Si no hay resultados, mostrar un estado vacío específico:
    -   Mensaje: "No se encontraron clientes para '[término de búsqueda]'"
    -   Botón: "Limpiar búsqueda" que resetee el campo
6.  Al limpiar el campo de búsqueda (o hacer clic en "Limpiar"), mostrar todos los clientes.

**Nota sobre Escalabilidad:**
> En el MVP, la búsqueda se realiza sobre los datos ya cargados en memoria. Cuando la base de usuarios crezca, se migrará a un servicio de búsqueda dedicado (Algolia/Elasticsearch) según lo especificado en `ARCHITECTURE.md`.

**Criterios de Verificación (para el agente):**
-   [ ] El campo de búsqueda se muestra encima de la tabla
-   [ ] El debounce de 300ms funciona correctamente
-   [ ] La búsqueda filtra por nombre, email y número de documento (case-insensitive)
-   [ ] El estado vacío de búsqueda se muestra cuando no hay resultados
-   [ ] El botón "Limpiar búsqueda" funciona

#### HU8: Filtrado de Transacciones de Cuenta
*   **Como** administrador,
*   **Quiero** filtrar la lista de transacciones de una cuenta por rango de fechas y tipo,
*   **Para** poder auditar o investigar la actividad de un cliente de manera eficiente.

**Referencias Técnicas:**
-   **Endpoint API:** `GET /clients/{client_id}/accounts/{account_id}/transactions` con query params
-   **Componentes UI:**
    -   `DateRangePicker` (de shadcn/ui, basado en `react-day-picker`)
    -   `Select` de shadcn/ui para filtrar por tipo
-   **Archivo a Crear:** `components/clients/transactions-filter.tsx`

**Criterios de Aceptación:**
1.  Encima de la lista de transacciones de una cuenta, existen controles de filtrado en una fila horizontal.
2.  Debe haber un `DateRangePicker` para seleccionar rango de fechas (usar componente de shadcn/ui).
3.  Debe haber un `Select` de shadcn/ui para filtrar por tipo con las opciones:
    -   "Todas" (valor: `null`)
    -   "Crédito" (valor: `credit`)
    -   "Débito" (valor: `debit`)
4.  Al aplicar un filtro, la lista de transacciones se actualiza mostrando solo los resultados correspondientes.
5.  Debe haber un botón "Limpiar filtros" que resetee los controles a su estado inicial.
6.  Los filtros se aplican con debounce de 500ms después de seleccionar fechas.

**Criterios de Verificación (para el agente):**
-   [ ] El DateRangePicker funciona correctamente
-   [ ] El Select de tipo tiene las opciones correctas
-   [ ] Los filtros afectan la lista de transacciones mostrada
-   [ ] El botón "Limpiar filtros" resetea los controles
-   [ ] El debounce funciona en el DateRangePicker

#### HU9: Asignación Eficiente de Grupos de Afinidad
*   **Como** administrador,
*   **Quiero** buscar un grupo de afinidad por nombre al momento de asignarlo a un cliente,
*   **Para** acelerar el proceso cuando existen muchos grupos.

**Referencias Técnicas:**
-   **Endpoints API:**
    -   `GET /groups` - Listar todos los grupos
    -   `POST /groups/{group_id}/clients/{client_id}` - Asignar cliente a grupo
    -   `DELETE /groups/{group_id}/clients/{client_id}` - Desasignar cliente de grupo
-   **Componente UI:** `Combobox` de shadcn/ui
-   **Archivo a Crear:** `components/clients/group-assignment.tsx`

**Criterios de Aceptación:**
1.  En la página de detalle del cliente, la sección de grupos de afinidad debe incluir:
    -   Lista de grupos actuales del cliente (usando `Badge` con botón de eliminar)
    -   Un `Combobox` para añadir nuevos grupos
2.  El `Combobox` debe:
    -   Cargar todos los grupos disponibles al montarse
    -   Filtrar la lista según el texto escrito (case-insensitive)
    -   Excluir de la lista los grupos a los que el cliente ya pertenece
    -   Mostrar "No se encontraron grupos" si no hay coincidencias
3.  Al seleccionar un grupo del `Combobox`:
    -   Hacer la petición `POST /groups/{group_id}/clients/{client_id}`
    -   Mostrar un `Spinner` durante la operación
    -   Añadir el grupo a la lista de badges tras éxito
    -   Mostrar `Toast` de confirmación
4.  Al hacer clic en el botón eliminar de un `Badge`:
    -   Abrir un `AlertDialog` de confirmación
    -   Hacer la petición `DELETE /groups/{group_id}/clients/{client_id}`
    -   Remover el badge de la lista tras éxito

**Criterios de Verificación (para el agente):**
-   [ ] El Combobox lista los grupos disponibles
-   [ ] El filtrado funciona correctamente
-   [ ] Los grupos ya asignados no aparecen en la lista
-   [ ] La asignación funciona y actualiza la UI
-   [ ] La desasignación pide confirmación y funciona

---

### **Épica: Auditoría y Trazabilidad**

#### HU10: Visualización de Auditoría de un Cliente
*   **Como** administrador,
*   **Quiero** ver el historial de auditoría de un cliente desde su página de detalle,
*   **Para** poder rastrear todas las operaciones realizadas sobre el cliente, sus cuentas y transacciones.

**Referencias Técnicas:**
-   **Endpoint API:** `GET /clients/{client_id}/audit-logs` (ver `openapi.yaml`)
-   **Ruta Frontend:** `/dashboard/clients/[id]` (sección de auditoría)
-   **Archivos a Crear:**
    -   `components/audit/audit-logs-list.tsx` - Componente para listar registros de auditoría
    -   `components/audit/audit-log-item.tsx` - Componente para mostrar un registro de auditoría individual
    -   `components/audit/audit-log-dialog.tsx` - Diálogo para ver detalles completos de un registro

**Criterios de Aceptación:**
1.  En la página de detalle del cliente (`/dashboard/clients/[id]`), debe existir una sección o pestaña "Historial de Auditoría".
2.  La sección debe mostrar una lista cronológica (más reciente primero) de todos los registros de auditoría relacionados con el cliente.
3.  Cada registro debe mostrar:
    -   Tipo de acción (ej. "Cliente Creado", "Puntos Acreditados", "Cliente Añadido a Grupo")
    -   Fecha y hora de la operación
    -   Email del usuario que realizó la acción (actor)
    -   Descripción breve del recurso afectado
4.  La lista debe usar paginación con scroll infinito o botón "Cargar más".
5.  Se debe poder filtrar por tipo de acción usando un `Select` de shadcn/ui.
6.  Al hacer clic en un registro, se debe abrir un `Dialog` con los detalles completos:
    -   Estado anterior (si aplica)
    -   Estado posterior (si aplica)
    -   Metadatos adicionales (IP, user agent, descripción)
7.  Mientras cargan los datos, mostrar `Skeleton`.

**Criterios de Verificación (para el agente):**
-   [ ] La sección de auditoría se muestra en la página de detalle del cliente
-   [ ] Los registros se ordenan cronológicamente (más reciente primero)
-   [ ] El filtro por tipo de acción funciona correctamente
-   [ ] El diálogo de detalles muestra la información completa
-   [ ] La paginación funciona correctamente
-   [ ] Los skeletons se muestran durante la carga

#### HU11: Visualización de Auditoría de Transacciones
*   **Como** administrador,
*   **Quiero** acceder a la información de auditoría de cada transacción de crédito o débito,
*   **Para** poder verificar quién realizó la operación y los detalles exactos del movimiento.

**Referencias Técnicas:**
-   **Endpoints API:**
    -   `GET /clients/{client_id}/accounts/{account_id}/audit-logs`
    -   `GET /clients/{client_id}/accounts/{account_id}/transactions/{transaction_id}/audit-logs`
-   **Ruta Frontend:** `/dashboard/clients/[id]` (sección de cuentas)
-   **Archivos a Modificar:**
    -   `components/clients/transactions-list.tsx` - Añadir enlace a auditoría

**Criterios de Aceptación:**
1.  En la lista de transacciones de una cuenta, cada transacción debe tener un botón o ícono "Ver Auditoría" (usar ícono `FileSearch` de lucide-react).
2.  Al hacer clic en "Ver Auditoría", se debe abrir un `Dialog` mostrando el registro de auditoría asociado con:
    -   Tipo de operación (crédito/débito)
    -   Monto de la transacción
    -   Balance anterior y posterior
    -   Usuario que realizó la operación
    -   Fecha y hora exacta
    -   Metadatos (IP, user agent si está disponible)
3.  Si no existe registro de auditoría (transacciones históricas anteriores a la implementación), mostrar un mensaje informativo.
4.  En la página de detalle de la cuenta, debe existir una pestaña o sección "Auditoría de Cuenta" que muestre todos los registros de auditoría de la cuenta.

**Criterios de Verificación (para el agente):**
-   [ ] El botón "Ver Auditoría" aparece en cada transacción
-   [ ] El diálogo muestra la información de auditoría completa
-   [ ] Se muestra mensaje apropiado si no hay registro de auditoría
-   [ ] La sección "Auditoría de Cuenta" funciona correctamente

#### HU12: Visualización Global de Auditoría
*   **Como** administrador,
*   **Quiero** acceder a un panel de auditoría global,
*   **Para** poder revisar todas las operaciones realizadas en el sistema y detectar actividades sospechosas.

**Referencias Técnicas:**
-   **Endpoint API:** `GET /audit-logs` (ver `openapi.yaml`)
-   **Ruta Frontend:** `/dashboard/audit`
-   **Archivos a Crear:**
    -   `app/dashboard/audit/page.tsx` - Página del panel de auditoría
    -   `components/audit/audit-filters.tsx` - Componente de filtros avanzados

**Criterios de Aceptación:**
1.  Debe existir una entrada "Auditoría" en el sidebar que navegue a `/dashboard/audit`.
2.  La página debe mostrar una tabla con todos los registros de auditoría del sistema.
3.  La tabla debe mostrar las columnas: "Fecha", "Acción", "Recurso", "Actor", "Cliente Relacionado".
4.  La página debe incluir filtros avanzados:
    -   Rango de fechas (usar `DateRangePicker` de shadcn/ui)
    -   Tipo de acción (Select con todas las acciones posibles)
    -   Búsqueda por ID de cliente
    -   Búsqueda por ID de cuenta
5.  La tabla debe soportar paginación basada en cursor.
6.  Al hacer clic en una fila, se debe abrir un `Dialog` con los detalles completos del registro.
7.  Los filtros se aplican con debounce de 500ms después de cualquier cambio.
8.  Debe haber un botón "Limpiar filtros" para resetear todos los controles.

**Criterios de Verificación (para el agente):**
-   [ ] La página de auditoría global es accesible desde el sidebar
-   [ ] La tabla muestra todos los registros con las columnas correctas
-   [ ] Los filtros funcionan correctamente (fechas, tipo, cliente, cuenta)
-   [ ] El debounce funciona en los filtros
-   [ ] El botón "Limpiar filtros" resetea todos los controles
-   [ ] La paginación funciona correctamente
-   [ ] El diálogo de detalles se abre al hacer clic en una fila

---

### **Épica: Gestión de Círculos de Afinidad Familiares**

#### HU13: Visualización del Círculo Familiar del Cliente
*   **Como** administrador,
*   **Quiero** ver los miembros del círculo familiar de un cliente en su página de detalle,
*   **Para** entender quiénes están vinculados y pueden realizar transacciones en sus cuentas.

**Referencias Técnicas:**
-   **Endpoint API:** `GET /clients/{client_id}/family-circle` (ver `openapi.yaml`)
-   **Ruta Frontend:** `/dashboard/clients/[id]` (sección de círculo familiar)
-   **Componentes a Crear:**
    -   `components/clients/family-circle-card.tsx` - Card mostrando info del círculo
    -   `components/clients/family-member-badge.tsx` - Badge para cada miembro

**Criterios de Aceptación:**
1.  En la página de detalle del cliente (`/dashboard/clients/[id]`), debe existir una sección "Círculo Familiar".
2.  Si el cliente es **titular** de un círculo, mostrar:
    -   Etiqueta `Badge` con "Titular del Círculo"
    -   Lista de miembros con nombre, email y tipo de relación
    -   Para cada miembro, un `DropdownMenu` con opciones: "Ver Cliente", "Remover del Círculo"
    -   Botón "Añadir Miembro" que abra un diálogo
3.  Si el cliente es **miembro** de un círculo, mostrar:
    -   Etiqueta `Badge` con "Miembro de Círculo"
    -   Nombre del titular con enlace a su perfil
    -   Tipo de relación con el titular
    -   Fecha de adhesión al círculo
4.  Si el cliente no pertenece a ningún círculo, mostrar:
    -   Mensaje "Este cliente no pertenece a ningún círculo familiar"
    -   Botón "Crear Círculo" (que abre diálogo para añadir primer miembro)
5.  Usar componentes `Card`, `Badge`, `Button` y `DropdownMenu` de shadcn/ui.

**Criterios de Verificación (para el agente):**
-   [ ] La sección se muestra en la página de detalle del cliente
-   [ ] Se diferencia visualmente si el cliente es titular, miembro o sin círculo
-   [ ] Los miembros se listan correctamente con toda su información
-   [ ] Los enlaces de navegación funcionan
-   [ ] Los badges muestran el estado correcto

#### HU14: Añadir Miembro al Círculo Familiar
*   **Como** administrador gestionando un cliente titular,
*   **Quiero** añadir otros clientes como miembros de su círculo familiar,
*   **Para** permitir que realicen transacciones en las cuentas del titular.

**Referencias Técnicas:**
-   **Endpoint API:** `POST /clients/{client_id}/family-circle/members` (ver `openapi.yaml`)
-   **Componente a Crear:** `components/clients/add-family-member-dialog.tsx`

**Criterios de Aceptación:**
1.  Desde la sección de círculo familiar, el botón "Añadir Miembro" abre un `Dialog` de shadcn/ui.
2.  El diálogo contiene un formulario con:
    -   Campo de búsqueda/selección de cliente (usar `Combobox` de shadcn/ui)
    -   Selector de tipo de relación: cónyuge, hijo, padre, hermano, amigo, otro (usar `Select`)
    -   Botón "Cancelar" y botón "Añadir"
3.  El campo de búsqueda debe filtrar clientes por nombre o documento.
4.  Solo se pueden seleccionar clientes que NO estén en otro círculo.
5.  No se puede añadir al mismo titular.
6.  Durante el envío, el botón "Añadir" muestra un `Spinner` y está deshabilitado.
7.  Si la API devuelve error `409 MEMBER_ALREADY_IN_CIRCLE`, mostrar mensaje: "Este cliente ya pertenece a otro círculo familiar".
8.  Si la API devuelve error `400 CANNOT_ADD_SELF`, mostrar mensaje: "No puedes añadirte a ti mismo al círculo".
9.  Al añadir exitosamente, cerrar el diálogo, mostrar `Toast` de éxito y actualizar la lista de miembros.

**Criterios de Verificación (para el agente):**
-   [ ] El diálogo se abre correctamente
-   [ ] El Combobox permite buscar y seleccionar clientes
-   [ ] El Select de relación tiene todas las opciones
-   [ ] Las validaciones funcionan (cliente ya en círculo, no añadir a sí mismo)
-   [ ] El spinner se muestra durante el envío
-   [ ] Los mensajes de error son claros
-   [ ] La lista se actualiza tras éxito

#### HU15: Remover Miembro del Círculo Familiar
*   **Como** administrador gestionando un cliente titular,
*   **Quiero** remover miembros de su círculo familiar,
*   **Para** revocar su acceso a realizar transacciones en las cuentas del titular.

**Referencias Técnicas:**
-   **Endpoint API:** `DELETE /clients/{client_id}/family-circle/members/{member_id}`
-   **Componente UI:** `AlertDialog` de shadcn/ui (obligatorio)

**Criterios de Aceptación:**
1.  En el `DropdownMenu` de cada miembro, la opción "Remover del Círculo" tiene variante destructiva.
2.  Al hacer clic, se abre un `AlertDialog` solicitando confirmación:
    -   Título: "¿Remover miembro del círculo?"
    -   Descripción: "Esta acción removerá a [Nombre del Miembro] del círculo familiar. El miembro perderá acceso a realizar transacciones en las cuentas del titular."
    -   Botón "Cancelar" (variante `outline`)
    -   Botón "Remover" (variante `destructive`)
3.  Durante la petición, el botón "Remover" muestra un `Spinner`.
4.  Tras confirmar, el miembro se elimina de la lista y se muestra `Toast` de éxito.

**Criterios de Verificación (para el agente):**
-   [ ] El AlertDialog se abre al seleccionar "Remover"
-   [ ] El texto de advertencia es claro
-   [ ] El botón Cancelar cierra el diálogo sin acción
-   [ ] El spinner se muestra durante la petición
-   [ ] El miembro se elimina de la lista tras éxito
-   [ ] El toast de confirmación se muestra

#### HU16: Configurar Permisos de Círculo en Cuenta
*   **Como** administrador gestionando una cuenta de lealtad,
*   **Quiero** configurar si los miembros del círculo pueden acreditar o debitar puntos,
*   **Para** controlar qué operaciones pueden realizar los miembros del círculo familiar del titular.

**Referencias Técnicas:**
-   **Endpoint API:** `PATCH /clients/{client_id}/accounts/{account_id}/family-circle-config`
-   **Componente a Crear:** `components/clients/account-family-config.tsx`

**Criterios de Aceptación:**
1.  En la página de detalle del cliente, dentro del `Card` de cada cuenta, debe existir una sección "Permisos de Círculo Familiar".
2.  La sección muestra dos `Switch` de shadcn/ui:
    -   "Permitir créditos de miembros" (vinculado a `allowMemberCredits`)
    -   "Permitir débitos de miembros" (vinculado a `allowMemberDebits`)
3.  Los switches reflejan el estado actual de la configuración.
4.  Al cambiar un switch, se realiza automáticamente la petición PATCH.
5.  Durante la actualización, el switch muestra un estado de "cargando" (deshabilitado).
6.  Si la actualización falla, el switch vuelve a su estado anterior y se muestra un `Toast` de error.
7.  Si la actualización es exitosa, se muestra un `Toast` de confirmación.
8.  Los cambios deben reflejarse inmediatamente en la UI.

**Criterios de Verificación (para el agente):**
-   [ ] Los switches se muestran en cada cuenta
-   [ ] Los switches reflejan correctamente el estado actual
-   [ ] Al cambiar un switch se envía la petición PATCH
-   [ ] El estado de "cargando" funciona correctamente
-   [ ] En caso de error, el switch vuelve al estado anterior
-   [ ] El toast de confirmación/error se muestra
