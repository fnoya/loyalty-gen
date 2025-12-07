# Especificación Funcional: Campos Adicionales en Cliente

## 1. Resumen Ejecutivo

Esta especificación define las ampliaciones al modelo de datos de Cliente para soportar información más completa y estructurada, incluyendo nombres desagregados, foto de perfil, múltiples números telefónicos y direcciones físicas.

## 2. Objetivos

1. **Estructurar el nombre del cliente** en componentes individuales (primer nombre, segundo nombre, primer apellido, segundo apellido) para permitir un tratamiento más flexible de los datos personales.
2. **Soportar foto de perfil opcional** almacenada en Firebase Storage para mejorar la experiencia visual y personalización.
3. **Soportar múltiples números telefónicos** por cliente, cada uno con su tipo (móvil, casa, trabajo, otro).
4. **Soportar múltiples direcciones físicas** por cliente, con todos los campos necesarios para direcciones completas y precisas.
5. **Mantener compatibilidad** con el campo `extra_data` existente para datos adicionales en formato clave-valor.

## 3. Modelo de Datos Actualizado

### 3.1. Estructura del Nombre

El campo `name` (string simple) se reemplaza por un objeto estructurado `name` con los siguientes campos:

```typescript
name: {
  firstName: string;          // Primer Nombre (obligatorio)
  secondName?: string;         // Segundo Nombre (opcional)
  firstLastName: string;       // Primer Apellido (obligatorio)
  secondLastName?: string;     // Segundo Apellido (opcional)
}
```

**Validaciones:**
- `firstName`: Obligatorio, mínimo 1 carácter, máximo 50 caracteres, solo letras, espacios, guiones y apóstrofes.
- `secondName`: Opcional, máximo 50 caracteres, solo letras, espacios, guiones y apóstrofes.
- `firstLastName`: Obligatorio, mínimo 1 carácter, máximo 50 caracteres, solo letras, espacios, guiones y apóstrofes.
- `secondLastName`: Opcional, máximo 50 caracteres, solo letras, espacios, guiones y apóstrofes.

**Razón del Cambio:**
- Permite personalización de comunicaciones (ej. "Estimado/a Juan" vs "Estimado/a Sr. Pérez")
- Facilita ordenamiento y búsqueda por apellidos
- Cumple con requisitos legales en muchos países latinoamericanos donde es común tener dos apellidos
- Soporta formatos de nombre internacionales

### 3.2. Foto de Perfil

Nuevo campo `photoUrl` de tipo string opcional que almacena la URL de la foto de perfil del cliente.

```typescript
photoUrl?: string | null;  // URL de la foto en Firebase Storage (opcional)
```

**Validaciones:**
- El campo es completamente opcional (puede ser `null` o ausente)
- Si está presente, debe ser una URL válida (formato URI)
- La URL debe apuntar a Firebase Storage (se valida en el backend)
- Formatos de imagen soportados: JPEG, PNG, WEBP
- Tamaño máximo del archivo: 5 MB
- Dimensiones recomendadas: 512x512 píxeles (aspecto cuadrado preferido)

**Características:**
- **Opcional por diseño:** Si no hay foto, la UI debe mostrar un placeholder (avatar genérico con iniciales del cliente)
- **Almacenamiento externo:** Las fotos se almacenan en Firebase Storage, no se codifican en Base64 en Firestore
- **URL pública:** La URL incluye un token de seguridad de Firebase que permite acceso público controlado
- **Gestión del ciclo de vida:** 
  - Al subir una nueva foto, la anterior se elimina automáticamente de Storage
  - Al eliminar un cliente, su foto también se elimina de Storage
  - Al eliminar la foto explícitamente, el campo se establece en `null`

**Endpoints API:**
- `POST /api/v1/clients/{client_id}/photo` - Subir o actualizar foto (multipart/form-data)
- `DELETE /api/v1/clients/{client_id}/photo` - Eliminar foto

