# Resumen Ejecutivo: Ampliación de Campos de Cliente

## Autor
Product Owner / Senior Product Manager

## Fecha
2025-12-06

## Estado
✅ **Documentación Completada** - Lista para implementación por equipo de desarrollo

---

## 1. Resumen del Cambio

Se ha ampliado el modelo de datos del Cliente para soportar información más completa y estructurada, cumpliendo con los requisitos del negocio para capturar datos de contacto y personales de manera detallada.

### Cambios Principales

| Campo Anterior | Campo Nuevo | Tipo | Descripción |
|----------------|-------------|------|-------------|
| `name: string` | `name: object` | Estructurado | Desagregado en firstName, secondName, firstLastName, secondLastName |
| - | `phones: array` | Nuevo | Lista de números telefónicos con tipo y flag de principal |
| - | `addresses: array` | Nuevo | Lista de direcciones físicas completas con tipo y flag de principal |
| `extra_data: object` | `extra_data: object` | Sin cambios | Mantiene flexibilidad para datos adicionales |

---

## 2. Motivación del Negocio

### Problemas Resueltos

1. **Personalización de Comunicaciones:** Ahora se puede dirigir al cliente por su primer nombre o por apellido según el contexto formal/informal.

2. **Cumplimiento Legal:** Muchos países latinoamericanos requieren dos apellidos en documentación oficial.

3. **Contacto Multi-canal:** Soporta múltiples números telefónicos (móvil, casa, trabajo) con priorización.

4. **Logística y Envíos:** Direcciones completas estructuradas facilitan integración con servicios de entrega.

5. **Segmentación Geográfica:** Capacidad de filtrar clientes por localidad, estado o país.

### Casos de Uso

- **Marketing:** "Hola Juan, tenemos una oferta especial para ti"
- **Notificaciones:** Llamar primero al teléfono marcado como principal
- **Envío de Productos:** Usar la dirección principal para envíos predeterminados
- **Análisis:** Reportes de clientes por región geográfica

---

## 3. Impacto Técnico

### Documentos Actualizados

✅ **CLIENT-FIELDS-SPEC.md** (Nuevo)
- Especificación funcional completa de 12,000+ caracteres
- Modelo de datos detallado con validaciones
- Consideraciones de seguridad y privacidad
- Estrategia de migración de datos

✅ **ARCHITECTURE.md**
- Modelo de datos de Firestore actualizado
- Notas sobre índices compuestos necesarios
- Consideraciones de seguridad para PII

✅ **openapi.yaml**
- 5 nuevos schemas: ClientName, Phone, PhoneType, Address, AddressType
- Schemas Client, CreateClientRequest, UpdateClientRequest actualizados
- Validaciones en formato OpenAPI 3.0

✅ **SPECS.md**
- Endpoints POST/PUT /clients actualizados con nuevos campos
- Validaciones detalladas por campo
- Sección ampliada de seguridad PII

✅ **GUIDELINES.md**
- Política de logging actualizada con campos PII específicos
- Directrices de protección de datos sensibles

✅ **WORK-PLAN.md**
- Schema Zod de client.schema.ts completamente actualizado
- Código de validación de isPrimary único
- Apéndice sobre estrategia de migración de datos

### Archivos de Ejemplo

