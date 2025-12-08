# Círculos de Afinidad Familiares - Documentación General

## 📖 Índice

Esta documentación describe la funcionalidad completa de **Círculos de Afinidad Familiares** para la plataforma LoyaltyGen.

### Documentos Disponibles

1. **[FAMILY-GROUP-FEATURE.md](./FAMILY-GROUP-FEATURE.md)** - Especificación Funcional
   - Visión general y casos de uso
   - Modelo de datos completo en Firestore
   - Reglas de negocio detalladas
   - Validaciones y códigos de error
   - Consideraciones de seguridad
   - Política de logging y auditoría
   - Migración de datos
   - Métricas y monitoreo
   - Roadmap de futuras mejoras

2. **[FAMILY-GROUP-API-SPEC.md](./FAMILY-GROUP-API-SPEC.md)** - Especificación Técnica de API
   - Endpoints nuevos (6 endpoints)
   - Endpoints modificados (4 endpoints)
   - Schemas de Zod completos
   - Códigos de error y respuestas
   - Flujos de integración con diagramas
   - Estructura de rutas Express
   - Casos de prueba (unitarios e integración)
   - Fragmentos de OpenAPI

3. **[FAMILY-GROUP-WORK-PLAN.md](./FAMILY-GROUP-WORK-PLAN.md)** - Plan de Trabajo para Desarrolladores
   - 5 épicas con 13 tareas específicas
   - Instrucciones detalladas por tarea
   - Criterios de aceptación
   - Estimación de esfuerzo (~52 horas)
   - Cronograma recomendado (3 semanas)
   - Checklist de validación
   - Riesgos y mitigaciones

---

## 🎯 Resumen Ejecutivo

### ¿Qué es un Círculo de Afinidad Familiar?

Un **Círculo de Afinidad Familiar** permite a un cliente designar a otros clientes como parte de su grupo familiar o de amigos. Esto crea una estructura donde:

- **Un cliente es el TITULAR** (holder) del círculo
- **Otros clientes son MIEMBROS** (members) del círculo
- Las transacciones de los miembros pueden afectar las cuentas del titular
- El titular puede configurar qué miembros pueden hacer qué

### Casos de Uso Principales

1. **Familia con cuenta compartida**
   - María es titular y añade a su esposo e hijos
   - Todos acumulan puntos en la cuenta de María
   - Solo María puede canjear los puntos

2. **Grupo de amigos**
   - Carlos y sus amigos comparten puntos para un premio mayor
   - Todos pueden acumular, solo Carlos puede canjear

3. **Empresa familiar**
   - El dueño es titular, empleados familiares pueden hacer pedidos
   - Los pedidos descuentan del crédito del titular
   - Solo el titular puede recargar crédito

---

## 🏗️ Arquitectura en 5 Minutos

### Modelo de Datos Simplificado

```
Cliente Titular
├── familyCircle.role = 'holder'
├── familyCircleMembers = [
│   { memberId: 'client-123', relationshipType: 'child' },
│   { memberId: 'client-456', relationshipType: 'spouse' }
│   ]
└── cuentas de lealtad
    └── familyCircleConfig
        ├── allowMemberCredits: true
        └── allowMemberDebits: false

Cliente Miembro
├── familyCircle.role = 'member'
├── familyCircle.holderId = 'titular-id'
└── familyCircle.relationshipType = 'child'
```

### Flujo de Transacción

```
1. Miembro quiere acreditar puntos
   ↓
2. Sistema valida que es miembro del círculo
   ↓
3. Sistema verifica allowMemberCredits = true
   ↓
4. Transacción se aplica a cuenta del TITULAR
   ↓
5. Transacción registra originatedBy = miembro
   ↓
6. Auditoría: POINTS_CREDITED_BY_CIRCLE_MEMBER
```

---

## 🚀 Guía Rápida por Rol

### Para Product Owners / Managers

**Leer primero:** [FAMILY-GROUP-FEATURE.md](./FAMILY-GROUP-FEATURE.md)
- Sección 1: Visión General
- Sección 2: Casos de Uso
- Sección 4: Reglas de Negocio
- Sección 11: Roadmap

