<div align="center">

# 📚 Documentación de LoyaltyGen

**Guía completa de navegación para la documentación del proyecto**

</div>

---

## 📑 Índice de Documentación

Este directorio contiene toda la documentación técnica y funcional del proyecto LoyaltyGen. Los documentos están organizados por categorías para facilitar su consulta.

### 🎯 Por Dónde Empezar

| Si quieres... | Lee primero... |
|---------------|----------------|
| Entender qué es LoyaltyGen | [STEERING.md](./STEERING.md) - Manifiesto del Producto |
| Conocer la arquitectura técnica | [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del Sistema |
| Integrar la API | [API-DESIGN.md](./API-DESIGN.md) + [openapi.yaml](../openapi.yaml) |
| Implementar funcionalidades | [WORK-PLAN.md](../WORK-PLAN.md) - Plan de Trabajo |
| Contribuir código | [GUIDELINES.md](./GUIDELINES.md) - Directrices de Codificación |

---

## 📂 Estructura de la Documentación

### 🏛️ Documentos Fundacionales

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [STEERING.md](./STEERING.md) | Visión, misión y principios rectores del proyecto | Todos |
| [DESIGN.md](./DESIGN.md) | Registro de Decisiones de Arquitectura (ADR) | Tech Lead, Arquitectos |

### 🔧 Documentos Técnicos

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitectura del sistema, componentes y estrategias | Desarrolladores Backend |
| [API-DESIGN.md](./API-DESIGN.md) | Convenciones de API, versionado y formatos | Desarrolladores API |
| [SPECS.md](./SPECS.md) | Requisitos funcionales y no funcionales | QA, Desarrolladores |
| [GUIDELINES.md](./GUIDELINES.md) | Estilo de código, tipado y políticas | Todos los Desarrolladores |

### 🎨 Documentos de Frontend

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [UI-UX-GUIDELINES.md](./UI-UX-GUIDELINES.md) | Principios de diseño, componentes y patrones | Desarrolladores Frontend |
| [USER-STORIES.md](./USER-STORIES.md) | Historias de usuario del dashboard | Product Owner, Frontend |

### 🔍 Documentos de Referencia

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md) | Auditoría de arquitectura y recomendaciones | Tech Lead |
| [RECOMMENDATIONS.md](./RECOMMENDATIONS.md) | Informe de auditoría con mitigaciones aplicadas | Tech Lead |

---

## 🗺️ Diagramas de Arquitectura

### Arquitectura de Alto Nivel

```mermaid
graph TB
    subgraph "👤 Clientes"
        U[Usuario Admin]
        EXT[Sistema Externo]
    end

    subgraph "🌐 Firebase Hosting"
        WEB[Next.js App<br/>Dashboard Admin]
    end

    subgraph "☁️ Google Cloud Platform"
        subgraph "Firebase Services"
            AUTH[Firebase Auth<br/>JWT Tokens]
            CF[Cloud Functions<br/>Express.js API]
            FS[(Cloud Firestore<br/>Base de Datos)]
        end
        
        subgraph "Servicios Futuros"
            BQ[(BigQuery<br/>Analytics)]
            ALGOLIA[Algolia/Typesense<br/>Búsqueda]
        end
    end

    U -->|HTTPS| WEB
    EXT -->|REST API| CF
    WEB -->|Auth| AUTH
    WEB -->|API Calls| CF
    CF -->|Verify Token| AUTH
    CF -->|CRUD| FS
    FS -.->|Extension| BQ
    FS -.->|Sync| ALGOLIA

    style WEB fill:#0070f3,color:#fff
    style CF fill:#ff9800,color:#fff
    style FS fill:#4caf50,color:#fff
    style AUTH fill:#ffca28,color:#000
```

### Modelo de Datos (Firestore)

