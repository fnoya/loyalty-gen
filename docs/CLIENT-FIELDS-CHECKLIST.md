# Checklist de Implementación - Campos de Cliente

## Para Desarrolladores Backend

Este checklist guía la implementación de los nuevos campos de cliente siguiendo la especificación completa.

---

## ✅ Fase 1: Preparación y Comprensión

### Lectura de Documentación

- [ ] Leer `docs/CLIENT-FIELDS-SPEC.md` completo
- [ ] Revisar `docs/CLIENT-FIELDS-SUMMARY.md` para contexto ejecutivo
- [ ] Estudiar `docs/CLIENT-MODEL-DIAGRAM.md` para entender la estructura visual
- [ ] Revisar ejemplos en `docs/examples/`
- [ ] Leer secciones actualizadas en `docs/ARCHITECTURE.md`
- [ ] Revisar política de PII en `docs/GUIDELINES.md` sección 9
- [ ] Estudiar endpoints actualizados en `docs/SPECS.md`

### Validación de Entendimiento

- [ ] Entender que `name` es ahora un objeto, no un string
- [ ] Comprender la regla de isPrimary único para phones y addresses
- [ ] Conocer los formatos requeridos: ISO 3166-1 alpha-2 para country, E.164 recomendado para phones
- [ ] Saber qué campos son PII y NO deben loggearse

---

## ✅ Fase 2: Implementación de Schemas (Tarea 2.1)

### Crear client.schema.ts

- [ ] Copiar código completo de `WORK-PLAN.md` Tarea 2.1 (líneas 371-545)
- [ ] Crear archivo `functions/src/schemas/client.schema.ts`
- [ ] Verificar que incluye todos los schemas:
  - [ ] `identityDocumentTypeSchema`
  - [ ] `identityDocumentSchema`
  - [ ] `clientNameSchema` con validación de patrón
  - [ ] `phoneTypeSchema`
  - [ ] `phoneSchema` con validación de formato
  - [ ] `addressTypeSchema`
  - [ ] `addressSchema` con validación de country ISO
  - [ ] `createClientSchema` con refinements
  - [ ] `updateClientSchema` con refinements
  - [ ] `clientSchema` completo
- [ ] Verificar función `validateSinglePrimary`
- [ ] Exportar todos los tipos TypeScript inferidos

### Testing de Schemas

- [ ] Crear test `client.schema.test.ts`
- [ ] Test: name con firstName y firstLastName válidos ✅
- [ ] Test: name con caracteres inválidos ❌
- [ ] Test: name con campos vacíos ❌
- [ ] Test: createClient sin email ni identity_document ❌
- [ ] Test: createClient con email válido ✅
- [ ] Test: createClient con identity_document válido ✅
- [ ] Test: phones con múltiples isPrimary: true ❌
- [ ] Test: phones con uno solo isPrimary: true ✅
- [ ] Test: addresses con múltiples isPrimary: true ❌
- [ ] Test: addresses con una sola isPrimary: true ✅
- [ ] Test: country code con formato inválido (3 chars) ❌
- [ ] Test: country code con formato válido ("UY") ✅
- [ ] Test: phone number demasiado corto (< 7 chars) ❌
- [ ] Test: phone number formato E.164 ✅
- [ ] Verificar que todos los tests pasen

---

## ✅ Fase 3: Actualización de Servicios (Tarea 2.2)

### Actualizar client.service.ts

- [ ] Importar nuevos tipos del schema
- [ ] Actualizar método `create()` para aceptar `CreateClientRequest`
- [ ] Asegurar que `phones` y `addresses` se inicializan como arrays vacíos si no se proporcionan
- [ ] Actualizar método `update()` para aceptar `UpdateClientRequest`
- [ ] Implementar validación de unicidad de email
- [ ] Implementar validación de unicidad de identity_document (type + number)
- [ ] Asegurar que `updated_at` se actualiza en cada cambio

### Consideraciones de Firestore

