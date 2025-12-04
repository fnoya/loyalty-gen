# STEERING.md - Manifiesto del Producto

## 1. Nombre del Proyecto

**LoyaltyGen**

## 2. Visión del Producto

Crear una plataforma de lealtad de clientes, flexible y potente, orientada 100% a ser consumida vía API (API-First). LoyaltyGen permitirá a cualquier empresa, desde startups hasta corporaciones, implementar un sistema de puntos y afinidad sin necesidad de desarrollar la lógica de negocio subyacente, acelerando así su tiempo de salida al mercado.

## 3. Misión Principal

Nuestra misión es proporcionar a los desarrolladores una API RESTful, segura, bien documentada y fácil de usar para gestionar clientes, programas de afinidad y cuentas de puntos. La plataforma debe ser robusta, escalable y mantenible.

## 4. Principios Rectores

Estos son los principios que guiarán cada decisión de desarrollo:

1.  **API-First:** Toda funcionalidad *debe* ser expuesta a través de la API REST. No existirá lógica de negocio fuera de la API. La interfaz de usuario (si se construyera en el futuro) será simplemente un cliente más de esta API.
2.  **La Experiencia del Desarrollador (DX) es Clave:** La API debe ser intuitiva y predecible. La documentación (generada automáticamente vía OpenAPI) no es un extra, es una parte fundamental del producto. Las respuestas de error deben ser claras y útiles.
3.  **Seguridad por Defecto:** La seguridad no es negociable. La API debe implementar mecanismos de autenticación y autorización robustos desde el primer día. Todo input del cliente debe ser validado rigurosamente.
4.  **Escalable y Mantenible:** La arquitectura y el código deben diseñarse pensando en el crecimiento futuro. El código debe ser limpio, modular y estar bien probado.
5.  **Convención sobre Configuración:** Adoptar las mejores prácticas y convenciones del framework elegido para minimizar la sobrecarga cognitiva y facilitar la incorporación de nuevos desarrolladores (o IAs) al proyecto.

## 5. Métricas de Éxito para la Primera Versión (MVP)

-   **Cobertura de API del 100%:** Todas las funcionalidades descritas en `SPECS.md` están implementadas y accesibles a través de endpoints REST.
-   **Documentación Válida:** El sistema genera un `openapi.json` válido y navegable a través de una UI (Swagger/Redoc).
-   **Ciclo de Vida Completo:** Un desarrollador externo puede crear un cliente, asignarlo a un grupo, crearle una cuenta de puntos, acreditar y debitar puntos, y finalmente eliminarlo, todo a través de la API.
-   **Seguridad Funcional:** Los endpoints protegidos no pueden ser accedidos sin un token de autenticación válido.

---

## 6. Gobernanza del Proyecto

Para asegurar que el proyecto evolucione de manera coherente y alineada con la visión, se establece el siguiente marco de gobernanza.

### a. Roles y Responsabilidades

-   **Product Owner (Dueño del Producto):**
    -   Responsable de definir la visión del producto y el roadmap.
    -   Prioriza las funcionalidades y los requisitos.
    -   Es la voz final sobre qué se construye y en qué orden.

-   **Tech Lead (Líder Técnico) / Arquitecto de Soluciones:**
    -   Responsable de la visión técnica y la arquitectura del sistema.
    -   Asegura que la implementación se adhiera a los principios rectores y a las guías de arquitectura y codificación.
    -   Toma la decisión final sobre asuntos técnicos, tecnológicos y de arquitectura.
    -   Es responsable de la calidad y mantenibilidad del código.

-   **Equipo de Desarrollo (Agente de IA y supervisores):**
    -   Responsable de implementar las funcionalidades de acuerdo a las especificaciones y guías.
    -   Realiza el desarrollo, las pruebas y la documentación técnica.

### b. Proceso de Toma de Decisiones

-   **Cambios Arquitectónicos Mayores:** Cualquier cambio que altere fundamentalmente la pila tecnológica o la arquitectura (descrita en `ARCHITECTURE.md`) debe ser propuesto al Tech Lead. La decisión final requiere su aprobación explícita.
-   **Nuevas Funcionalidades:** Las propuestas de nuevas funcionalidades deben ser presentadas al Product Owner, quien evaluará su alineación con el roadmap y las priorizará.
-   **Resolución de Conflictos:** Si surge un desacuerdo técnico, el Tech Lead tiene la última palabra. Si el conflicto es sobre la prioridad o el alcance funcional, la decisión final recae en el Product Owner.