```mermaid
erDiagram
    CLIENTS ||--o{ LOYALTY_ACCOUNTS : "tiene"
    CLIENTS }o--o{ AFFINITY_GROUPS : "pertenece a"
    LOYALTY_ACCOUNTS ||--o{ TRANSACTIONS : "registra"
    AUDIT_LOGS }o--o| CLIENTS : "audita"
    AUDIT_LOGS }o--o| LOYALTY_ACCOUNTS : "audita"
    AUDIT_LOGS }o--o| TRANSACTIONS : "audita"
    AUDIT_LOGS }o--o| AFFINITY_GROUPS : "audita"

    CLIENTS {
        string id PK
        string name
        string email UK "opcional"
        map identity_document "opcional"
        map extra_data
        array affinityGroupIds FK
        map account_balances "desnormalizado"
        timestamp created_at
        timestamp updated_at
    }

    AFFINITY_GROUPS {
        string id PK
        string name
        string description
        timestamp created_at
    }

    LOYALTY_ACCOUNTS {
        string id PK
        string client_id FK
        string account_name
        int points
        timestamp created_at
        timestamp updated_at
    }

    TRANSACTIONS {
        string id PK
        string account_id FK
        enum transaction_type "credit|debit"
        int amount
        string description
        timestamp timestamp
    }

    AUDIT_LOGS {
        string id PK
        string action "tipo de accion"
        string resource_type
        string resource_id
        string client_id FK "opcional"
        string account_id FK "opcional"
        string group_id FK "opcional"
        string transaction_id FK "opcional"
        map actor "uid y email"
        map changes "before y after"
        map metadata
        timestamp timestamp
    }
```

### Flujo de Autenticación

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Usuario
    participant WEB as 🌐 Next.js App
    participant AUTH as 🔐 Firebase Auth
    participant API as ⚙️ Cloud Function
    participant FS as 💾 Firestore

    Note over U,FS: Flujo de Login y Acceso a API

    U->>WEB: 1. Ingresa credenciales
    WEB->>AUTH: 2. signInWithEmailAndPassword()
    AUTH-->>WEB: 3. ID Token (JWT)
    WEB->>WEB: 4. Almacena token en memoria
    
    Note over U,FS: Acceso a Recurso Protegido

    U->>WEB: 5. Solicita lista de clientes
    WEB->>API: 6. GET /api/v1/clients<br/>Authorization: Bearer {token}
    API->>AUTH: 7. verifyIdToken(token)
    
    alt Token Válido
        AUTH-->>API: 8a. DecodedToken {uid, email}
        API->>FS: 9. Query clientes
        FS-->>API: 10. Datos
        API-->>WEB: 11. 200 OK + {data, paging}
        WEB-->>U: 12. Muestra tabla de clientes
    else Token Inválido/Expirado
        AUTH-->>API: 8b. Error
        API-->>WEB: 401 Unauthorized
        WEB->>AUTH: Refresh token
        AUTH-->>WEB: Nuevo ID Token
        WEB->>API: Reintenta petición
    end
```

### Flujo de Transacción de Puntos (Crédito/Débito)

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Admin
    participant WEB as 🌐 Dashboard
    participant API as ⚙️ API
    participant SVC as 📦 AccountService
    participant FS as 💾 Firestore

    Note over U,FS: Acreditar 100 puntos a cuenta

    U->>WEB: Click "Acreditar"
    WEB->>API: POST /clients/{id}/accounts/{id}/credit<br/>{amount: 100, description: "Bono"}
    API->>API: Validar con Zod
    API->>SVC: credit(clientId, accountId, data)
    
    rect rgb(255, 235, 205)
        Note over SVC,FS: 🔒 TRANSACCIÓN ATÓMICA
        SVC->>FS: runTransaction()
        FS->>SVC: get(clientRef)
        FS->>SVC: get(accountRef)
        
        alt Saldo suficiente (para débito)
            SVC->>SVC: Calcular nuevo saldo
            SVC->>FS: set(transactionDoc)
            SVC->>FS: update(accountRef, {points})
            SVC->>FS: update(clientRef, {account_balances})
            FS-->>SVC: Commit exitoso
        else Saldo insuficiente (solo débito)
            SVC-->>API: throw InsufficientBalanceError
            API-->>WEB: 400 {code: "INSUFFICIENT_BALANCE"}
            WEB-->>U: Muestra error en formulario
        end
    end
    
    SVC-->>API: LoyaltyAccount actualizada
    API-->>WEB: 200 OK + cuenta actualizada
    WEB->>WEB: Actualiza UI (saldo + lista transacciones)
    WEB-->>U: Toast "Puntos acreditados"
```

### Flujo de Eliminación Asíncrona

