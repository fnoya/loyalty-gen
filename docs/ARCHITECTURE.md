# ARCHITECTURE.md - Arquitectura del Sistema (Stack TypeScript/Firebase)

## 1. Pila Tecnológica (Tech Stack - MVP)

-   **Lenguaje:** **TypeScript**
-   **Entorno de Ejecución:** **Node.js LTS**
-   **Framework de API:** **Express.js** sobre **Cloud Functions for Firebase**.
-   **Base de Datos Transaccional:** **Cloud Firestore**.
-   **Autenticación:** **Firebase Authentication**.
-   **Frontend Hosting:** **Firebase Hosting**.
-   **Validación de Datos:** **Zod**.
-   **Análisis de Datos (a futuro):** Google BigQuery.

## 2. Diagrama de Componentes de Alto Nivel (MVP)

```mermaid
graph TD
    subgraph "Usuario Final (Admin)"
        A[Next.js App]
    end

    subgraph "Google Cloud Platform / Firebase"
        B(Firebase Hosting)
        C{API: Cloud Function Express}
        D[DB Transaccional: Cloud Firestore]
        E[Auth: Firebase Authentication]
        I[Extensión BigQuery (futuro)]

        D --onWrite--> I;
    end

    A -->|Login| E;
    A -->|Petición HTTPS| B;
    B -->|Rewrite /api/*| C;
    
    A -->|Búsqueda/Query| C;
    C -->|Lee/Escribe (CRUD)| D;
    C -->|Verifica Token| E;
    
    I -->|Carga datos| H[Data Warehouse: BigQuery];

    style A fill:#cde4ff
    style H fill:#d5cde4
```

## 3. Estrategias para la Escalabilidad

El sistema se diseña para ser escalable, pero la implementación se realizará por fases para controlar la complejidad y los costos iniciales.

### 3.1. Estrategia de Búsqueda

-   **Problema a Largo Plazo:** Firestore no es un motor de búsqueda de texto completo, lo que limita las búsquedas sobre millones de documentos.
-   **Solución Fase 1 (MVP):** Para el lanzamiento inicial, la búsqueda de clientes se implementará utilizando las **capacidades de consulta nativas de Firestore**. Esto implica principalmente consultas de prefijo (`startsWith`) sobre campos indexados. Se aceptan las limitaciones de esta aproximación (sensibilidad a mayúsculas/minúsculas, sin tolerancia a typos).
-   **Solución Fase 2 (Post-MVP):** Cuando la base de usuarios crezca hasta un punto en que la búsqueda nativa sea insuficiente, se ejecutará la estrategia de integrar un servicio dedicado como **Algolia/Elasticsearch**. La arquitectura está diseñada para que este cambio afecte principalmente al frontend y a la adición de una función de sincronización, sin requerir una reescritura del core de la API.

### 3.2. Estrategia de Análisis de Datos (Analytics)

-   **Problema:** No es eficiente realizar agregaciones complejas sobre la base de datos transaccional en tiempo real.
-   **Solución (Fase 2 / Post-MVP):** Cuando surja la necesidad de business intelligence, se activará la sincronización de datos de Firestore a **Google BigQuery** a través de la extensión oficial de Firebase. Todas las consultas analíticas se realizarán contra BigQuery.

## 4. Modelo de Datos (Firestore)

La estructura de colecciones y subcolecciones se mantiene. La desnormalización del campo `account_balances` es **crítica** para optimizar costos y latencia.

## 5. Arquitectura de la API (Monolito Modular vs. Microservicios)

-   **Decisión Inicial:** Se mantiene el enfoque de **"monolito modular serverless"** para el MVP.
-   **Consideración de Escala:** Los requisitos de alta escalabilidad hacen probable que en el futuro sea necesario desacoplar dominios en microservicios. La arquitectura modular actual está pensada para facilitar esta transición.

*--(El resto de las secciones: Manejo de Errores, Operaciones Asíncronas, Indexación, Seguridad, etc., se mantienen como en la versión anterior.)--*

