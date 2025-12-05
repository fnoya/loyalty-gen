# AUDITORÍA DE LA ARQUITECTURA - loyalty-gen

## Resumen ejecutivo

He realizado una auditoría práctica de la arquitectura descrita en docs/ARCHITECTURE.md. El diseño general es sólido y apropiado para un MVP: TypeScript + Firebase (Cloud Functions, Firestore, Auth) es una buena elección por rapidez de desarrollo e integración. Sin embargo, hay riesgos críticos a mitigar antes de escalar: consistencia por desnormalización, límites de Firestore (tamaño de documento, arrays), costes por lecturas frecuentes, búsqueda de texto completo, seguridad e IAM insuficientemente detallada, y falta de observabilidad/SLOs.

---

## 1. Modelo de datos y consistencia

Problema principal: uso de campos desnormalizados (client.account_balances) que requieren actualizaciones atómicas para evitar inconsistencias.

Recomendaciones:
- Usar transacciones de Firestore o FieldValue.increment dentro de transacciones para actualizar balances y crear transacciones en un mismo bloque atómico.
- Evitar arrays que crezcan sin límite (ej. affinityGroupIds). Modelar membership como colección: `clients/{clientId}/memberships/{membershipId}` o `affinityGroups/{groupId}/members/{memberId}`.
- Documentar y validar tamaño de documentos (máx 1 MiB) en capa de servicio.
- Mantener balance desnormalizado sólo para saldos agregados y calcular agregados complejos en BigQuery.

Ejemplo: actualización atómica de balance (TypeScript) — usar en servicios:

```typescript
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

export async function creditAccount(clientId: string, accountId: string, amount: number, transactionId: string) {
  const clientRef = db.collection('clients').doc(clientId);
  const accountRef = clientRef.collection('loyaltyAccounts').doc(accountId);
  const txDocRef = accountRef.collection('transactions').doc(transactionId);

  await db.runTransaction(async (tx) => {
    const txSnap = await tx.get(txDocRef);
    if (txSnap.exists) return; // idempotency: ya procesado

    tx.set(txDocRef, {
      transaction_type: 'credit',
      amount,
      description: 'Crédito por operación',
      timestamp: FieldValue.serverTimestamp(),
    });

    // Incrementa puntos en la cuenta y en el saldo desnormalizado del cliente
    tx.update(accountRef, { points: FieldValue.increment(amount) });
    tx.update(clientRef, { 'account_balances.' + accountId: FieldValue.increment(amount) });
  });
}
```

Notas: usar idempotency-key y manejar errores para reintentos.

---

## 2. Búsqueda

- MVP: buscar con consultas de Firestore (where, orderBy, startAt) y diseñar campos auxiliares para filtrar.
- Post-MVP: integrar motor de búsqueda (Typesense o Algolia recomendados para simplicidad y latencia; Elastic si hay consultas complejas).
- Sincronización: publicar cambios desde Cloud Functions a Pub/Sub y procesar actualizaciones al índice de búsqueda.

---

## 3. API y despliegue

- Mantener monolito modular en Cloud Functions para MVP.
- Medidas: controlar timeouts, memory, concurrency. Considere Cloud Run si necesita control más fino o menor cold-start.
- Dividir rutas en módulos y considerar separación por dominios si la base crece.

Ejemplo breve de middleware de errores (Express + TypeScript):

```typescript
import { Request, Response, NextFunction } from 'express';

class BusinessError extends Error { constructor(public code: string, message: string) { super(message); } }

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof BusinessError) {
    const status = err.code === 'INSUFFICIENT_FUNDS' ? 409 : 400;
    return res.status(status).json({ error: err.code, message: err.message });
  }

  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
}
```

---

## 4. Seguridad e IAM

Recomendaciones:
- Aplicar Principle of Least Privilege: usar cuentas de servicio separadas y roles mínimos.
- Reglas de Firestore: usar custom claims de Firebase Auth para roles y validar en security rules.
- Usar Secret Manager para secretos y no exponerlos en código.

Ejemplo de reglas de Firestore (snippet):

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth.token.role == 'admin';
    }

    match /clients/{clientId} {
      allow read: if request.auth != null && (request.auth.uid == clientId || isAdmin());
      allow write: if isAdmin();

      match /loyaltyAccounts/{accountId} {
        allow read: if request.auth != null && (request.auth.uid == clientId || isAdmin());
        allow write: if isAdmin();
      }
    }
  }
}
```

---

## 5. Operaciones asíncronas y borrado en cascada

- Devolver 202 Accepted en DELETE y ejecutar borrado por lotes asíncrono.
- Preferir extensión oficial "Delete User Data" cuando sea suficiente; si no, Cloud Function con paginación y batch deletes.
- Publicar eventos de completado (pub/sub) y/o exponer un endpoint para consultar estado.

---

## 6. Observabilidad y SRE

- Habilitar Cloud Monitoring, Error Reporting, Trace y Logging estructurado.
- Definir SLOs y alertas básicas: error rate, latencia p95, facturación inesperada.
- Usar Firebase Emulator en CI para pruebas de integración.

---

## 7. BigQuery y analítica

- Para Post-MVP, sincronizar eventos relevantes (transactions, account updates) a BigQuery.
- Particionar tablas por fecha y materializar agregados costosos.
- Usar extensiones oficiales o Pub/Sub + Dataflow para transformación.

---

## 8. Manejo de errores y diseño de API

- Definir catálogo de errores de negocio con códigos y mapping HTTP (API-DESIGN.md).
- Implementar idempotency keys en endpoints de crédito/débito.
- Registrar request-id y user-id en logs para trazabilidad.

---

## 9. Costes y dimensionamiento

- Estimar RPS y lecturas/escrituras por operación para proyectar costes.
- Optimizar lecturas con FieldMask, batch gets, y caché donde aplique.
- Considerar migración a Cloud Run para cargas constantes.

---

## 10. Roadmap priorizado y checklist (lista para transformar en issues)

1. Garantizar transacciones atómicas de balance (alta) — Implementar y testear en Emulator (por qué: consistencia crítica).
2. Re-modelar membership fuera de arrays (alta) — Crear colección de membresías y migración de datos.
3. Definir reglas de seguridad y roles (alta) — Implementar Security Rules y tests.
4. Añadir logging y Error Reporting (alta) — Instrumentación mínima para producción.
5. Crear pipeline de sincronización para motor de búsqueda (medio) — Integrar Typesense/Algolia y pruebas.
6. Configurar sincronización a BigQuery (medio) — Extensión o Pub/Sub pipeline.
7. Añadir idempotency-key para endpoints monetarios (medio) — Evitar duplicados por retries.
8. Estimar costes y alertas de facturación (media) — Configurar alertas de presupuesto.
9. Evaluar Cloud Run para endpoints críticos (baja/medio) — Pruebas de rendimiento.
10. Implementar endpoint/status para borrados asíncronos (medio) — UX para operaciones largas.

---

## 11. Pasos siguientes sugeridos por el auditor

- Transformar cada ítem de la checklist en issues con prioridad y asignar a sprint.
- Implementar tests automáticos en CI con Firebase Emulator.
- Hacer una proof-of-concept de búsqueda con Typesense y medir latencia.

---

Fin del contenido del archivo.