```mermaid
stateDiagram-v2
    [*] --> SolicitudRecibida: DELETE /clients/{id}

    SolicitudRecibida --> ValidandoExistencia: Verificar cliente existe
    
    ValidandoExistencia --> ClienteNoExiste: No existe
    ClienteNoExiste --> [*]: 404 Not Found

    ValidandoExistencia --> IniciarEliminacion: Existe
    IniciarEliminacion --> ResponderAceptado: Iniciar proceso async
    ResponderAceptado --> [*]: 202 Accepted

    state "Proceso Asíncrono" as async {
        [*] --> EliminandoTransacciones
        EliminandoTransacciones --> EliminandoCuentas: Batch delete
        EliminandoCuentas --> EliminandoMemberships: Batch delete
        EliminandoMemberships --> EliminandoCliente: Actualizar grupos
        EliminandoCliente --> [*]: Delete documento
    }

    ResponderAceptado --> async: Extension Firebase
```

### Casos de Uso del Sistema

```mermaid
graph TB
    subgraph "Actores"
        ADMIN[👤 Administrador]
        API_CLIENT[🔌 Cliente API<br/>Sistema Externo]
    end

    subgraph "Gestión de Clientes"
        UC1[📋 Listar Clientes]
        UC2[➕ Crear Cliente]
        UC3[👁️ Ver Detalle Cliente]
        UC4[✏️ Editar Cliente]
        UC5[🗑️ Eliminar Cliente]
        UC6[🔍 Buscar Cliente]
    end

    subgraph "Gestión de Grupos"
        UC7[📋 Listar Grupos]
        UC8[➕ Crear Grupo]
        UC9[🔗 Asignar Cliente a Grupo]
        UC10[✂️ Desasignar Cliente]
    end

    subgraph "Gestión de Puntos"
        UC11[💳 Crear Cuenta de Lealtad]
        UC12[📋 Ver Cuentas del Cliente]
        UC13[💰 Acreditar Puntos]
        UC14[💸 Debitar Puntos]
        UC15[📊 Ver Historial Transacciones]
        UC16[💵 Consultar Saldo]
    end

    ADMIN --> UC1
    ADMIN --> UC2
    ADMIN --> UC3
    ADMIN --> UC4
    ADMIN --> UC5
    ADMIN --> UC6
    ADMIN --> UC7
    ADMIN --> UC8
    ADMIN --> UC9
    ADMIN --> UC10
    ADMIN --> UC11
    ADMIN --> UC12
    ADMIN --> UC13
    ADMIN --> UC14
    ADMIN --> UC15
    ADMIN --> UC16

    API_CLIENT --> UC2
    API_CLIENT --> UC3
    API_CLIENT --> UC13
    API_CLIENT --> UC14
    API_CLIENT --> UC16

    UC3 -.->|incluye| UC12
    UC3 -.->|incluye| UC15
    UC5 -.->|requiere| UC3
```

### Arquitectura de Capas (Backend)

```mermaid
graph TB
    subgraph "🌐 Capa de Presentación"
        REQ[HTTP Request]
        RES[HTTP Response]
    end

    subgraph "🛡️ Capa de Middleware"
        AUTH_MW[Auth Middleware<br/>Verificar JWT]
        ERR_MW[Error Middleware<br/>Formatear errores]
        RATE[Rate Limiter<br/>Límite de peticiones]
    end

    subgraph "🛣️ Capa de Rutas"
        CR[Client Routes<br/>/clients/*]
        GR[Group Routes<br/>/groups/*]
        AR[Account Routes<br/>/accounts/*]
    end

    subgraph "📦 Capa de Servicios"
        CS[ClientService]
        GS[GroupService]
        AS[AccountService]
    end

    subgraph "✅ Capa de Validación"
        ZOD[Zod Schemas<br/>Validación de datos]
    end

    subgraph "💾 Capa de Datos"
        FS[(Firestore)]
    end

    REQ --> RATE
    RATE --> AUTH_MW
    AUTH_MW --> CR
    AUTH_MW --> GR
    AUTH_MW --> AR
    
    CR --> ZOD
    GR --> ZOD
    AR --> ZOD
    
    ZOD --> CS
    ZOD --> GS
    ZOD --> AS
    
    CS --> FS
    GS --> FS
    AS --> FS
    
    CS --> ERR_MW
    GS --> ERR_MW
    AS --> ERR_MW
    
    ERR_MW --> RES

    style REQ fill:#e3f2fd
    style RES fill:#e8f5e9
    style ZOD fill:#fff3e0
    style FS fill:#fce4ec
```

### Flujo de Datos en el Frontend