- [ ] Verificar que el documento se guarda con la estructura correcta
- [ ] Asegurar que `name` se guarda como objeto (map), no como string
- [ ] Verificar que `phones` y `addresses` se guardan como arrays
- [ ] Crear índices necesarios:
  - [ ] Índice compuesto: `email` + `created_at`
  - [ ] Índice compuesto: `identity_document.type` + `identity_document.number`
  - [ ] Índice compuesto: `name.firstLastName` + `created_at`
  - [ ] Índice compuesto: `name.secondLastName` + `created_at`

### Testing de Servicios

- [ ] Test: crear cliente con estructura de nombre completa
- [ ] Test: crear cliente con email duplicado devuelve error
- [ ] Test: crear cliente con identity_document duplicado devuelve error
- [ ] Test: actualizar cliente actualiza solo campos proporcionados
- [ ] Test: leer cliente devuelve estructura correcta de name
- [ ] Test: crear cliente con teléfono sin isPrimary: true funciona
- [ ] Test: crear cliente con dirección sin isPrimary: true funciona

---

## ✅ Fase 4: Actualización de Rutas/Controladores (Tarea 2.3)

### Actualizar clients.routes.ts

- [ ] Importar schemas actualizados
- [ ] Actualizar validación en POST /clients con `createClientSchema`
- [ ] Actualizar validación en PUT /clients/:id con `updateClientSchema`
- [ ] Asegurar que las respuestas incluyen la estructura completa
- [ ] Verificar manejo de errores de validación

### Testing de Endpoints

- [ ] Test: POST /clients con payload completo (usar `create-client-full.json`)
- [ ] Test: POST /clients con payload mínimo (usar `create-client-minimal.json`)
- [ ] Test: POST /clients sin identificador devuelve 400
- [ ] Test: POST /clients con múltiples isPrimary devuelve 400
- [ ] Test: POST /clients con country inválido devuelve 400
- [ ] Test: PUT /clients/:id actualiza campos correctamente (usar `update-client.json`)
- [ ] Test: GET /clients/:id devuelve estructura completa
- [ ] Test: GET /clients lista clientes con estructura completa

---

## ✅ Fase 5: Seguridad y Logging

### Verificar Política de Logging

- [ ] Buscar en el código: NO debe haber logs de `name`
- [ ] Buscar en el código: NO debe haber logs de `email`
- [ ] Buscar en el código: NO debe haber logs de `identity_document`
- [ ] Buscar en el código: NO debe haber logs de `phones`
- [ ] Buscar en el código: NO debe haber logs de `addresses`
- [ ] Buscar en el código: NO debe haber logs de `extra_data`
- [ ] Verificar que solo se loggean `client_id` y códigos de error

### Actualizar Reglas de Firestore

- [ ] Actualizar `firestore.rules` para proteger acceso a campos PII
- [ ] Asegurar que solo usuarios autenticados y autorizados pueden leer/escribir
- [ ] Probar reglas con emulador de Firestore

### Auditoría

- [ ] Verificar que `CLIENT_CREATED` incluye estructura completa de name en `changes.after`
- [ ] Verificar que `CLIENT_UPDATED` incluye campos modificados en `changes.before` y `changes.after`
- [ ] Asegurar que registros de auditoría tienen permisos restrictivos

---

## ✅ Fase 6: Documentación y Validación Final

### Actualizar Documentación Técnica (si es necesario)

- [ ] Actualizar JSDoc en funciones que manejan clientes
- [ ] Documentar ejemplos de uso en comentarios de código
- [ ] Actualizar README del proyecto si es necesario

### Validación con OpenAPI

- [ ] Ejecutar `npx @apidevtools/swagger-cli validate openapi.yaml`
- [ ] Verificar que no hay errores de validación

### Testing End-to-End

- [ ] Crear cliente con curl usando `create-client-full.json`
- [ ] Crear cliente con curl usando `create-client-minimal.json`
- [ ] Actualizar cliente con curl usando `update-client.json`
- [ ] Listar clientes y verificar estructura
- [ ] Obtener cliente por ID y verificar todos los campos