**Tiempo estimado:** 15-20 minutos

### Para Arquitectos / Tech Leads

**Leer primero:** [FAMILY-GROUP-FEATURE.md](./FAMILY-GROUP-FEATURE.md)
- Sección 3: Modelo de Datos
- Sección 6: Consideraciones de Seguridad
- Sección 8: Casos Edge

**Luego:** [FAMILY-GROUP-API-SPEC.md](./FAMILY-GROUP-API-SPEC.md)
- Sección 1: Endpoints Nuevos
- Sección 5: Flujos de Integración

**Tiempo estimado:** 30-40 minutos

### Para Desarrolladores Backend

**Leer en orden:**

1. [FAMILY-GROUP-WORK-PLAN.md](./FAMILY-GROUP-WORK-PLAN.md) - Resumen completo
2. [FAMILY-GROUP-API-SPEC.md](./FAMILY-GROUP-API-SPEC.md) - Referencia técnica
3. [FAMILY-GROUP-FEATURE.md](./FAMILY-GROUP-FEATURE.md) - Reglas de negocio

**Tiempo estimado:** 1-2 horas para entender completamente

### Para QA / Testers

**Leer primero:** [FAMILY-GROUP-API-SPEC.md](./FAMILY-GROUP-API-SPEC.md)
- Sección 6: Testing (casos de prueba)

**Luego:** [FAMILY-GROUP-FEATURE.md](./FAMILY-GROUP-FEATURE.md)
- Sección 2: Casos de Uso
- Sección 5: Validaciones y Errores

**Tiempo estimado:** 30-45 minutos

---

## 📊 Datos Clave

### Alcance de la Feature

| Métrica | Valor |
|---------|-------|
| Endpoints nuevos | 6 |
| Endpoints modificados | 4 |
| Campos nuevos en Firestore | 8 |
| Acciones de auditoría nuevas | 5 |
| Clases de error nuevas | 7 |
| Estimación de desarrollo | 52 horas (~3 semanas) |
| Líneas de código estimadas | ~2,000-2,500 |

### Impacto en el Sistema

| Componente | Cambio |
|------------|--------|
| Modelo de datos | 3 colecciones modificadas |
| Índices Firestore | 3 nuevos índices compuestos |
| API pública | 10 operaciones afectadas |
| Sistema de auditoría | 5 acciones nuevas |
| Reglas de seguridad | Extensión mayor requerida |

---

## 🔐 Seguridad

### Principios de Seguridad Aplicados

✅ **Autenticación:** Todos los endpoints requieren Firebase Auth  
✅ **Autorización:** Validación en múltiples capas (service + Firestore rules)  
✅ **Atomicidad:** Transacciones de Firestore para consistencia  
✅ **Auditoría:** Registro completo de todas las operaciones  
✅ **Privacidad:** No loguear PII en logs de aplicación  

### Validaciones Clave

1. Un cliente solo puede pertenecer a UN círculo
2. Solo el titular puede añadir/remover miembros
3. Los miembros solo pueden actuar si tienen permisos
4. Las transacciones son atómicas (balance + auditoría)

---

## 📈 Métricas de Éxito

### Indicadores de Adopción

- Número de círculos familiares creados
- Distribución de tamaños de círculos
- Tipos de relación más comunes
- % de transacciones originadas por miembros

### Indicadores de Calidad

- Cobertura de tests > 80%
- Tiempo de respuesta API < 500ms
- 0 vulnerabilidades de seguridad high/critical
- 0 errores de validación en producción

---

## 🛠️ Herramientas y Tecnologías

### Stack Tecnológico

- **Backend:** TypeScript + Express + Firebase Functions
- **Base de Datos:** Cloud Firestore
- **Autenticación:** Firebase Authentication
- **Validación:** Zod
- **Testing:** Jest + Firebase Functions Test
- **Documentación:** OpenAPI 3.0

### Herramientas de Desarrollo

- Firebase Emulator Suite (testing local)
- Firebase CLI (despliegue)
- ESLint + Prettier (linting y formato)
- npm audit (seguridad de dependencias)

---

## 📋 Checklist de Implementación

### Antes de Empezar