**Ejemplo de Respuesta:**
```json
{
  "id": "client-123",
  "name": {
    "firstName": "Juan",
    "firstLastName": "Pérez"
  },
  "photoUrl": "https://firebasestorage.googleapis.com/v0/b/project-id.appspot.com/o/client-photos%2Fclient-123%2F1234567890_profile.jpg?alt=media&token=abc123",
  "email": "juan.perez@example.com",
  ...
}
```

**Razón del Cambio:**
- Mejora la experiencia visual de la aplicación y facilita la identificación de clientes
- Permite personalización de la interfaz con información visual del cliente
- Soporta casos de uso donde se requiere verificación visual de identidad
- Es opcional para no imponer requerimientos adicionales en el proceso de creación de clientes

### 3.3. Números Telefónicos

Nuevo campo `phones` como array de objetos:

```typescript
phones: Array<{
  type: "mobile" | "home" | "work" | "other";  // Tipo de teléfono
  number: string;                                // Número en formato E.164 preferido
  extension?: string;                            // Extensión (opcional)
  isPrimary: boolean;                            // Indica si es el teléfono principal
}>
```

**Validaciones:**
- El array puede estar vacío (0 teléfonos)
- `type`: Uno de los valores permitidos: "mobile", "home", "work", "other"
- `number`: Obligatorio, mínimo 7 caracteres, máximo 20 caracteres, formato recomendado E.164 (+código_país número)
- `extension`: Opcional, máximo 10 caracteres, solo dígitos
- `isPrimary`: Booleano obligatorio
- **Regla de negocio:** Solo puede haber un teléfono con `isPrimary: true`. Si se marca uno como primario, los demás deben marcarse como `isPrimary: false` automáticamente.

**Ejemplos:**
```json
{
  "phones": [
    {
      "type": "mobile",
      "number": "+598 99 123 456",
      "isPrimary": true
    },
    {
      "type": "work",
      "number": "+598 2 123 4567",
      "extension": "1234",
      "isPrimary": false
    }
  ]
}
```

### 3.4. Direcciones

Nuevo campo `addresses` como array de objetos:

```typescript
addresses: Array<{
  type: "home" | "work" | "other";     // Tipo de dirección
  street: string;                       // Calle
  buildingBlock?: string;               // Edificio, Manzana, etc.
  number: string;                       // Número
  apartment?: string;                   // Apartamento/Depto/Unidad
  locality: string;                     // Localidad/Ciudad
  state: string;                        // Departamento/Provincia/Estado
  postalCode: string;                   // Código Postal
  country: string;                      // País (código ISO 3166-1 alpha-2)
  isPrimary: boolean;                   // Indica si es la dirección principal
}>
```

**Validaciones:**
- El array puede estar vacío (0 direcciones)
- `type`: Uno de los valores permitidos: "home", "work", "other"
- `street`: Obligatorio, máximo 100 caracteres
- `buildingBlock`: Opcional, máximo 50 caracteres
- `number`: Obligatorio, máximo 20 caracteres
- `apartment`: Opcional, máximo 20 caracteres
- `locality`: Obligatorio, máximo 100 caracteres
- `state`: Obligatorio, máximo 100 caracteres
- `postalCode`: Obligatorio, máximo 20 caracteres
- `country`: Obligatorio, código ISO 3166-1 alpha-2 (2 caracteres), ej: "UY", "AR", "BR", "US"
- `isPrimary`: Booleano obligatorio
- **Regla de negocio:** Solo puede haber una dirección con `isPrimary: true`. Si se marca una como primaria, las demás deben marcarse como `isPrimary: false` automáticamente.

**Ejemplos:**
```json
{
  "addresses": [
    {
      "type": "home",
      "street": "Av. 18 de Julio",
      "number": "1234",
      "apartment": "301",
      "locality": "Montevideo",
      "state": "Montevideo",
      "postalCode": "11200",
      "country": "UY",
      "isPrimary": true
    },
    {
      "type": "work",
      "street": "Bulevar Artigas",
      "buildingBlock": "Torre Ejecutiva",
      "number": "5678",
      "locality": "Montevideo",
      "state": "Montevideo",
      "postalCode": "11300",
      "country": "UY",
      "isPrimary": false
    }
  ]
}
```

