# UI-UX-GUIDELINES.md - Guía de Estilo de Interfaz y Experiencia de Usuario

Este documento define los principios y estándares de UI y UX para la aplicación web "LoyaltyGen". El objetivo es crear una interfaz de usuario profesional, cohesiva, accesible y fácil de usar.

## 1. Principios Fundamentales de UX

1.  **Claridad y Minimalismo:** La interfaz debe ser intuitiva y auto-explicativa, sin elementos superfluos. Cada componente visual debe tener un propósito claro.
2.  **Consistencia Radical:** Los componentes, colores, espaciados e interacciones deben ser consistentes en toda la aplicación para que la experiencia sea predecible.
3.  **Eficiencia del Usuario:** Los flujos de trabajo deben estar optimizados para las tareas más comunes, minimizando el número de clics y la fricción.
4.  **Feedback Inmediato y Claro:** La aplicación debe comunicar siempre su estado (cargando, éxito, error), para que el usuario nunca tenga dudas sobre lo que está ocurriendo.
5.  **Accesibilidad (A11y) por Diseño:** La aplicación debe ser usable por el mayor número posible de personas. Todos los componentes y flujos deben ser probados para su uso con teclado y lectores de pantalla (cumpliendo con WCAG 2.1 AA), y se deben respetar los estándares de contraste de color.

## 2. Identidad Visual

Se busca una estética minimalista, moderna y profesional.

### a. Paleta de Colores

Nos basaremos en la paleta de colores por defecto de Tailwind CSS.

-   **Primario / Acento:** `blue-600`
-   **Texto Principal:** `slate-900`
-   **Texto Secundario:** `slate-600`
-   **Fondo Principal (Layout):** `slate-50`
-   **Fondo de Componentes (Cards, Modals):** `white`
-   **Bordes:** `slate-200`
-   **Éxito:** `green-500`
-   **Error:** `red-500`

### b. Tipografía

-   **Fuente:** **Inter**, importada desde Google Fonts.
-   **Escala de Tamaños:** Usar la escala por defecto de Tailwind (`text-base`, `text-lg`, etc.).

### c. Espaciado y Sombra

-   **Unidad de Espaciado:** Escala basada en múltiplos de 4px de Tailwind.
-   **Sombras (Shadows):** Usar sombras sutiles (`shadow-md`, `shadow-lg`) para dar elevación a componentes como Cards y Modals.

## 3. Guía de Componentes (con Shadcn/ui y Tailwind)

