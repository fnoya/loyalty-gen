# FAMILY-GROUP-WORK-PLAN.md - Plan de Trabajo Detallado para Desarrolladores

## 1. Resumen Ejecutivo

Este documento describe el plan de trabajo detallado para implementar la funcionalidad de **Círculos de Afinidad Familiares** en la plataforma LoyaltyGen.

### 1.1. Objetivos

- Permitir que un cliente titular cree un círculo de afinidad familiar
- Añadir/remover clientes asociados (miembros) al círculo
- Categorizar relaciones familiares (cónyuge, hijo, padre, hermano, amigo, otro)
- Configurar permisos por cuenta para transacciones de miembros
- Registrar el originador de cada transacción para auditoría completa

### 1.2. Alcance

✅ **Incluido en esta fase:**
- Modelo de datos completo en Firestore
- Endpoints API para gestión del círculo
- Endpoints para configuración de cuentas
- Extensión de endpoints de transacciones
- Sistema de auditoría actualizado
- Validaciones de negocio y seguridad
- Tests unitarios e integración
- Documentación OpenAPI

❌ **Excluido (futuras fases):**
- Interface de usuario (UI/Frontend)
- Notificaciones automáticas a miembros
- Dashboard de estadísticas del círculo
- Límites configurables de miembros
- Transferencia de titularidad
- Círculos temporales

### 1.3. Dependencias

⚠️ **IMPORTANTE: Este plan asume que el proyecto base está implementado.**

**Requisitos previos:**
- ✅ Backend con Express y Firebase Functions
- ✅ Sistema de autenticación con Firebase Auth
- ✅ Endpoints básicos de clientes, cuentas y transacciones
- ✅ Sistema de auditoría base
- ✅ Middleware de validación con Zod

**Si el proyecto no está implementado**, primero se debe completar el **WORK-PLAN.md** base del repositorio antes de abordar esta feature.

---

## 2. Épicas y Tareas

Se han identificado 5 épicas principales con 13 tareas específicas.

### 📋 Resumen de Épicas

| Épica | Tareas | Estimación | Prioridad |
|-------|--------|------------|-----------|
| Épica 1: Modelo de Datos | 3 | 8 horas | Alta |
| Épica 2: Servicios | 2 | 16 horas | Alta |
| Épica 3: API | 3 | 12 horas | Alta |
| Épica 4: Testing | 2 | 12 horas | Alta |
| Épica 5: Documentación | 3 | 4 horas | Media |
| **TOTAL** | **13 tareas** | **~52 horas** | - |

---

### Épica 1: Modelo de Datos y Schemas

**Objetivo:** Establecer el modelo de datos en Firestore y los schemas de validación de Zod.

#### Tarea 1.1: Extender Schema de Cliente

**Dependencias:** Ninguna

**Documentos de Referencia:**
- `docs/FAMILY-GROUP-FEATURE.md` - Sección 3.1
- `docs/FAMILY-GROUP-API-SPEC.md` - Sección 3
- `docs/GUIDELINES.md` - Sección 3 (Zod como única fuente de verdad)

**Archivos a Crear/Modificar:**
```
functions/src/schemas/
├── familyCircle.schema.ts      [CREAR]
├── client.schema.ts            [MODIFICAR]
```

**Criterios de Aceptación:**
- [ ] El archivo `familyCircle.schema.ts` existe y compila sin errores
- [ ] Todos los tipos están correctamente inferidos con `z.infer<>`
- [ ] El schema `client.schema.ts` incluye los nuevos campos
- [ ] Los schemas validan correctamente casos válidos e inválidos
- [ ] El código pasa el linter sin errores

**Ver:** `FAMILY-GROUP-API-SPEC.md` Sección 3 para código completo de schemas.

---

#### Tarea 1.2: Extender Schemas de Account y Transaction

**Dependencias:** Tarea 1.1 completada

**Documentos de Referencia:**
- `docs/FAMILY-GROUP-FEATURE.md` - Secciones 3.2 y 3.3
- `docs/FAMILY-GROUP-API-SPEC.md` - Sección 3

**Archivos a Modificar:**
```
functions/src/schemas/
├── account.schema.ts           [MODIFICAR]
├── transaction.schema.ts       [MODIFICAR]
```