### 3.5. Campo extra_data (Sin cambios)

El campo `extra_data` se mantiene sin cambios como un objeto flexible para almacenar datos adicionales en formato clave-valor:

```typescript
extra_data: Record<string, unknown>
```

## 4. Modelo Completo de Cliente (Actualizado)

```typescript
Client {
  id: string;                    // ID único generado por Firestore
  name: {                        // CAMBIADO: De string a objeto
    firstName: string;
    secondName?: string;
    firstLastName: string;
    secondLastName?: string;
  };
  email?: string | null;         // Opcional si se proporciona identity_document
  identity_document?: {          // Opcional si se proporciona email
    type: "cedula_identidad" | "pasaporte";
    number: string;
  } | null;
  phones: Array<{                // NUEVO
    type: "mobile" | "home" | "work" | "other";
    number: string;
    extension?: string;
    isPrimary: boolean;
  }>;
  addresses: Array<{             // NUEVO
    type: "home" | "work" | "other";
    street: string;
    buildingBlock?: string;
    number: string;
    apartment?: string;
    locality: string;
    state: string;
    postalCode: string;
    country: string;
    isPrimary: boolean;
  }>;
  extra_data: Record<string, unknown>;
  affinityGroupIds: string[];
  account_balances: Record<string, number>;  // Campo desnormalizado
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

## 5. Impacto en la API

### 5.1. POST /clients (Crear Cliente)

**Request Body Actualizado:**
```json
{
  "name": {
    "firstName": "Juan",
    "secondName": "Carlos",
    "firstLastName": "Pérez",
    "secondLastName": "González"
  },
  "email": "juan.perez@example.com",
  "identity_document": {
    "type": "cedula_identidad",
    "number": "12345678"
  },
  "phones": [
    {
      "type": "mobile",
      "number": "+598 99 123 456",
      "isPrimary": true
    }
  ],
  "addresses": [
    {
      "type": "home",
      "street": "Av. 18 de Julio",
      "number": "1234",
      "apartment": "301",
      "locality": "Montevideo",
      "state": "Montevideo",
      "postalCode": "11200",
      "country": "UY",
      "isPrimary": true
    }
  ],
  "extra_data": {
    "preferredLanguage": "es",
    "birthDate": "1990-01-15"
  }
}
```

**Validaciones Adicionales:**
- Validar que al menos `firstName` y `firstLastName` estén presentes en `name`
- Validar formato de números telefónicos
- Validar códigos de país ISO 3166-1 alpha-2
- Validar que solo haya un teléfono y una dirección con `isPrimary: true`

### 5.2. PUT /clients/{client_id} (Actualizar Cliente)

**Cambios:**
- Se permite actualizar el objeto `name` completo o campos individuales
- Se permite actualizar arrays `phones` y `addresses` completos
- Al actualizar `phones` o `addresses`, se debe validar la regla de `isPrimary`

**Request Body Ejemplo (Actualización Parcial):**
```json
{
  "name": {
    "secondName": "José"
  },
  "phones": [
    {
      "type": "mobile",
      "number": "+598 99 999 999",
      "isPrimary": true
    }
  ]
}
```

### 5.3. GET /clients y GET /clients/{client_id}

**Respuesta Actualizada:**
Los endpoints de consulta devolverán el modelo completo actualizado con todos los campos nuevos.

## 6. Consideraciones de Seguridad y Privacidad

### 6.1. Datos Sensibles (PII)

Los nuevos campos contienen **Información Personal Identificable (PII)** y deben tratarse con las máximas medidas de seguridad:

1. **Teléfonos y Direcciones:** Son datos sensibles que pueden usarse para identificar a una persona.
2. **Logging:** **NUNCA** registrar números telefónicos ni direcciones completas en logs.
3. **Auditoría:** Los registros de auditoría deben incluir estos campos en `changes.before` y `changes.after`, pero deben estar protegidos con permisos restrictivos.

### 6.2. Validación y Sanitización

- Validar todos los campos contra patrones seguros para prevenir inyección de código
- Sanitizar entradas de usuario antes de almacenar
- Usar expresiones regulares estrictas para validar formatos

### 6.3. Firestore Security Rules

Actualizar las reglas de seguridad para proteger el acceso a estos campos sensibles:

```javascript
match /clients/{clientId} {
  allow read, write: if request.auth != null && isAuthorizedUser(request.auth.uid);
  
  function isAuthorizedUser(uid) {
    // Solo usuarios autenticados con rol adecuado
    return exists(/databases/$(database)/documents/users/$(uid));
  }
}
```

## 7. Índices de Firestore Necesarios

Para soportar búsquedas eficientes:

1. **Índice compuesto para búsqueda por apellidos:**
   - `name.firstLastName` (ASC) + `created_at` (DESC)
   - `name.secondLastName` (ASC) + `created_at` (DESC)

2. **Índice para teléfono primario:**
   - `phones.number` (cuando `phones.isPrimary == true`)

3. **Índice para dirección primaria:**
   - `addresses.locality` + `addresses.state` (para búsquedas geográficas)

## 8. Migraciones de Datos

### 8.1. Estrategia de Migración

Para clientes existentes con el campo `name` como string:

1. **Migración Automática en Lectura (Lazy Migration):**
   - Al leer un cliente antiguo, detectar si `name` es string
   - Si es string, parsear usando heurística simple: "Nombre Apellido" → `{firstName: "Nombre", firstLastName: "Apellido"}`
   - Al actualizar el cliente, convertir al nuevo formato

2. **Script de Migración Batch (Recomendado):**
   - Crear script que lea todos los clientes
   - Parsear el campo `name` usando lógica de detección de nombres/apellidos
   - Actualizar documentos con el nuevo formato
   - Inicializar arrays `phones` y `addresses` como vacíos `[]`

### 8.2. Formato de Migración

```typescript
// Antes
{
  name: "Juan Pérez"
}