✅ **docs/examples/**
- `create-client-full.json` - Ejemplo completo con todos los campos
- `create-client-minimal.json` - Ejemplo mínimo con campos obligatorios
- `update-client.json` - Ejemplo de actualización parcial
- `README.md` - Documentación de ejemplos con comandos curl

---

## 4. Especificación Técnica Resumida

### 4.1. Estructura del Nombre

```typescript
name: {
  firstName: string;          // Obligatorio, 1-50 chars
  secondName?: string;         // Opcional, max 50 chars
  firstLastName: string;       // Obligatorio, 1-50 chars
  secondLastName?: string;     // Opcional, max 50 chars
}
```

**Validación:** Solo letras, espacios, guiones y apóstrofes (incluye acentos)

### 4.2. Números Telefónicos

```typescript
phones: Array<{
  type: "mobile" | "home" | "work" | "other";
  number: string;              // 7-20 chars, formato E.164 recomendado
  extension?: string;          // Opcional, max 10 dígitos
  isPrimary: boolean;          // Solo uno puede ser true
}>
```

**Validación:** Solo un teléfono con `isPrimary: true`

### 4.3. Direcciones

```typescript
addresses: Array<{
  type: "home" | "work" | "other";
  street: string;              // Max 100 chars
  buildingBlock?: string;      // Opcional, max 50 chars
  number: string;              // Max 20 chars
  apartment?: string;          // Opcional, max 20 chars
  locality: string;            // Max 100 chars
  state: string;               // Max 100 chars
  postalCode: string;          // Max 20 chars
  country: string;             // ISO 3166-1 alpha-2 (2 chars)
  isPrimary: boolean;          // Solo una puede ser true
}>
```

**Validación:** Solo una dirección con `isPrimary: true`, country en formato ISO

---

## 5. Seguridad y Privacidad

### 5.1. Campos con PII Sensible

Los siguientes campos contienen **Información Personal Identificable** y requieren protección especial:

- ❌ `name` (estructura completa)
- ❌ `email`
- ❌ `identity_document`
- ❌ `phones` (números completos)
- ❌ `addresses` (direcciones completas)
- ⚠️ `extra_data` (puede contener PII)

### 5.2. Política de Logging

**PROHIBIDO en logs de aplicación:**
- Nombres completos
- Emails
- Números de documento
- Números telefónicos
- Direcciones físicas
- Cualquier dato de extra_data

**PERMITIDO en logs:**
- IDs de recursos (client_id, account_id)
- Códigos de error
- Eventos de seguridad
- Timestamps

**EXCEPCIÓN:**
- Registros de auditoría en Firestore (colección auditLogs) SÍ pueden incluir PII pero con permisos restrictivos

### 5.3. Validación y Sanitización

- ✅ Todas las validaciones implementadas en Zod schemas
- ✅ Expresiones regulares estrictas para nombres
- ✅ Validación de formato E.164 para teléfonos
- ✅ Validación de códigos ISO 3166-1 alpha-2 para países
- ✅ Prevención de inyección de código en todos los campos

---

## 6. Compatibilidad y Migración

### 6.1. Impacto en MVP Inicial

Para el MVP inicial (sin datos existentes), **NO se requiere migración**. Los schemas Zod actualizados ya incluyen la estructura completa.

### 6.2. Estrategia Futura (Post-MVP)

Si en el futuro existen clientes con formato antiguo:

**Opción 1: Migración Lazy (Recomendada)**
- Detectar y convertir automáticamente al leer/actualizar
- Transición gradual sin downtime
- Menor riesgo

**Opción 2: Script Batch**
- Migración completa de una vez
- Requiere ventana de mantenimiento
- Consistencia inmediata

Ver detalles completos en: `WORK-PLAN.md` Apéndice A

---

## 7. Próximos Pasos para Desarrollo

### Fase 1: Implementación Backend (Épica 2)

**Tarea 2.1 - Schemas Zod (ACTUALIZADA)** ⭐
- Implementar `client.schema.ts` con schemas completos
- Incluye validaciones de isPrimary único
- Ver código en `WORK-PLAN.md` líneas 371-545

**Tareas 2.2-2.4**
- Continuar con servicios, rutas y controladores según plan original

### Fase 2: Testing

- Validar schemas Zod con casos de prueba
- Probar validación de isPrimary único
- Verificar formato de códigos de país
- Probar migración lazy si aplicable

### Fase 3: Frontend

- Formularios para captura de nombre estructurado
- Gestión dinámica de múltiples teléfonos
- Gestión dinámica de múltiples direcciones
- Validación en tiempo real

---

## 8. Criterios de Aceptación

### Documentación
- [x] Especificación funcional completa (CLIENT-FIELDS-SPEC.md)
- [x] OpenAPI actualizado y validado
- [x] Ejemplos de API disponibles
- [x] Guías de seguridad documentadas

### Implementación (Pendiente)
- [ ] Schemas Zod implementados
- [ ] Validaciones funcionando correctamente
- [ ] Tests unitarios pasando
- [ ] API endpoints actualizados

### Validación (Pendiente)
- [ ] Validación de isPrimary único funciona
- [ ] Validación de códigos ISO funciona
- [ ] Formato E.164 aceptado
- [ ] Política de logging aplicada

---

## 9. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Complejidad de validación isPrimary | Media | Bajo | Código de validación ya provisto en WORK-PLAN |
| Lista de códigos ISO desactualizada | Baja | Medio | Usar biblioteca estándar (iso-3166-1-alpha-2) |
| Formato E.164 muy restrictivo | Media | Bajo | Hacer recomendado, no obligatorio |
| Logs accidentales de PII | Media | Alto | Code review obligatorio + linting rules |

---

## 10. Métricas de Éxito

1. **Cobertura de Datos:** >80% de clientes con al menos un teléfono y dirección después de 3 meses
2. **Calidad de Datos:** <5% de rechazos por validación en formularios
3. **Seguridad:** 0 incidentes de logging de PII en logs de aplicación
4. **Adopción:** Frontend usando nuevos campos en 100% de flujos de creación/edición

---

## 11. Recursos y Referencias

### Documentación Principal
- 📘 `docs/CLIENT-FIELDS-SPEC.md` - Especificación funcional detallada
- 📘 `docs/ARCHITECTURE.md` - Modelo de datos actualizado
- 📘 `docs/SPECS.md` - Especificaciones de endpoints
- 📘 `openapi.yaml` - Contrato de API

### Ejemplos
- 📄 `docs/examples/create-client-full.json`
- 📄 `docs/examples/create-client-minimal.json`
- 📄 `docs/examples/update-client.json`

### Implementación
- 📘 `WORK-PLAN.md` - Plan de trabajo con código Zod actualizado
- 📘 `docs/GUIDELINES.md` - Directrices de desarrollo

### Estándares
- 🌐 ISO 3166-1 alpha-2: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
- 🌐 E.164 Telephone Format: https://en.wikipedia.org/wiki/E.164

---

## 12. Aprobaciones

| Rol | Nombre | Estado | Fecha |
|-----|--------|--------|-------|
| Product Owner | @copilot | ✅ Aprobado | 2025-12-06 |
| Desarrollador Lead | Pendiente | ⏳ En revisión | - |
| Arquitecto | Pendiente | ⏳ En revisión | - |

---

## 13. Notas Finales

Esta especificación representa un diseño completo, seguro y escalable para la ampliación de campos de cliente en LoyaltyGen. Todos los aspectos técnicos, de seguridad y de migración han sido considerados.

El equipo de desarrollo puede proceder con confianza a la implementación siguiendo los documentos actualizados, particularmente el schema Zod completo provisto en `WORK-PLAN.md`.

**Próximo Paso:** Revisión por desarrollador lead y arquitecto, seguido de implementación de Tarea 2.1 (Schemas Zod).

---

**Documento generado por:** GitHub Copilot Agent (Product Owner)  
**Versión:** 1.0  
**Última actualización:** 2025-12-06
