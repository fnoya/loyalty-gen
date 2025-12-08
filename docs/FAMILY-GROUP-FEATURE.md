# FAMILY-GROUP-FEATURE.md - Especificación de Círculos de Afinidad Familiares

## 1. Visión General

Esta funcionalidad permite a un cliente designar a otros clientes como parte de su **Círculo de Afinidad Familiar**, creando una estructura jerárquica donde:
- Un **Cliente Titular** (primario) gestiona el círculo
- **Clientes Asociados** (dependientes) forman parte del círculo del titular
- Las transacciones de los asociados pueden afectar las cuentas del titular según configuración

## 2. Casos de Uso

### 2.1. Escenarios de Negocio

**Escenario 1: Familia con cuenta compartida**
> María es titular de una cuenta de puntos de un supermercado. Añade a su esposo Juan y sus hijos Ana y Pedro a su círculo familiar. Cuando cualquier miembro de la familia hace compras, los puntos se acumulan en la cuenta de María.

**Escenario 2: Grupo de amigos**
> Carlos y sus tres amigos deciden compartir puntos para canjear un premio mayor. Carlos es el titular y los demás son asociados. Configuran que todos puedan acumular puntos (crédito), pero solo Carlos puede canjearlos (débito).

**Escenario 3: Empresa familiar**
> Un negocio familiar tiene una cuenta de proveedor. El dueño es el titular y sus empleados (familiares) pueden hacer pedidos que descuentan del crédito del titular, pero solo el titular puede recargar crédito.

### 2.2. Restricciones de Negocio

1. **Unicidad de Membresía**: Un cliente solo puede ser miembro de UN círculo de afinidad a la vez
2. **Jerarquía Simple**: No hay círculos anidados (un asociado no puede tener sus propios asociados)
3. **Autogestión**: Solo el titular puede añadir o remover miembros de su círculo
4. **Configuración Granular**: Las cuentas pueden configurarse independientemente para permitir/denegar créditos y débitos de asociados

## 3. Modelo de Datos

### 3.1. Estructura en Firestore

#### Colección: `clients` (extendida)

Campos adicionales en el documento de cliente:

```typescript
{
  // ... campos existentes ...
  
  // Nuevo: Información del círculo de afinidad
  familyCircle: {
    role: 'holder' | 'member' | null,  // Rol en el círculo
    holderId: string | null,            // ID del titular (null si role='holder')
    relationshipType: RelationshipType | null,  // Tipo de relación con el titular
    joinedAt: timestamp | null,         // Fecha de adhesión al círculo
  } | null,
  
  // Nuevo: Lista de miembros (solo para titulares)
  familyCircleMembers: {
    memberId: string,                   // ID del cliente miembro
    relationshipType: RelationshipType, // Tipo de relación
    addedAt: timestamp,                 // Fecha de adhesión
    addedBy: string                     // UID del usuario que lo añadió
  }[] | null  // Solo presente cuando role='holder'
}
```

#### Tipos de Relación (RelationshipType)

```typescript
enum RelationshipType {
  SPOUSE = 'spouse',           // Cónyuge
  CHILD = 'child',             // Hijo/a
  PARENT = 'parent',           // Padre/Madre
  SIBLING = 'sibling',         // Hermano/a
  FRIEND = 'friend',           // Amigo/a
  OTHER = 'other'              // Otra relación
}
```

### 3.2. Colección: `loyaltyAccounts` (extendida)

Campos adicionales en el documento de cuenta de lealtad:

```typescript
{
  // ... campos existentes ...
  
  // Nuevo: Configuración de círculo familiar
  familyCircleConfig: {
    allowMemberCredits: boolean,   // ¿Los miembros pueden generar créditos?
    allowMemberDebits: boolean,    // ¿Los miembros pueden generar débitos?
    updatedAt: timestamp,
    updatedBy: string              // UID del usuario que actualizó
  } | null  // null si la cuenta no tiene configuración específica
}
```

**Valores por defecto al crear una cuenta:**
```typescript
familyCircleConfig: {
  allowMemberCredits: true,   // Por defecto, los miembros pueden acumular puntos
  allowMemberDebits: false,   // Por defecto, solo el titular puede canjear
  updatedAt: timestamp,
  updatedBy: currentUser.uid
}
```