// Después
{
  name: {
    firstName: "Juan",
    firstLastName: "Pérez"
  },
  phones: [],
  addresses: []
}
```

## 9. Impacto en Auditoría

Los registros de auditoría deben capturar cambios en los nuevos campos:

```json
{
  "action": "CLIENT_UPDATED",
  "changes": {
    "before": {
      "name": {
        "firstName": "Juan",
        "firstLastName": "Pérez"
      },
      "phones": []
    },
    "after": {
      "name": {
        "firstName": "Juan",
        "secondName": "Carlos",
        "firstLastName": "Pérez"
      },
      "phones": [
        {
          "type": "mobile",
          "number": "+598 99 123 456",
          "isPrimary": true
        }
      ]
    }
  }
}
```

## 10. Criterios de Aceptación

- [x] El modelo de datos de Cliente incluye los campos `name` (estructurado), `phones` y `addresses`
- [ ] Los schemas Zod validan correctamente todos los campos nuevos
- [ ] La API acepta y devuelve el formato actualizado en todos los endpoints
- [ ] Las validaciones de `isPrimary` funcionan correctamente
- [ ] Los códigos de país se validan contra ISO 3166-1 alpha-2
- [ ] Los números de teléfono aceptan formato E.164
- [ ] La documentación OpenAPI refleja los cambios
- [ ] Los documentos ARCHITECTURE.md y SPECS.md están actualizados
- [ ] Se han definido los índices necesarios de Firestore
- [ ] Las consideraciones de seguridad están documentadas

## 11. Referencias

- ISO 3166-1 alpha-2: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
- E.164 (Formato internacional de teléfonos): https://en.wikipedia.org/wiki/E.164
- `docs/ARCHITECTURE.md` - Modelo de datos
- `docs/SPECS.md` - Especificaciones funcionales
- `docs/API-DESIGN.md` - Convenciones de API
- `openapi.yaml` - Contrato de API
