# DESIGN.md - Registro de Decisiones de Arquitectura y Diseño

Este documento sirve como un registro de las decisiones clave de arquitectura y diseño (ADR - Architecture Decision Record) tomadas para el proyecto LoyaltyGen. Su propósito es documentar no solo **qué** se decidió, sino **por qué**, proporcionando contexto para futuras decisiones.

---

## 1. Decisión Arquitectónica Principal: Monolito Modular vs. Microservicios

-   **Fecha:** 2025-12-03
-   **Decisión:** Se opta por una arquitectura de "Monolito Modular Serverless" para la fase inicial, pero se diseña con la vista puesta en una futura extracción de microservicios.
-   **Contexto:** Se evaluó la posibilidad de separar los dominios. Con los nuevos requisitos de alta escalabilidad, esta decisión se ha matizado.
-   **Justificación (Rationale):**
    -   Para el MVP, el monolito modular sigue siendo la opción más rápida y simple, permitiendo una consistencia de datos atómica y un desarrollo ágil.
    -   Sin embargo, la escala de millones de usuarios valida la necesidad futura de desacoplar servicios. La arquitectura se inicia como un monolito, pero con los dominios lógicamente separados para facilitar esta evolución.
-   **Consecuencias y Futuro:**
    -   La estructura del código, organizada por dominios cohesivos, es **mandatoria** para facilitar una futura migración a microservicios.
    -   La probabilidad de que servicios de alto volumen (como el de transacciones) se extraigan a su propio microservicio es alta. El diseño actual debe considerarse una etapa de transición.
    -   Se reevaluará esta decisión al finalizar el MVP o al observar cuellos de botella reales en rendimiento o despliegue.

---

## 2. Pila Tecnológica Principal (Tech Stack)

-   **Decisión:** Se selecciona una pila tecnológica basada en TypeScript y el ecosistema de Google Cloud/Firebase, aumentada con servicios especializados para la escala cuando sea necesario.
-   **Justificación:** Ofrece un ecosistema integrado y escalable. Se complementa con servicios líderes en su categoría para tareas que superan las capacidades de la pila base.
    -   **Backend:** Express.js sobre Cloud Functions.
    -   **Base de Datos Transaccional:** Cloud Firestore.
    -   **Análisis de Datos (a futuro):** Google BigQuery.
    -   **Frontend:** Next.js, Tailwind CSS, Shadcn/ui.
    -   **Validación:** Zod.

---

## 3. Estandarización del Diseño de la API

-   **Decisión:** Se adopta la Especificación OpenAPI (`openapi.yaml`) como contrato y única fuente de verdad para el diseño de la API.
-   **Justificación:** Garantiza una DX predecible, permite el desarrollo en paralelo (frontend/backend), la generación de código y una documentación siempre sincronizada.
-   *(Referencia Completa: `openapi.yaml`)*

---

## 4. Estrategias de Seguridad y Robustez

-   **Decisión:** Se aplica un enfoque de "defensa en profundidad" en todas las capas.
-   **Justificación:** Construir un sistema resistente a fallos y ataques.
-   **Estrategias Clave:** PoLP, Rate Limiting, Logging Seguro, Autorización Multinivel (Reglas de Firestore + Lógica de Servicio), Gestión de Operaciones Asíncronas.
-   *(Referencias: `ARCHITECTURE.md`, `SPECS.md`, `GUIDELINES.md`)*

---

## 5. Filosofía de UI/UX

-   **Decisión:** Se prioriza una experiencia de usuario clara, eficiente y accesible.
-   **Justificación:** Un buen backend pierde su valor si la interfaz para administrarlo es deficiente.
-   **Principios Clave:** Accesibilidad (A11y) como principio fundamental, patrones de UX definidos para todos los estados (carga, vacío, error), y uso de capacidades de tiempo real para mejorar el feedback.
-   *(Referencia Completa: `UI-UX-GUIDELINES.md`)*

---

## 6. Decisiones de Diseño para Alta Escalabilidad

-   **Fecha:** 2025-12-03
-   **Decisión:** Se delegan las funciones de búsqueda y análisis de datos a servicios externos especializados, pero su implementación se planifica por fases para controlar costos.
-   **Contexto:** Los requisitos de soportar millones de clientes hacen que el uso exclusivo de Firestore para todas las tareas sea inviable a largo plazo.
-   **Justificación (Rationale) y Fases:**
    1.  **Búsqueda (Search):**
        -   **Fase 1 (MVP):** Para minimizar costos y complejidad en el despliegue inicial, **se decide NO implementar un servicio de búsqueda externo**. La funcionalidad de búsqueda se implementará utilizando las **capacidades de consulta nativas de Firestore** (ej. consultas `startsWith`), aceptando sus limitaciones (sensibilidad a mayúsculas, no soporta búsqueda parcial o tolerancia a typos).
        -   **Fase 2 (Post-MVP):** La arquitectura a largo plazo con un servicio dedicado como Algolia o Elasticsearch se mantiene como el objetivo. La migración se realizará cuando la escala o la necesidad de una búsqueda más avanzada lo justifiquen como una inversión necesaria.
    2.  **Análisis (Analytics):**
        -   **Fase 1 (MVP):** No se implementará la integración con BigQuery. El análisis de datos no es un requisito para la primera versión.
        -   **Fase 2 (Post-MVP):** La replicación de datos a **Google BigQuery** es la estrategia definida para cuando surja la necesidad de realizar análisis de negocio complejos.
-   **Consecuencias:** Esta decisión de faseado permite un lanzamiento más rápido y económico, al tiempo que se tiene un plan de evolución claro para la arquitectura.
-   *(Referencia Completa: `ARCHITECTURE.md`)*