### Code Review

- [ ] Solicitar revisión de código con foco en:
  - [ ] Validaciones correctas de isPrimary
  - [ ] No logging de PII
  - [ ] Manejo correcto de arrays vacíos
  - [ ] Validación de códigos ISO
  - [ ] Estructura de name como objeto

---

## ✅ Fase 7: Despliegue y Monitoreo

### Pre-Despliegue

- [ ] Ejecutar suite completa de tests unitarios
- [ ] Ejecutar suite completa de tests de integración
- [ ] Verificar cobertura de código > 80%
- [ ] Linter sin errores
- [ ] Build exitoso

### Despliegue

- [ ] Deploy a ambiente de staging
- [ ] Pruebas manuales en staging
- [ ] Deploy a producción
- [ ] Verificar que Cloud Function se despliega correctamente

### Post-Despliegue

- [ ] Monitorear logs en primeras horas
- [ ] Verificar que NO aparece PII en logs
- [ ] Verificar métricas de error (deben ser bajas)
- [ ] Crear cliente de prueba en producción
- [ ] Verificar estructura en Firestore

---

## ✅ Migración de Datos (Si Aplica - Solo si hay datos existentes)

### Evaluación

- [ ] Determinar si existen clientes con formato antiguo
- [ ] Decidir estrategia: Lazy Migration vs Script Batch

### Si Lazy Migration

- [ ] Implementar función `normalizeClientData()` en service
- [ ] Parsear `name` string a objeto en lectura
- [ ] Inicializar arrays vacíos para `phones` y `addresses`
- [ ] Convertir automáticamente en próxima actualización
- [ ] Documentar comportamiento en código

### Si Script Batch

- [ ] Crear script de migración independiente
- [ ] Testear en datos de desarrollo
- [ ] Backup de Firestore en producción
- [ ] Ejecutar migración en ventana de mantenimiento
- [ ] Validar todos los registros migrados

---

## 📋 Checklist Rápido de Validación Final

Antes de marcar la tarea como completada, verificar:

- [ ] ✅ Todos los schemas Zod implementados y testeados
- [ ] ✅ Servicios actualizados con nueva estructura
- [ ] ✅ Endpoints validando correctamente
- [ ] ✅ Política de NO logging de PII aplicada
- [ ] ✅ Tests unitarios pasando (>80% cobertura)
- [ ] ✅ Tests de integración pasando
- [ ] ✅ OpenAPI validado sin errores
- [ ] ✅ Ejemplos de API funcionando
- [ ] ✅ Documentación actualizada
- [ ] ✅ Code review aprobado
- [ ] ✅ Desplegado y monitoreado

---

## 📚 Referencias Rápidas

| Documento | Propósito |
|-----------|-----------|
| `CLIENT-FIELDS-SPEC.md` | Especificación funcional completa |
| `CLIENT-FIELDS-SUMMARY.md` | Resumen ejecutivo |
| `CLIENT-MODEL-DIAGRAM.md` | Diagramas visuales |
| `ARCHITECTURE.md` | Modelo de datos en Firestore |
| `SPECS.md` | Especificaciones de endpoints |
| `GUIDELINES.md` | Directrices de desarrollo |
| `WORK-PLAN.md` Task 2.1 | Código Zod completo |
| `openapi.yaml` | Contrato de API |
| `docs/examples/` | Ejemplos de payloads JSON |

---

## 🚨 Errores Comunes a Evitar

1. ❌ Guardar `name` como string en lugar de objeto
2. ❌ No validar isPrimary único en arrays
3. ❌ Aceptar country codes de 3 caracteres
4. ❌ Loggear números de teléfono o direcciones
5. ❌ Olvidar inicializar arrays vacíos si no se proporcionan
6. ❌ No actualizar `updated_at` timestamp
7. ❌ No crear índices necesarios en Firestore
8. ❌ Permitir caracteres especiales en nombres sin validar

---

**Última actualización:** 2025-12-06  
**Versión:** 1.0  
**Autor:** Product Owner Team
