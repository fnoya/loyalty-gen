# Ejemplos de API - LoyaltyGen

Este directorio contiene ejemplos de payloads JSON para los endpoints de la API de LoyaltyGen.

## Clientes

### Crear Cliente Completo

**Archivo:** `create-client-full.json`

Ejemplo completo que incluye todos los campos opcionales:
- Nombre estructurado completo (con segundo nombre y segundo apellido)
- Email e identity_document
- Múltiples teléfonos (móvil y trabajo)
- Múltiples direcciones (casa y trabajo)
- Extra data con preferencias

**Endpoint:** `POST /api/v1/clients`

```bash
curl -X POST https://your-project.firebaseapp.com/api/v1/clients \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d @docs/examples/create-client-full.json
```

### Crear Cliente Mínimo

**Archivo:** `create-client-minimal.json`

Ejemplo mínimo con solo los campos obligatorios:
- Nombre con solo primer nombre y primer apellido
- Email como identificador único
- Sin teléfonos ni direcciones

**Endpoint:** `POST /api/v1/clients`

```bash
curl -X POST https://your-project.firebaseapp.com/api/v1/clients \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d @docs/examples/create-client-minimal.json
```

### Actualizar Cliente

**Archivo:** `update-client.json`

Ejemplo de actualización parcial:
- Agregar segundo nombre
- Actualizar lista de teléfonos
- Modificar extra_data

**Endpoint:** `PUT /api/v1/clients/{client_id}`

```bash
curl -X PUT https://your-project.firebaseapp.com/api/v1/clients/CLIENT_ID \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d @docs/examples/update-client.json
```

## Notas Importantes

### Validaciones

1. **Nombre:**
   - `firstName` y `firstLastName` son obligatorios
   - Máximo 50 caracteres por campo
   - Solo letras, espacios, guiones y apóstrofes

2. **Identificadores:**
   - Al menos `email` o `identity_document` debe estar presente
   - Si se proporciona email, debe ser único
   - Si se proporciona identity_document, type+number debe ser único

3. **Teléfonos:**
   - Solo un teléfono puede tener `isPrimary: true`
   - Formato E.164 recomendado: `+código_país número`
   - `extension` es opcional

4. **Direcciones:**
   - Solo una dirección puede tener `isPrimary: true`
   - `country` debe ser código ISO 3166-1 alpha-2 (ej: "UY", "AR", "BR")
   - `buildingBlock` y `apartment` son opcionales

### Respuestas de Error Comunes

**400 Bad Request - Falta identificador:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Debe proporcionar al menos un identificador: email o documento de identidad"
  }
}
```

**400 Bad Request - Múltiples isPrimary:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Solo un teléfono puede ser marcado como principal"
  }
}
```

**409 Conflict - Email duplicado:**
```json
{
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "El email ya está registrado"
  }
}
```

## Referencia

Para la especificación completa de la API, consultar:
- `openapi.yaml` - Contrato completo de la API
- `docs/CLIENT-FIELDS-SPEC.md` - Especificación detallada de campos de cliente
- `docs/SPECS.md` - Especificaciones funcionales
- `docs/API-DESIGN.md` - Convenciones de diseño de API