### 3.3. Colección: `pointTransactions` (extendida)

Campos adicionales en el documento de transacción:

```typescript
{
  // ... campos existentes ...
  
  // Nuevo: Información del originador si es miembro del círculo
  originatedBy: {
    clientId: string,              // ID del cliente que originó la transacción
    isCircleMember: boolean,       // true si es miembro del círculo, false si es el titular
    relationshipType: RelationshipType | null  // Tipo de relación con el titular
  } | null  // null para transacciones no relacionadas con círculo familiar
}
```

### 3.4. Índices Requeridos en Firestore

Para consultas eficientes, se deben crear los siguientes índices compuestos:

1. **Buscar clientes por titular:**
   - Colección: `clients`
   - Campos: `familyCircle.holderId` (ASC) + `familyCircle.joinedAt` (DESC)

2. **Buscar transacciones de círculo por cliente:**
   - Colección: `pointTransactions` (Collection Group)
   - Campos: `originatedBy.clientId` (ASC) + `timestamp` (DESC)

3. **Buscar transacciones de miembros de círculo:**
   - Colección: `pointTransactions` (Collection Group)
   - Campos: `originatedBy.isCircleMember` (ASC) + `timestamp` (DESC)

## 4. Reglas de Negocio

### 4.1. Añadir Miembro al Círculo

**Precondiciones:**
1. El cliente titular debe existir
2. El cliente a añadir debe existir
3. El cliente a añadir NO debe ser ya miembro de otro círculo
4. El cliente a añadir NO puede ser el mismo que el titular
5. El cliente a añadir NO debe estar ya en el círculo del titular

**Proceso:**
1. Verificar todas las precondiciones
2. Actualizar el documento del cliente asociado:
   - Establecer `familyCircle.role = 'member'`
   - Establecer `familyCircle.holderId = <titularId>`
   - Establecer `familyCircle.relationshipType`
   - Establecer `familyCircle.joinedAt = now()`
3. Actualizar el documento del titular:
   - Añadir entrada al array `familyCircleMembers`
4. Crear registro de auditoría con acción `FAMILY_CIRCLE_MEMBER_ADDED`

**Transacción Atómica:** Sí (pasos 2-4 deben ejecutarse en una transacción)

### 4.2. Remover Miembro del Círculo

**Precondiciones:**
1. El cliente titular debe existir
2. El cliente a remover debe existir
3. El cliente debe ser efectivamente miembro del círculo del titular

**Proceso:**
1. Verificar precondiciones
2. Actualizar el documento del cliente asociado:
   - Establecer `familyCircle = null`
3. Actualizar el documento del titular:
   - Remover entrada del array `familyCircleMembers`
4. Crear registro de auditoría con acción `FAMILY_CIRCLE_MEMBER_REMOVED`

**Transacción Atómica:** Sí (pasos 2-4)

### 4.3. Transacción de Crédito/Débito desde Miembro

**Precondiciones para Crédito:**
1. El miembro debe estar activo en el círculo
2. La cuenta del titular debe tener `allowMemberCredits = true`
3. El titular debe poseer la cuenta especificada

**Precondiciones para Débito:**
1. El miembro debe estar activo en el círculo
2. La cuenta del titular debe tener `allowMemberDebits = true`
3. El titular debe poseer la cuenta especificada
4. El saldo debe ser suficiente (solo para débito)

**Proceso:**
1. Verificar precondiciones
2. Aplicar la transacción en la cuenta del titular
3. Crear el documento de transacción con campos `originatedBy` completados
4. Actualizar el balance desnormalizado en el documento del titular
5. Crear registro de auditoría indicando que la transacción fue originada por un miembro

**Transacción Atómica:** Sí (pasos 2-5)

### 4.4. Actualizar Configuración de Cuenta

**Precondiciones:**
1. La cuenta debe existir
2. El cliente debe ser el titular de la cuenta
3. Solo se pueden modificar los campos `allowMemberCredits` y `allowMemberDebits`

**Proceso:**
1. Verificar precondiciones
2. Actualizar el campo `familyCircleConfig` de la cuenta
3. Crear registro de auditoría con acción `LOYALTY_ACCOUNT_FAMILY_CONFIG_UPDATED`