- [ ] El proyecto base está implementado y funcionando
- [ ] Los endpoints de clientes, cuentas y transacciones existen
- [ ] El sistema de auditoría base está operativo
- [ ] Firebase está configurado correctamente
- [ ] El equipo de desarrollo está disponible

### Durante el Desarrollo

- [ ] Seguir el plan de trabajo en orden (Épica 1 → 5)
- [ ] Escribir tests antes de implementar (TDD)
- [ ] Validar cada tarea con criterios de aceptación
- [ ] Testear con Firebase Emulator Suite
- [ ] Revisar código con peer review

### Antes del Despliegue

- [ ] Todos los tests pasan (cobertura > 80%)
- [ ] El código pasa el linter sin errores
- [ ] La documentación está actualizada
- [ ] Las reglas de Firestore están revisadas
- [ ] No hay vulnerabilidades de seguridad
- [ ] El despliegue a staging es exitoso

---

## 🆘 Soporte y Preguntas

### Preguntas Frecuentes

**Q: ¿Puede un miembro ser titular de otro círculo?**  
A: No. Un cliente solo puede tener un rol a la vez (titular o miembro).

**Q: ¿Cuántos miembros puede tener un círculo?**  
A: No hay límite técnico en el MVP, pero se recomienda ~100 miembros máximo por limitaciones de Firestore arrays.

**Q: ¿Qué pasa si el titular es eliminado?**  
A: Todos los miembros se desvinculan automáticamente (cascada).

**Q: ¿Los miembros pueden ver el balance del titular?**  
A: Depende de las reglas de seguridad implementadas. Por defecto, solo lectura de sus propias transacciones.

**Q: ¿Se pueden transferir puntos entre miembros?**  
A: No directamente. Los puntos siempre se acreditan/debitan en cuentas del titular.

### Recursos de Apoyo

- **Documentación de Firebase:** https://firebase.google.com/docs
- **Documentación de Zod:** https://zod.dev/
- **Guía de TypeScript:** https://www.typescriptlang.org/docs/
- **Issue Original:** Ver el issue de GitHub para contexto

### Contactos

- **Product Owner:** Revisar issue para contacto del solicitante
- **Tech Lead:** [Por definir]
- **DevOps:** [Por definir]

---

## 🗺️ Roadmap

### Fase 1 - MVP (Esta Feature)

✅ Modelo de datos básico  
✅ CRUD de miembros del círculo  
✅ Configuración de permisos por cuenta  
✅ Transacciones con originador  
✅ Auditoría completa  

### Fase 2 - Mejoras (Post-MVP)

- [ ] Límites configurables de miembros
- [ ] Notificaciones automáticas
- [ ] Dashboard de estadísticas del círculo
- [ ] Transferencia de titularidad
- [ ] Aprobación de transacciones grandes
- [ ] Histórico de cambios en composición

### Fase 3 - Avanzado (Futuro)

- [ ] Círculos temporales con expiración
- [ ] Sub-círculos o grupos anidados
- [ ] Reglas de negocio personalizables
- [ ] Cuotas de puntos por miembro
- [ ] Alertas de actividad sospechosa

---

## 📜 Historial de Versiones

| Versión | Fecha | Descripción | Autor |
|---------|-------|-------------|-------|
| 1.0 | 2025-12-08 | Documentación inicial completa | Copilot (Product Owner Agent) |

---

## 📄 Licencia y Uso

Esta documentación es parte del proyecto LoyaltyGen y está sujeta a la licencia del repositorio.

**Uso Interno:** Esta documentación es para uso interno del equipo de desarrollo y no debe compartirse fuera del proyecto sin autorización.

---

## ✅ Estado de la Documentación

**Estado Actual:** ✅ Completa y Lista para Desarrollo

**Última Actualización:** 2025-12-08

**Próxima Revisión:** Después de la primera semana de desarrollo

**Mantenedor:** Product Owner / Tech Lead

---

**¿Tienes dudas?** Revisa primero el documento correspondiente a tu rol, luego consulta con el equipo.

**¿Encontraste un error?** Abre un issue en el repositorio o contacta al Product Owner.

**¿Necesitas más detalles?** Revisa los documentos completos enlazados en este README.