**Criterios de Aceptación:**
- [ ] Los schemas compilan sin errores
- [ ] Los tipos TypeScript están correctamente actualizados
- [ ] El código pasa el linter

---

#### Tarea 1.3: Crear Índices de Firestore

**Dependencias:** Tarea 1.1 y 1.2 completadas

**Documentos de Referencia:**
- `docs/FAMILY-GROUP-FEATURE.md` - Sección 3.4

**Archivos a Crear/Modificar:**
```
firestore.indexes.json          [CREAR o MODIFICAR]
```

**Instrucciones:**

1. Crear índice para buscar miembros por titular
2. Crear índice para transacciones de círculo
3. Desplegar con `firebase deploy --only firestore:indexes`

**Criterios de Aceptación:**
- [ ] El archivo `firestore.indexes.json` existe y es válido
- [ ] Los índices se despliegan correctamente en Firestore
- [ ] Las consultas con estos índices funcionan sin errores

**Ver:** `FAMILY-GROUP-WORK-PLAN.md` (versión extendida) para código completo de índices.

---

### Épica 2: Capa de Servicios (Lógica de Negocio)

**Objetivo:** Implementar la lógica de negocio para gestión del círculo familiar.

#### Tarea 2.1: Crear Servicio de Círculo Familiar

**Dependencias:** Épica 1 completada

**Documentos de Referencia:**
- `docs/FAMILY-GROUP-FEATURE.md` - Sección 4 (Reglas de Negocio)
- `docs/FAMILY-GROUP-API-SPEC.md` - Sección 5.1 (Flujos)

**Archivos a Crear/Modificar:**
```
functions/src/services/
├── familyCircle.service.ts     [CREAR]
functions/src/core/
├── errors.ts                   [MODIFICAR]
```

**Métodos a Implementar:**
- `addMemberToCircle()` - Añadir miembro al círculo
- `removeMemberFromCircle()` - Remover miembro del círculo
- `getFamilyCircleMembers()` - Listar miembros
- `updateAccountFamilyCircleConfig()` - Actualizar configuración de cuenta
- `validateMemberCanCredit()` - Validar permisos de crédito
- `validateMemberCanDebit()` - Validar permisos de débito

**Criterios de Aceptación:**
- [ ] El servicio compila sin errores
- [ ] Todas las funciones tienen tipos correctos
- [ ] Las transacciones atómicas funcionan correctamente
- [ ] Los errores se lanzan apropiadamente
- [ ] El código pasa el linter

**Ver:** `FAMILY-GROUP-API-SPEC.md` Sección 8 para resumen de cambios por archivo.

---

#### Tarea 2.2: Extender Servicio de Cuentas

**Dependencias:** Tarea 2.1 completada

**Documentos de Referencia:**
- `docs/FAMILY-GROUP-FEATURE.md` - Sección 4.3
- `docs/FAMILY-GROUP-API-SPEC.md` - Secciones 2.1 y 2.2

**Archivos a Modificar:**
```
functions/src/services/
├── account.service.ts          [MODIFICAR]
```

**Cambios Requeridos:**
- Añadir parámetro opcional `onBehalfOf` a `creditPoints()`
- Añadir parámetro opcional `onBehalfOf` a `debitPoints()`
- Validar permisos de círculo antes de ejecutar transacción
- Incluir campo `originatedBy` en transacciones
- Actualizar acciones de auditoría según originador

**Criterios de Aceptación:**
- [ ] Los métodos aceptan parámetro `onBehalfOf` opcional
- [ ] Se validan permisos correctamente
- [ ] El campo `originatedBy` se incluye en transacciones
- [ ] Las acciones de auditoría cambian según el originador
- [ ] El código pasa el linter

---

### Épica 3: Controladores y Rutas API

**Objetivo:** Implementar los controladores HTTP y rutas Express para los nuevos endpoints.

#### Tarea 3.1: Crear Controlador de Círculo Familiar

**Dependencias:** Épica 2 completada

**Documentos de Referencia:**
- `docs/FAMILY-GROUP-API-SPEC.md` - Secciones 1 y 4

**Archivos a Crear:**
```
functions/src/api/controllers/
├── familyCircle.controller.ts  [CREAR]
```