## 5. Validaciones y Errores

### 5.1. Códigos de Error

| Código | Descripción | HTTP Status |
|--------|-------------|-------------|
| `MEMBER_ALREADY_IN_CIRCLE` | El cliente ya es miembro de otro círculo | 409 Conflict |
| `CANNOT_ADD_SELF` | El titular no puede añadirse a sí mismo | 400 Bad Request |
| `MEMBER_NOT_IN_CIRCLE` | El cliente no es miembro del círculo especificado | 404 Not Found |
| `CIRCLE_CREDITS_NOT_ALLOWED` | La cuenta no permite créditos de miembros del círculo | 403 Forbidden |
| `CIRCLE_DEBITS_NOT_ALLOWED` | La cuenta no permite débitos de miembros del círculo | 403 Forbidden |
| `NOT_CIRCLE_HOLDER` | Solo el titular puede realizar esta operación | 403 Forbidden |
| `ACCOUNT_NOT_OWNED_BY_HOLDER` | La cuenta no pertenece al titular del círculo | 403 Forbidden |

### 5.2. Validación de Schemas (Zod)

#### Schema para Añadir Miembro

```typescript
const addFamilyCircleMemberSchema = z.object({
  memberId: z.string().min(1, "El ID del miembro es requerido"),
  relationshipType: z.enum([
    'spouse', 'child', 'parent', 'sibling', 'friend', 'other'
  ], {
    errorMap: () => ({ message: "Tipo de relación inválido" })
  })
});
```

#### Schema para Configuración de Cuenta

```typescript
const updateFamilyCircleConfigSchema = z.object({
  allowMemberCredits: z.boolean().optional(),
  allowMemberDebits: z.boolean().optional()
}).refine(
  data => data.allowMemberCredits !== undefined || data.allowMemberDebits !== undefined,
  { message: "Debe especificar al menos una configuración" }
);
```

## 6. Consideraciones de Seguridad

### 6.1. Autenticación y Autorización

1. **Gestión del Círculo:**
   - Solo el titular autenticado puede añadir/remover miembros de su círculo
   - Verificar que el `uid` del usuario coincida con el titular del círculo

2. **Transacciones de Miembros:**
   - El miembro autenticado puede iniciar transacciones en cuentas del titular (si permitido)
   - Verificar que el cliente autenticado sea efectivamente miembro del círculo
   - Verificar la configuración `allowMemberCredits` / `allowMemberDebits`

3. **Configuración de Cuentas:**
   - Solo el titular de la cuenta puede modificar `familyCircleConfig`
   - Verificar ownership de la cuenta antes de permitir cambios

### 6.2. Reglas de Seguridad de Firestore

```javascript
// Fragmento de reglas para el círculo familiar
match /clients/{clientId} {
  // El cliente puede leer su propia información
  allow read: if isAuthenticated() && isOwner(clientId);
  
  // Solo puede actualizar familyCircle si es el titular
  allow update: if isAuthenticated() 
    && isOwner(clientId)
    && onlyUpdatingFamilyCircleMembers();
}

match /clients/{clientId}/loyaltyAccounts/{accountId} {
  // Puede actualizar config si es el dueño de la cuenta
  allow update: if isAuthenticated()
    && isAccountOwner(clientId)
    && onlyUpdatingFamilyCircleConfig();
}

// Funciones helper
function onlyUpdatingFamilyCircleMembers() {
  let affectedKeys = request.resource.data.diff(resource.data).affectedKeys();
  return affectedKeys.hasOnly(['familyCircleMembers', 'updated_at']);
}

function onlyUpdatingFamilyCircleConfig() {
  let affectedKeys = request.resource.data.diff(resource.data).affectedKeys();
  return affectedKeys.hasOnly(['familyCircleConfig', 'updated_at']);
}
```

## 7. Política de Logging y Auditoría

### 7.1. Nuevas Acciones de Auditoría

