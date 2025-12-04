# USER-STORIES.md - Historias de Usuario para el Frontend

Este documento contiene las Historias de Usuario para la aplicación de administración (frontend) de LoyaltyGen. Sirven como base para el desarrollo de la interfaz y para la creación de casos de prueba detallados.

---

### **Épica: Gestión de Clientes**

#### HU1: Visualización del Listado de Clientes
*   **Como** administrador,
*   **Quiero** ver una lista de todos los clientes existentes en una tabla,
*   **Para** tener un panorama general de mi base de clientes.

**Criterios de Aceptación:**
1.  Al navegar a la sección de clientes, se debe mostrar una tabla con las columnas "Nombre" y "Email".
2.  Mientras los datos cargan, se debe visualizar un esqueleto de la tabla (`Skeleton loader`).
3.  Si no existen clientes, la tabla no se muestra. En su lugar, aparece un componente de "Estado Vacío" con el mensaje "Aún no se han creado clientes" y un botón de acción principal para "Crear Nuevo Cliente".
4.  Cada fila de la tabla debe tener un menú de acciones (ej. "Ver", "Editar", "Eliminar").

#### HU2: Creación de un Nuevo Cliente
*   **Como** administrador,
*   **Quiero** completar un formulario para crear un nuevo cliente,
*   **Para** poder registrar nuevos miembros en la plataforma.

**Criterios de Aceptación:**
1.  Desde la página de listado de clientes, debe existir un botón "Crear Nuevo Cliente".
2.  Al hacer clic, debo ser redirigido a un formulario en una nueva página (ej. `/dashboard/clients/new`).
3.  El formulario debe solicitar, como mínimo, "Nombre" y "Email".
4.  El botón "Guardar" permanecerá deshabilitado hasta que los campos obligatorios sean válidos.
5.  Al guardar exitosamente, soy redirigido al listado de clientes y recibo una notificación de éxito (`Toast`).
6.  Si la API devuelve un error (ej. email duplicado), se debe mostrar un mensaje de error claro junto al campo correspondiente.

#### HU3: Eliminación de un Cliente
*   **Como** administrador,
*   **Quiero** eliminar un cliente existente,
*   **Para** dar de baja a usuarios que ya no forman parte del programa.

**Criterios de Aceptación:**
1.  Desde el menú de acciones en el listado o desde la página de detalle del cliente, debe existir una opción "Eliminar".
2.  Al hacer clic en "Eliminar", **siempre** se debe abrir un diálogo de alerta (`AlertDialog`) solicitando confirmación explícita.
3.  El diálogo debe advertir que la acción es irreversible.
4.  Solo al confirmar en el diálogo se procederá con la eliminación.
5.  Tras confirmar, soy redirigido al listado de clientes y recibo una notificación (`Toast`) informando que el proceso de borrado ha comenzado.

---

### **Épica: Gestión de Cuentas de Lealtad**

#### HU4: Visualización del Panel de un Cliente
*   **Como** administrador,
*   **Quiero** acceder a una página de detalle de un cliente específico,
*   **Para** poder consultar y gestionar toda su información de lealtad en un solo lugar.

**Criterios de Aceptación:**
1.  Al hacer clic en "Ver" en un cliente del listado, navego a su página de detalle (ej. `/dashboard/clients/[id]`).
2.  La página debe mostrar claramente la información básica del cliente (nombre, email).
3.  La página debe mostrar los grupos de afinidad a los que pertenece el cliente.
4.  La página debe mostrar un resumen con los saldos de todas sus cuentas de lealtad.
5.  La página debe contener una sección para cada cuenta de lealtad, mostrando sus transacciones recientes.

#### HU5: Acreditar Puntos a un Cliente
*   **Como** administrador,
*   **Quiero** añadir puntos a una de las cuentas de lealtad de un cliente,
*   **Para** recompensarlo por una compra o acción específica.

**Criterios de Aceptación:**
1.  En la página de detalle del cliente, dentro de la sección de una cuenta específica, debe existir un formulario para "Acreditar Puntos".
2.  El formulario debe tener campos para "Cantidad" y "Descripción".
3.  Al hacer clic en "Acreditar", el botón debe mostrar un indicador de carga (`Spinner`) y deshabilitarse.
4.  Tras una acreditación exitosa, el saldo de la cuenta y la lista de transacciones deben actualizarse automáticamente (idealmente en tiempo real).
5.  Se debe mostrar una notificación de éxito.

#### HU6: Canjear Puntos de un Cliente
*   **Como** administrador,
*   **Quiero** debitar puntos de una de las cuentas de lealtad de un cliente,
*   **Para** que pueda canjear un premio o producto.

**Criterios de Aceptación:**
1.  En la página de detalle del cliente, dentro de la sección de una cuenta específica, debe existir un formulario para "Debitar Puntos".
2.  El formulario debe tener campos para "Cantidad" y "Descripción".
3.  Si intento debitar una cantidad mayor al saldo disponible, se debe mostrar un mensaje de error claro en la interfaz.
4.  Tras un débito exitoso, el saldo de la cuenta y la lista de transacciones deben actualizarse automáticamente.
5.  Se debe mostrar una notificación de éxito.

---
### **Épica: Búsqueda y Filtrado**

#### HU7: Búsqueda Rápida de Clientes
*   **Como** administrador,
*   **Quiero** un campo de búsqueda en la parte superior de la lista de clientes,
*   **Para** poder encontrar un cliente específico por su nombre o email de forma inmediata.

**Criterios de Aceptación:**
1.  Existe un campo de texto para "Buscar cliente...".
2.  Al escribir en el campo (con un debounce de 300ms), se realiza una petición a un servicio de búsqueda para filtrar la lista.
3.  La tabla se actualiza mostrando solo los clientes que coinciden con el término de búsqueda.
4.  Si no hay resultados, la tabla muestra un estado vacío específico para la búsqueda (ej. "No se encontraron clientes para '...'").
5.  La búsqueda debe ser eficiente y no debe degradar el rendimiento, incluso con millones de clientes.

#### HU8: Filtrado de Transacciones de Cuenta
*   **Como** administrador,
*   **Quiero** filtrar la lista de transacciones de una cuenta por rango de fechas y tipo,
*   **Para** poder auditar o investigar la actividad de un cliente de manera eficiente.

**Criterios de Aceptación:**
1.  Encima de la lista de transacciones de una cuenta, existen controles de filtrado.
2.  Debe haber un selector de rango de fechas (`Date Range Picker`).
3.  Debe haber un selector (`Select`) para filtrar por tipo: "Todas", "Crédito", "Débito".
4.  Al aplicar un filtro, la lista de transacciones se actualiza para mostrar solo los resultados correspondientes.

#### HU9: Asignación Eficiente de Grupos de Afinidad
*   **Como** administrador,
*   **Quiero** buscar un grupo de afinidad por nombre al momento de asignarlo a un cliente,
*   **Para** acelerar el proceso cuando existen muchos grupos.

**Criterios de Aceptación:**
1.  En la página de detalle del cliente, la herramienta para asignar un nuevo grupo debe ser un `Combobox` (campo de texto con desplegable).
2.  Al escribir en el campo, la lista de grupos en el desplegable se filtra para mostrar solo los que coinciden.
3.  Esto permite seleccionar rápidamente un grupo sin necesidad de leer una lista larga.