**Controladores a Implementar:**
- `getFamilyCircleInfo()` - GET /clients/:id/family-circle
- `listFamilyCircleMembers()` - GET /clients/:id/family-circle/members
- `addFamilyCircleMember()` - POST /clients/:id/family-circle/members
- `removeFamilyCircleMember()` - DELETE /clients/:id/family-circle/members/:memberId
- `updateFamilyCircleAccountConfig()` - PATCH /clients/:id/accounts/:accountId/family-circle-config
- `getFamilyCircleAccountConfig()` - GET /clients/:id/accounts/:accountId/family-circle-config

**Criterios de Aceptación:**
- [ ] Todos los controladores manejan errores correctamente
- [ ] Los controladores son "thin" (sin lógica de negocio)
- [ ] Las respuestas siguen el formato de la API
- [ ] El código pasa el linter

---

#### Tarea 3.2: Crear Rutas de Círculo Familiar

**Dependencias:** Tarea 3.1 completada

**Archivos a Crear:**
```
functions/src/api/routes/
├── familyCircle.routes.ts      [CREAR]
```

**Criterios de Aceptación:**
- [ ] Todas las rutas están correctamente definidas
- [ ] Los middlewares se aplican en el orden correcto
- [ ] Las rutas se integran en el app principal

**Ver:** `FAMILY-GROUP-API-SPEC.md` Sección 4.1 para código completo de rutas.

---

#### Tarea 3.3: Modificar Controlador y Rutas de Cuentas

**Dependencias:** Tarea 2.2 completada

**Archivos a Modificar:**
```
functions/src/api/controllers/
├── accounts.controller.ts      [MODIFICAR]
functions/src/api/routes/
├── accounts.routes.ts          [MODIFICAR]
```

**Cambios Requeridos:**
- Extraer query parameter `on_behalf_of` en controladores de crédito/débito
- Pasar el parámetro a los servicios
- Documentar el nuevo query parameter en comentarios

**Criterios de Aceptación:**
- [ ] Los controladores extraen `on_behalf_of` del query string
- [ ] Los controladores pasan el parámetro al servicio
- [ ] El código pasa el linter

---

### Épica 4: Testing y Validación

**Objetivo:** Escribir tests completos para la nueva funcionalidad.

#### Tarea 4.1: Tests Unitarios de Servicios

**Dependencias:** Épica 2 completada

**Archivos a Crear:**
```
functions/src/services/__tests__/
├── familyCircle.service.test.ts    [CREAR]
```

**Tests a Implementar:**

**addMemberToCircle():**
- ✅ Añade miembro correctamente cuando validaciones pasan
- ✅ Lanza error si miembro ya está en otro círculo
- ✅ Lanza error si se intenta añadir al mismo titular
- ✅ Lanza error si el tipo de relación es inválido

**removeMemberFromCircle():**
- ✅ Remueve miembro correctamente
- ✅ Lanza error si miembro no está en el círculo

**validateMemberCanCredit/Debit():**
- ✅ Retorna true cuando permisos son correctos
- ✅ Lanza error cuando permisos no son suficientes

**Criterios de Aceptación:**
- [ ] Cobertura de tests > 80% en servicios
- [ ] Todos los tests pasan
- [ ] Tests cubren casos de éxito y error

**Ver:** `FAMILY-GROUP-API-SPEC.md` Sección 6.1 para casos de prueba detallados.

---

#### Tarea 4.2: Tests de Integración de Endpoints

**Dependencias:** Épica 3 completada

**Archivos a Crear:**
```
functions/src/api/__tests__/
├── familyCircle.integration.test.ts    [CREAR]
```

**Endpoints a Testear:**
- POST /clients/:id/family-circle/members
- DELETE /clients/:id/family-circle/members/:memberId
- POST /clients/:id/accounts/:accountId/credit?on_behalf_of=:memberId
- POST /clients/:id/accounts/:accountId/debit?on_behalf_of=:memberId
- PATCH /clients/:id/accounts/:accountId/family-circle-config

**Criterios de Aceptación:**
- [ ] Todos los endpoints tienen tests de integración
- [ ] Tests cubren casos de éxito y error
- [ ] Todos los tests pasan

**Ver:** `FAMILY-GROUP-API-SPEC.md` Sección 6.2 para casos de prueba de integración.

---

### Épica 5: Documentación y Finalización