```typescript
enum AuditAction {
  // ... acciones existentes ...
  
  // Nuevas acciones para círculo familiar
  FAMILY_CIRCLE_MEMBER_ADDED = 'FAMILY_CIRCLE_MEMBER_ADDED',
  FAMILY_CIRCLE_MEMBER_REMOVED = 'FAMILY_CIRCLE_MEMBER_REMOVED',
  LOYALTY_ACCOUNT_FAMILY_CONFIG_UPDATED = 'LOYALTY_ACCOUNT_FAMILY_CONFIG_UPDATED',
  POINTS_CREDITED_BY_CIRCLE_MEMBER = 'POINTS_CREDITED_BY_CIRCLE_MEMBER',
  POINTS_DEBITED_BY_CIRCLE_MEMBER = 'POINTS_DEBITED_BY_CIRCLE_MEMBER'
}
```

### 7.2. Estructura de Registro de Auditoría

#### Para Añadir/Remover Miembro

```typescript
{
  action: 'FAMILY_CIRCLE_MEMBER_ADDED' | 'FAMILY_CIRCLE_MEMBER_REMOVED',
  resource_type: 'family_circle',
  resource_id: holderId,  // ID del titular
  client_id: holderId,
  actor: { uid: string, email: string },
  changes: {
    before: null,  // o estado anterior del array familyCircleMembers
    after: {
      memberId: string,
      relationshipType: RelationshipType,
      addedAt: timestamp
    }
  },
  metadata: {
    member_id: memberId,
    relationship_type: relationshipType,
    description: "Cliente [nombre] añadido al círculo como [relación]"
  },
  timestamp: timestamp
}
```

#### Para Transacción de Miembro

```typescript
{
  action: 'POINTS_CREDITED_BY_CIRCLE_MEMBER' | 'POINTS_DEBITED_BY_CIRCLE_MEMBER',
  resource_type: 'transaction',
  resource_id: transactionId,
  client_id: holderId,      // ID del titular (dueño de la cuenta)
  account_id: accountId,
  transaction_id: transactionId,
  actor: { uid: string, email: string },
  changes: {
    before: { points: oldBalance },
    after: { points: newBalance }
  },
  metadata: {
    originator_client_id: memberId,  // ID del miembro que originó
    originator_name: "Nombre del Miembro",
    relationship_type: relationshipType,
    amount: number,
    description: "Crédito de 100 puntos originado por [nombre] (hijo/a)"
  },
  timestamp: timestamp
}
```

### 7.3. Logging Seguro

**NO REGISTRAR en logs de aplicación:**
- Información personal de los miembros del círculo (nombres completos, documentos)
- Solo registrar IDs de clientes

**SÍ REGISTRAR:**
- IDs de recursos (holderId, memberId, accountId)
- Tipos de relación (sin datos personales)
- Eventos de seguridad (intentos de añadir miembro ya en otro círculo)

## 8. Casos Edge y Consideraciones

### 8.1. ¿Qué pasa si el titular es eliminado?

**Estrategia:** Cascada automática
- Cuando un titular es eliminado, todos los miembros de su círculo deben ser desvinculados
- Actualizar `familyCircle = null` en todos los documentos de miembros
- Crear registros de auditoría para cada desvinculación
- Esta lógica debe estar en el proceso de eliminación asíncrona del titular

### 8.2. ¿Puede un miembro tener múltiples titulares?

**No.** La restricción de negocio establece que un cliente solo puede ser miembro de UN círculo. Si un cliente necesita ser añadido a otro círculo, primero debe ser removido del círculo actual.

### 8.3. ¿Puede un titular ser miembro de otro círculo?

**No.** Un cliente que es titular (`role = 'holder'`) no puede ser miembro de otro círculo. Los roles son mutuamente excluyentes.

### 8.4. ¿Cómo se manejan las transacciones históricas?

Las transacciones existentes antes de la implementación de círculos familiares:
- NO tienen el campo `originatedBy`
- Se interpretan como transacciones del titular
- NO se retroalimentan con información de círculo

## 9. Migración de Datos

### 9.1. Clientes Existentes

Los clientes existentes en el sistema antes de esta feature:
- Tendrán `familyCircle = null` por defecto
- Pueden optar por crear un círculo en cualquier momento
- No requieren migración forzosa

### 9.2. Cuentas de Lealtad Existentes

