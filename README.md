# LoyaltyGen - Plataforma de Lealtad API-First

## 1. Visión del Producto

**LoyaltyGen** es una plataforma de lealtad de clientes, flexible y potente, orientada 100% a ser consumida vía API (API-First). Su misión es proporcionar a los desarrolladores una API RESTful, segura y bien documentada para implementar sistemas de puntos y afinidad rápidamente.

## 2. Estado Actual del Proyecto

**Fase:** Diseño y Especificación Arquitectónica (Completada).

El proyecto ha concluido su fase de diseño, resultando en un conjunto completo de documentos que definen la arquitectura, especificaciones, y guías de desarrollo. El siguiente paso es la fase de implementación.

## 3. Pila Tecnológica (MVP)

-   **Backend:** TypeScript, Node.js, Express.js sobre Cloud Functions for Firebase.
-   **Base de Datos:** Cloud Firestore.
-   **Autenticación:** Firebase Authentication.
-   **Frontend:** Next.js (App Router), Tailwind CSS, Shadcn/ui.
-   **Alojamiento:** Firebase Hosting.

La arquitectura está diseñada para escalar integrando servicios especializados como motores de búsqueda y data warehouses cuando sea necesario.

## 4. Documentación del Proyecto

Toda la documentación detallada del proyecto se encuentra en el directorio `/docs`. El contrato formal de la API está definido en el archivo `openapi.yaml`.

| Documento                                               | Descripción                                                                                                |
| :------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------- |
| **[Arquitectura del Sistema](docs/ARCHITECTURE.md)**     | Describe la pila tecnológica, los componentes, los flujos de datos y las estrategias para la escalabilidad.    |
| **[Decisiones de Diseño (ADR)](docs/DESIGN.md)**         | Un registro de las decisiones de arquitectura clave y su justificación (por qué se eligió qué).            |
| **[Especificación de API (Contrato)](openapi.yaml)**     | El archivo OpenAPI 3.0 que define formalmente cada endpoint. **Es la única fuente de verdad para la API.** |
| **[Guía de Diseño de API](docs/API-DESIGN.md)**          | Establece las convenciones de nombrado, versionado y formatos de respuesta para la API.                     |
| **[Especificaciones Funcionales (NFRs)](docs/SPECS.md)** | Detalla los requisitos funcionales (endpoints) y no funcionales (rendimiento, seguridad, escalabilidad).     |
| **[Historias de Usuario](docs/USER-STORIES.md)**         | Define las funcionalidades del frontend desde la perspectiva del usuario administrador.                      |
| **[Directrices de Codificación](docs/GUIDELINES.md)**    | Reglas sobre estilo de código, tipado, estructura de la lógica de negocio y políticas de seguridad.       |
| **[Guía de Estilo de UI/UX](docs/UI-UX-GUIDELINES.md)**  | Principios y patrones para la construcción de una interfaz de usuario consistente y accesible.            |
| **[Recomendaciones (Audit)](docs/RECOMMENDATIONS.md)**   | El informe original de auditoría con las mitigaciones aplicadas, sirviendo como historial de cambios.     |
| **[Manifiesto del Producto](docs/STEERING.md)**          | Define la visión, misión y principios rectores del proyecto.                                              |