**Objetivo:** Actualizar documentación y preparar para despliegue.

#### Tarea 5.1: Actualizar OpenAPI Spec

**Dependencias:** Épica 3 completada

**Archivos a Modificar:**
```
openapi.yaml                    [MODIFICAR]
```

**Cambios Requeridos:**
- Añadir definiciones de nuevos endpoints bajo tag "Family Circle"
- Añadir schemas: RelationshipType, FamilyCircleMember, FamilyCircleConfig, etc.
- Actualizar schemas existentes (Client, LoyaltyAccount, Transaction)
- Añadir códigos de error nuevos

**Criterios de Aceptación:**
- [ ] Todos los nuevos endpoints están documentados
- [ ] Todos los schemas están definidos
- [ ] El archivo YAML es válido
- [ ] La documentación es clara y completa

**Ver:** `FAMILY-GROUP-API-SPEC.md` Sección 7 para fragmentos de OpenAPI.

---

#### Tarea 5.2: Actualizar ARCHITECTURE.md

**Dependencias:** Ninguna (puede hacerse en paralelo)

**Archivos a Modificar:**
```
docs/ARCHITECTURE.md            [MODIFICAR]
```

**Cambios Requeridos:**
- Actualizar Sección 4 (Modelo de Datos):
  - Añadir campos `familyCircle` y `familyCircleMembers` a `clients`
  - Añadir campo `familyCircleConfig` a `loyaltyAccounts`
  - Añadir campo `originatedBy` a `pointTransactions`
- Actualizar Sección 4.2 (Auditoría):
  - Añadir nuevas acciones de auditoría

**Criterios de Aceptación:**
- [ ] El modelo de datos está actualizado
- [ ] La documentación es clara

---

#### Tarea 5.3: Actualizar SPECS.md

**Dependencias:** Ninguna (puede hacerse en paralelo)

**Archivos a Modificar:**
```
docs/SPECS.md                   [MODIFICAR]
```

**Cambios Requeridos:**
- Añadir nueva sección "Módulo de Círculo Familiar"
- Documentar endpoints nuevos y modificados
- Especificar validaciones y códigos de error

**Criterios de Aceptación:**
- [ ] Los endpoints están documentados
- [ ] Los requisitos funcionales están claros

---

## 3. Checklist de Validación Final

Antes de considerar la feature completa, verificar:

### ✅ Backend
- [ ] Todos los schemas de Zod están creados y validan correctamente
- [ ] Los índices de Firestore están desplegados
- [ ] El servicio `familyCircleService` está implementado y testeado
- [ ] El servicio `accountService` está extendido correctamente
- [ ] Todos los controladores están implementados
- [ ] Todas las rutas están definidas y funcionan
- [ ] Los middlewares de validación y auth funcionan

### ✅ Testing
- [ ] Tests unitarios de servicios pasan (cobertura > 80%)
- [ ] Tests de integración de endpoints pasan
- [ ] Tests de validación de schemas pasan
- [ ] Tests de errores y edge cases pasan

### ✅ Documentación
- [ ] `openapi.yaml` actualizado y válido
- [ ] `ARCHITECTURE.md` actualizado
- [ ] `SPECS.md` actualizado
- [ ] `FAMILY-GROUP-FEATURE.md` creado
- [ ] `FAMILY-GROUP-API-SPEC.md` creado
- [ ] `FAMILY-GROUP-WORK-PLAN.md` creado (este documento)

### ✅ Seguridad
- [ ] Reglas de Firestore actualizadas para círculo familiar
- [ ] Validaciones de autorización implementadas
- [ ] PII no se loguea en aplicación
- [ ] Auditoría completa implementada

### ✅ Despliegue
- [ ] Variables de entorno configuradas (si aplica)
- [ ] Cloud Functions desplegadas
- [ ] Índices de Firestore desplegados
- [ ] Reglas de Firestore desplegadas

---

## 4. Orden de Ejecución Recomendado

### Semana 1: Fundamentos
- **Día 1-2:** Completar Tarea 1.1 (Schemas de cliente y círculo)
- **Día 3:** Completar Tarea 1.2 (Schemas de cuenta y transacción)
- **Día 4:** Completar Tarea 1.3 (Índices de Firestore)
- **Día 5:** Iniciar Tarea 2.1 (Servicio de círculo familiar)