Se utilizarán los componentes de [Shadcn/ui](https://ui.shadcn.com/) como base, que son accesibles por defecto.

-   **Botones (`Button`):** Usar las variantes (`default`, `secondary`, `destructive`, `outline`, `ghost`) según la jerarquía de la acción.
-   **Formularios (`Input`, `Label`):** Todos los campos deben tener una `Label` visible y asociar los errores de validación de forma programática.
-   **Tablas de Datos (`Table`):** Para listar recursos. La última columna debe contener un `DropdownMenu` con las acciones de la fila.
-   **Notificaciones (`Toast`):** Para feedback no bloqueante tras una acción.
-   **Indicadores de Carga (`Spinner`, `Skeleton`):** Usar `Skeleton` para la carga inicial de datos y `Spinner` en botones durante una acción.
-   **Diálogos de Alerta (`AlertDialog`):** Exclusivamente para confirmar acciones destructivas.

## 4. Patrones de Experiencia de Usuario (UX)

### a. Flujo CRUD

-   **Crear (Create):** Navegar a una página dedicada (ej: `/dashboard/clients/new`).
-   **Leer (Read):** Una tabla en `/dashboard/clients` que lleva al detalle en `/dashboard/clients/[id]`.
-   **Actualizar (Update):** Un botón "Editar" en la página de detalle que lleva a `/dashboard/clients/[id]/edit`.
-   **Eliminar (Delete):** Un botón "Eliminar" que **siempre** abre un `AlertDialog` de confirmación.

### b. Estados Vacíos (Empty States)

Cuando una lista o tabla no tiene datos, no se debe mostrar una tabla vacía. En su lugar, se debe renderizar un componente de "Estado Vacío" que contenga:
1.  Un ícono representativo (ej. un icono de "no hay usuarios").
2.  Un mensaje claro y amigable (ej. "Aún no se han creado clientes").
3.  Un **botón de llamada a la acción principal (CTA)** (ej. `Button` primario para "Crear Nuevo Cliente").

### c. Interactividad y Tiempo Real

Para mejorar la experiencia de usuario y proporcionar feedback instantáneo, se debe evaluar el uso de listeners de Firestore (`onSnapshot`) en áreas clave.
-   **Caso de Uso Ideal:** La tabla de transacciones de una cuenta de lealtad. Al acreditar o debitar puntos, la nueva transacción debe aparecer en la lista en tiempo real sin necesidad de un refresco manual por parte del usuario.

### d. Fotos de Perfil de Clientes

Las fotos de perfil de clientes son opcionales y deben manejarse con gracia en la UI.

**Componente Avatar:**
-   **Con foto:** Si el cliente tiene una `photoUrl`, se debe mostrar la imagen circular con un borde sutil
-   **Sin foto (Placeholder):** Si no hay foto, se debe mostrar un avatar placeholder con:
    -   Fondo de color basado en las iniciales del cliente (ej: azul, verde, púrpura)
    -   Iniciales del cliente en texto blanco (ej: "JP" para Juan Pérez)
    -   Tamaño consistente con los avatares que tienen foto
    -   Borde sutil para mantener consistencia visual

**Ejemplo de Implementación (Pseudocódigo React):**
```tsx
function ClientAvatar({ client, size = "md" }) {
  const initials = `${client.name.firstName[0]}${client.name.firstLastName[0]}`;
  
  if (client.photoUrl) {
    return (
      <img 
        src={client.photoUrl} 
        alt={`${client.name.firstName} ${client.name.firstLastName}`}
        className="rounded-full object-cover"
      />
    );
  }
  
  return (
    <div className="rounded-full bg-blue-600 flex items-center justify-center">
      <span className="text-white font-semibold">{initials}</span>
    </div>
  );
}
```

**Gestión de Fotos:**
-   **Subida:** Botón "Subir Foto" o "Cambiar Foto" que abre un selector de archivos
-   **Validación del lado del cliente:** Validar formato (JPEG/PNG/WEBP) y tamaño (máx 5MB) antes de subir
-   **Preview:** Mostrar preview de la imagen antes de confirmar la subida
-   **Eliminación:** Botón "Eliminar Foto" que muestra un `AlertDialog` de confirmación
-   **Estados de carga:** Mostrar spinner/skeleton mientras se sube o elimina la foto
-   **Manejo de errores:** Mostrar `Toast` con mensaje claro si la subida falla

**Accesibilidad:**
-   Todos los avatares deben tener atributo `alt` descriptivo
-   Los placeholders deben ser distinguibles para usuarios con deficiencias visuales de color
-   Las acciones de foto deben ser accesibles por teclado

## 5. Composición de Vistas Principales

La composición detallada de las vistas en el documento original se mantiene como guía principal para la implementación del frontend.

## 6. Seguridad en el Cliente (Frontend)

La seguridad es una responsabilidad tanto del backend como del frontend.

### a. Prevención de Cross-Site Scripting (XSS)

-   **Regla:** Toda data generada por el usuario (ej. nombres de clientes, descripciones) que se renderice en la UI debe ser tratada como no confiable y ser debidamente escapada.
-   **Práctica:** Aunque React por defecto escapa el contenido renderizado, es una responsabilidad del desarrollador garantizar que no se utilicen APIs peligrosas como `dangerouslySetInnerHTML` con datos no sanitizados.

### b. Almacenamiento Seguro de Tokens JWT

-   **Regla:** El ID Token de Firebase **no debe ser almacenado en `localStorage` o `sessionStorage`**.
-   **Práctica:** El token debe mantenerse en memoria en el estado de la aplicación (manejado por el SDK de Firebase o una librería de estado como Zustand). Esto mitiga significativamente el riesgo de robo de tokens a través de ataques XSS.