```mermaid
graph LR
    subgraph Browser["🖥️ Browser"]
        subgraph NextApp["Next.js App"]
            PAGE[Page Component]
            COMP[UI Components<br/>Shadcn/ui]
            FORM[React Hook Form<br/>+ Zod]
            STATE[Zustand Store]
        end
    end

    subgraph DataFlow["🔄 Data Flow"]
        API_CLIENT[API Client<br/>fetchApi]
    end

    subgraph Backend["☁️ Backend"]
        CF[Cloud Functions]
    end

    PAGE -->|render| COMP
    COMP -->|user input| FORM
    FORM -->|validate| FORM
    FORM -->|submit| API_CLIENT
    API_CLIENT -->|HTTP| CF
    CF -->|response| API_CLIENT
    API_CLIENT -->|update| STATE
    STATE -->|notify| PAGE

    style PAGE fill:#0070f3,color:#fff
    style COMP fill:#000,color:#fff
    style STATE fill:#764abc,color:#fff
```

---

## 🔗 Referencias Rápidas

### Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/v1/clients` | Listar clientes (paginado) |
| `POST` | `/api/v1/clients` | Crear cliente |
| `GET` | `/api/v1/clients/{id}` | Obtener cliente |
| `PUT` | `/api/v1/clients/{id}` | Actualizar cliente |
| `DELETE` | `/api/v1/clients/{id}` | Eliminar cliente (async) |
| `GET` | `/api/v1/groups` | Listar grupos |
| `POST` | `/api/v1/groups` | Crear grupo |
| `POST` | `/api/v1/groups/{id}/clients/{id}` | Asignar cliente a grupo |
| `DELETE` | `/api/v1/groups/{id}/clients/{id}` | Desasignar cliente |
| `GET` | `/api/v1/clients/{id}/accounts` | Listar cuentas |
| `POST` | `/api/v1/clients/{id}/accounts` | Crear cuenta |
| `POST` | `/api/v1/clients/{id}/accounts/{id}/credit` | Acreditar puntos |
| `POST` | `/api/v1/clients/{id}/accounts/{id}/debit` | Debitar puntos |
| `GET` | `/api/v1/clients/{id}/accounts/{id}/transactions` | Historial |
| `GET` | `/api/v1/clients/{id}/balance` | Todos los saldos |

### Códigos de Error

| Código HTTP | Código de Error | Descripción |
|-------------|-----------------|-------------|
| 400 | `VALIDATION_FAILED` | Error de validación de datos |
| 400 | `INSUFFICIENT_BALANCE` | Saldo insuficiente para débito |
| 400 | `MISSING_IDENTIFIER` | Falta email o documento de identidad |
| 401 | `INVALID_TOKEN` | Token JWT inválido o expirado |
| 404 | `RESOURCE_NOT_FOUND` | Recurso no encontrado |
| 409 | `EMAIL_ALREADY_EXISTS` | Email duplicado |
| 409 | `IDENTITY_DOCUMENT_ALREADY_EXISTS` | Documento duplicado |
| 500 | `INTERNAL_SERVER_ERROR` | Error interno del servidor |

---

## 📋 Checklist de Lectura por Rol

### Para Nuevos Desarrolladores
- [ ] Leer [STEERING.md](./STEERING.md) para entender la visión
- [ ] Revisar [ARCHITECTURE.md](./ARCHITECTURE.md) para la arquitectura
- [ ] Estudiar [GUIDELINES.md](./GUIDELINES.md) para convenciones de código
- [ ] Consultar [WORK-PLAN.md](../WORK-PLAN.md) para tareas

### Para Desarrolladores Backend
- [ ] [ARCHITECTURE.md](./ARCHITECTURE.md) - Modelo de datos y servicios
- [ ] [API-DESIGN.md](./API-DESIGN.md) - Convenciones de API
- [ ] [SPECS.md](./SPECS.md) - Requisitos funcionales
- [ ] [openapi.yaml](../openapi.yaml) - Contrato de API

### Para Desarrolladores Frontend
- [ ] [UI-UX-GUIDELINES.md](./UI-UX-GUIDELINES.md) - Diseño de interfaz
- [ ] [USER-STORIES.md](./USER-STORIES.md) - Funcionalidades a implementar
- [ ] [API-DESIGN.md](./API-DESIGN.md) - Formato de respuestas

### Para Tech Lead / Arquitecto
- [ ] [DESIGN.md](./DESIGN.md) - Decisiones de arquitectura
- [ ] [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md) - Análisis de riesgos
- [ ] [RECOMMENDATIONS.md](./RECOMMENDATIONS.md) - Mitigaciones aplicadas

---

<div align="center">

**[⬅️ Volver al README Principal](../README.md)**

</div>