### Semana 2: Lógica de Negocio y API
- **Día 1-2:** Finalizar Tarea 2.1 (Servicio de círculo familiar)
- **Día 3:** Completar Tarea 2.2 (Extender servicio de cuentas)
- **Día 4:** Completar Tarea 3.1 (Controladores)
- **Día 5:** Completar Tareas 3.2 y 3.3 (Rutas)

### Semana 3: Testing y Documentación
- **Día 1-2:** Completar Tarea 4.1 (Tests unitarios)
- **Día 3:** Completar Tarea 4.2 (Tests de integración)
- **Día 4:** Completar Tareas 5.1, 5.2, 5.3 (Documentación)
- **Día 5:** Validación final y despliegue

---

## 5. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| El proyecto base no está implementado | Alta | Alto | Verificar estado del proyecto antes de iniciar |
| Complejidad de transacciones atómicas | Media | Alto | Testear exhaustivamente con emulador |
| Limitaciones de Firestore en arrays grandes | Baja | Medio | Documentar límites (max ~100 miembros) |
| Reglas de seguridad complejas | Media | Alto | Revisar y testear reglas cuidadosamente |
| Deuda técnica por feature incompleta | Media | Medio | Seguir checklist de validación estrictamente |

---

## 6. Criterios de Éxito

La feature de Círculo Familiar se considerará exitosa cuando:

### ✅ Funcionalidad Completa
- Un titular puede añadir/remover miembros de su círculo
- Los miembros pueden generar transacciones en cuentas del titular (según permisos)
- La configuración de permisos por cuenta funciona correctamente
- La auditoría registra todas las operaciones correctamente

### ✅ Calidad
- Cobertura de tests > 80%
- Todos los tests pasan
- El código pasa el linter sin errores
- No hay vulnerabilidades de seguridad

### ✅ Documentación
- La API está completamente documentada en OpenAPI
- Los modelos de datos están actualizados en ARCHITECTURE.md
- Existe documentación técnica completa

### ✅ Despliegue
- La feature está desplegada en ambiente de staging sin errores
- Las pruebas manuales confirman funcionamiento correcto
- El rendimiento es aceptable (< 500ms respuesta API)

---

## 7. Recursos Adicionales

### Documentación de Referencia
- `docs/FAMILY-GROUP-FEATURE.md` - Especificación funcional completa
- `docs/FAMILY-GROUP-API-SPEC.md` - Especificación técnica de API
- `docs/ARCHITECTURE.md` - Arquitectura del sistema
- `docs/GUIDELINES.md` - Guías de codificación
- `docs/SPECS.md` - Especificaciones funcionales
- `openapi.yaml` - Contrato de la API

### Herramientas Útiles
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite) - Para testing local
- [Zod Documentation](https://zod.dev/) - Validación de schemas
- [Jest Testing Framework](https://jestjs.io/) - Framework de testing
- [Firebase Functions Test](https://firebase.google.com/docs/functions/unit-testing) - Testing de Cloud Functions

### Contactos
- **Product Owner:** Revisar issue original para preguntas funcionales
- **Tech Lead:** Consultar para decisiones arquitectónicas
- **DevOps:** Coordinar para despliegues

---

## 8. Notas Importantes

### ⚠️ Advertencias
1. **NO implementar si el proyecto base no está completo**
2. **Seguir estrictamente las guías de GUIDELINES.md** (Zod, tipado estricto, etc.)
3. **NO hardcodear ningún secreto o configuración sensible**
4. **Testear exhaustivamente antes de desplegar**

### 💡 Mejores Prácticas
1. Usar transacciones atómicas de Firestore para operaciones críticas
2. Validar permisos en múltiples capas (service + Firestore rules)
3. Crear registros de auditoría para todas las operaciones
4. No loguear PII en logs de aplicación
5. Escribir tests antes de implementar (TDD)

---

**Versión del Documento:** 1.0  
**Fecha de Creación:** 2025-12-08  
**Última Actualización:** 2025-12-08  
**Autor:** Copilot (Product Owner Agent)  
**Estado:** Propuesta - Listo para Desarrollo

**Aprobado por:** [Pendiente]  
**Fecha de Aprobación:** [Pendiente]