Las cuentas existentes:
- Tendrán `familyCircleConfig = null` por defecto
- Al realizar la primera operación relacionada con círculo, se establecerán valores por defecto:
  - `allowMemberCredits = true`
  - `allowMemberDebits = false`

### 9.3. Script de Migración (Opcional)

Si se desea establecer configuración por defecto en cuentas existentes:

```typescript
// Pseudo-código para migración
async function migrateExistingAccounts() {
  const accounts = await db.collectionGroup('loyaltyAccounts').get();
  
  const batch = db.batch();
  let count = 0;
  
  for (const accountDoc of accounts.docs) {
    const account = accountDoc.data();
    
    if (!account.familyCircleConfig) {
      batch.update(accountDoc.ref, {
        'familyCircleConfig': {
          allowMemberCredits: true,
          allowMemberDebits: false,
          updatedAt: Timestamp.now(),
          updatedBy: 'system-migration'
        },
        updated_at: Timestamp.now()
      });
      
      count++;
      
      // Firestore batch limit is 500
      if (count % 500 === 0) {
        await batch.commit();
      }
    }
  }
  
  await batch.commit();
  console.log(`Migrated ${count} accounts`);
}
```

## 10. Métricas y Monitoreo

### 10.1. Métricas a Registrar

1. **Adopción de la Feature:**
   - Número de círculos familiares creados
   - Distribución de tamaños de círculos (1-2 miembros, 3-5, 6+)
   - Tipos de relación más comunes

2. **Uso de Transacciones:**
   - % de transacciones originadas por miembros vs titulares
   - Ratio de crédito/débito en círculos
   - Configuraciones más comunes de cuentas

3. **Seguridad:**
   - Intentos de añadir miembro ya en otro círculo
   - Intentos de transacción con permisos insuficientes
   - Cambios de configuración de cuentas

### 10.2. Queries de BigQuery para Análisis

Una vez que los datos se sincronicen a BigQuery:

```sql
-- Distribución de tamaños de círculos
SELECT 
  ARRAY_LENGTH(familyCircleMembers) as circle_size,
  COUNT(*) as num_circles
FROM `loyalty-gen.firestore_export.clients`
WHERE familyCircle.role = 'holder'
GROUP BY circle_size
ORDER BY circle_size;

-- Tipos de relación más comunes
SELECT 
  member.relationshipType as relationship,
  COUNT(*) as count
FROM `loyalty-gen.firestore_export.clients`,
UNNEST(familyCircleMembers) as member
WHERE familyCircle.role = 'holder'
GROUP BY relationship
ORDER BY count DESC;

-- Transacciones por tipo de originador
SELECT 
  originatedBy.isCircleMember as is_member,
  transaction_type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount
FROM `loyalty-gen.firestore_export.pointTransactions`
WHERE originatedBy IS NOT NULL
GROUP BY is_member, transaction_type;
```

## 11. Roadmap y Futuras Mejoras

### Fase 1 (MVP) - Incluido en esta especificación
- [x] Modelo de datos básico
- [x] Añadir/remover miembros
- [x] Configuración de permisos por cuenta
- [x] Transacciones con originador
- [x] Auditoría completa

### Fase 2 (Post-MVP) - Mejoras futuras
- [ ] Límites de miembros por círculo (ej: máximo 10 miembros)
- [ ] Notificaciones a miembros cuando el titular realiza cambios
- [ ] Dashboard para el titular con estadísticas de actividad del círculo
- [ ] Transferencia de titularidad del círculo
- [ ] Aprobación de transacciones grandes por el titular
- [ ] Histórico de cambios en la composición del círculo

### Fase 3 (Avanzado) - Funcionalidades premium
- [ ] Círculos temporales con fecha de expiración
- [ ] Sub-círculos o grupos dentro del círculo principal
- [ ] Reglas de negocio personalizables por titular
- [ ] Cuotas de puntos por miembro
- [ ] Alertas automáticas de actividad sospechosa

---

**Versión del Documento:** 1.0  
**Fecha de Creación:** 2025-12-08  
**Última Actualización:** 2025-12-08  
**Autor:** Copilot (Product Owner Agent)  
**Estado:** Propuesta - Pendiente de Aprobación
