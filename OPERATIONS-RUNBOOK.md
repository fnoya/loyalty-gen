# LoyaltyGen - Operations Runbook

**Last Updated:** December 15, 2025  
**Project:** LoyaltyGen Customer Loyalty Platform  
**Environment:** Production ([YOUR_PROJECT_ID])

---

## 🎯 Quick Reference

| Service | URL | Console |
|---------|-----|---------|
| **Frontend** | https://[YOUR_PROJECT_ID].web.app | [Hosting Console](https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/hosting) |
| **API** | https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api | [Functions Console](https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/functions) |
| **Database** | Firestore (nam5) | [Firestore Console](https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/firestore) |
| **Authentication** | Firebase Auth | [Auth Console](https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/authentication) |
| **Storage** | Firebase Storage | [Storage Console](https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/storage) |
| **Logs** | Cloud Logging | [Logs Console](https://console.cloud.google.com/logs/query?project=[YOUR_PROJECT_ID]) |

---

## 🚨 Emergency Procedures

### Critical System Down

1. **Check Service Status**
   ```bash
   # Frontend
   curl -I https://[YOUR_PROJECT_ID].web.app
   
   # Backend API
   curl https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/health
   ```

2. **Check Firebase Status**
   - https://status.firebase.google.com/

3. **Check Recent Deployments**
   ```bash
   firebase hosting:channel:list
   firebase functions:log --limit 50
   ```

4. **Rollback if Needed**
   - See [Rollback Procedures](#rollback-procedures) below

### Database Emergency

1. **Check Firestore Health**
   - Visit: https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/firestore
   - Check "Usage" tab for anomalies

2. **Review Recent Changes**
   ```bash
   # View recent audit logs
   # Use Firestore Console to query auditLogs collection
   ```

3. **Disable Writes** (if data corruption suspected)
   ```bash
   # Update Firestore rules temporarily
   # Edit firestore.rules to deny all writes
   firebase deploy --only firestore:rules
   ```

---

## 🔍 Monitoring & Diagnostics

### Health Checks

Run these every 5 minutes via monitoring tool:

```bash
# Frontend health
curl -f https://[YOUR_PROJECT_ID].web.app/ || echo "Frontend DOWN"

# API health
curl -f https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/health || echo "API DOWN"
```

### Performance Metrics

**Key Metrics to Monitor:**
- API response time (target: < 500ms)
- Frontend load time (target: < 3s)
- Firestore read/write latency
- Cloud Functions cold start time
- Error rate (target: < 1%)

**Access Metrics:**
```bash
# Cloud Functions metrics
gcloud functions describe api --region=us-central1 --project=[YOUR_PROJECT_ID]

# Firestore usage
# Visit: https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/firestore/usage
```

### Log Analysis

**View Real-Time Logs:**
```bash
# All functions
firebase functions:log --limit 100

# Specific time range
firebase functions:log --since 1h

# Filter by severity
gcloud logging read "resource.type=cloud_function AND severity>=ERROR" \
  --limit 50 --project=[YOUR_PROJECT_ID]
```

**Common Log Queries:**

```bash
# Authentication errors
gcloud logging read 'jsonPayload.message=~"INVALID_TOKEN"' \
  --limit 20 --project=[YOUR_PROJECT_ID]

# Database errors
gcloud logging read 'jsonPayload.message=~"Firestore"' \
  --limit 20 --project=[YOUR_PROJECT_ID]

# Slow queries (> 1s)
gcloud logging read 'jsonPayload.duration>1000' \
  --limit 20 --project=[YOUR_PROJECT_ID]
```

---

## 🔄 Rollback Procedures

### Rollback Cloud Functions

**Via Console (Recommended):**
1. Go to: https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/functions
2. Click on function name
3. Go to "Version History" tab
4. Select previous working version
5. Click "Rollback"

**Via CLI:**
```bash
# Redeploy from previous commit
git checkout <previous-commit-hash>
cd functions
npm run build
firebase deploy --only functions
git checkout main  # Return to current branch
```

### Rollback Frontend (Hosting)

**Via Console (Recommended):**
1. Go to: https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/hosting
2. Click "Release History"
3. Find last working version
4. Click three dots > "Restore"

**Via CLI:**
```bash
# Redeploy from previous commit
git checkout <previous-commit-hash>
cd frontend
npm run build
firebase deploy --only hosting
git checkout main  # Return to current branch
```

### Rollback Firestore Rules

```bash
# View rules history
firebase firestore:rules:list

# Restore from git
git checkout <previous-commit-hash> -- firestore.rules
firebase deploy --only firestore:rules
git checkout main -- firestore.rules  # Optional: keep rolled back version
```

### Rollback Storage Rules

```bash
git checkout <previous-commit-hash> -- storage.rules
firebase deploy --only storage
git checkout main -- storage.rules
```

---

## 🔐 Security Operations

### Review Authentication Events

```bash
# Failed login attempts
gcloud logging read 'resource.type=firebase_auth AND severity>=WARNING' \
  --limit 50 --project=[YOUR_PROJECT_ID]

# New user signups
gcloud logging read 'resource.type=firebase_auth AND jsonPayload.event_type="user.create"' \
  --limit 20 --project=[YOUR_PROJECT_ID]
```

### Audit Trail Review

**Check Recent Modifications:**
```javascript
// Query in Firestore Console
// Collection: auditLogs
// Order by: timestamp desc
// Limit: 100

// Filter by action type
action == "CLIENT_DELETED"

// Filter by specific client
resource_id == "client123"

// Filter by time range
timestamp >= "2025-12-15T00:00:00Z"
```

### Security Rules Validation

```bash
# Validate before deployment
firebase firestore:rules:validate

# Test rules with emulator
firebase emulators:start --only firestore,auth
# Run integration tests against emulator
```

### Revoke User Access

**Via Console:**
1. Go to: https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/authentication/users
2. Find user by email/UID
3. Click three dots > "Disable user"

**Via CLI:**
```bash
# Install Firebase Admin CLI
npm install -g firebase-admin-cli

# Disable user
firebase auth:disable <uid>
```

---

## 📊 Database Operations

### Firestore Backup

**Manual Backup:**
```bash
# Export all collections
gcloud firestore export gs://[YOUR_PROJECT_ID]-backups/$(date +%Y-%m-%d) \
  --project=[YOUR_PROJECT_ID] \
  --collection-ids=clients,affinityGroups,auditLogs
```

**Automated Backup (Recommended):**
1. Go to: https://console.cloud.google.com/firestore/schedules?project=[YOUR_PROJECT_ID]
2. Click "Create Schedule"
3. Set frequency: Daily at 2 AM UTC
4. Set retention: 30 days

### Firestore Restore

```bash
# List available backups
gsutil ls gs://[YOUR_PROJECT_ID]-backups/

# Restore from backup
gcloud firestore import gs://[YOUR_PROJECT_ID]-backups/2025-12-15 \
  --project=[YOUR_PROJECT_ID]
```

### Database Maintenance

**Delete Old Audit Logs (>90 days):**
```javascript
// Run in Functions or local script with admin SDK
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90);

const oldLogs = await db.collection('auditLogs')
  .where('timestamp', '<', cutoffDate)
  .limit(500)
  .get();

const batch = db.batch();
oldLogs.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();
```

**Clean Up Deleted Clients:**
```javascript
// Verify clients marked for deletion are fully removed
const deletedClients = await db.collection('clients')
  .where('deleted', '==', true)
  .where('deletedAt', '<', cutoffDate)
  .get();

// Delete subcollections and main document
```

---

## 🚀 Deployment Operations

### Standard Deployment Process

1. **Pre-Deployment Checks**
   ```bash
   cd /Users/fnoya/Projects/google/loyalty-gen
   bash run-all-tests.sh
   ```

2. **Backend Deployment**
   ```bash
   cd functions
   npm run lint
   npm run build
   npm test
   cd ..
   firebase deploy --only functions
   ```

3. **Frontend Deployment**
   ```bash
   cd frontend
   npm run lint
   npm run build
   cd ..
   firebase deploy --only hosting
   ```

4. **Post-Deployment Verification**
   ```bash
   # Test API
   curl https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/health
   
   # Test frontend
   curl -I https://[YOUR_PROJECT_ID].web.app
   
   # Monitor logs
   firebase functions:log --limit 20
   ```

### Hot Fixes

For critical production issues:

1. **Create hotfix branch**
   ```bash
   git checkout -b hotfix/critical-bug main
   ```

2. **Make minimal fix**
   ```bash
   # Edit only necessary files
   # Run tests for affected areas
   ```

3. **Deploy immediately**
   ```bash
   firebase deploy --only functions  # or hosting
   ```

4. **Monitor closely**
   ```bash
   firebase functions:log --follow
   ```

5. **Create PR and merge**
   ```bash
   git push origin hotfix/critical-bug
   # Create PR to main
   # Merge after verification
   ```

---

## 🛠️ Maintenance Tasks

### Daily Tasks

- [ ] Review error logs (5 min)
- [ ] Check service health (2 min)
- [ ] Monitor user authentication issues (3 min)

```bash
# Daily health check script
#!/bin/bash
echo "=== Daily Health Check ==="
echo "Frontend:" && curl -I https://[YOUR_PROJECT_ID].web.app | head -1
echo "API:" && curl https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/health
echo "Errors in last 24h:"
gcloud logging read "severity>=ERROR" --limit 10 --project=[YOUR_PROJECT_ID] --format="table(timestamp,jsonPayload.message)"
```

### Weekly Tasks

- [ ] Review Firestore usage and costs
- [ ] Check Cloud Functions performance metrics
- [ ] Review authentication patterns
- [ ] Update dependencies if needed
- [ ] Review backup retention

### Monthly Tasks

- [ ] Full system audit
- [ ] Performance optimization review
- [ ] Security rules review
- [ ] Cost analysis and optimization
- [ ] Update documentation
- [ ] Review and archive old audit logs
- [ ] Test restore procedures

---

## 💰 Cost Monitoring

### View Current Costs

```bash
# Firebase usage
# Visit: https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/usage/details

# GCP billing
# Visit: https://console.cloud.google.com/billing?project=[YOUR_PROJECT_ID]
```

### Cost Optimization Tips

1. **Firestore:**
   - Use collection group queries sparingly
   - Implement pagination (limit queries)
   - Cache frequently accessed data in frontend
   - Clean up old audit logs

2. **Cloud Functions:**
   - Optimize cold start time
   - Use minimum memory allocation
   - Implement request caching
   - Set max instances limit

3. **Storage:**
   - Implement lifecycle policies
   - Compress images before upload
   - Set storage limits per user

4. **Hosting:**
   - Enable CDN caching
   - Optimize bundle sizes
   - Use image optimization

### Budget Alerts

Set up in GCP Console:
1. Go to: https://console.cloud.google.com/billing/budgets?project=[YOUR_PROJECT_ID]
2. Create budget alert for monthly spend
3. Set thresholds: 50%, 75%, 100%
4. Configure email notifications

---

## 📞 Escalation Procedures

### Severity Levels

**P0 - Critical (System Down)**
- Response time: Immediate
- Action: All hands on deck, rollback if needed
- Notification: All team members + management

**P1 - High (Major Feature Broken)**
- Response time: 30 minutes
- Action: Investigate and fix within 2 hours
- Notification: Development team

**P2 - Medium (Minor Issues)**
- Response time: 2 hours
- Action: Fix in next deployment
- Notification: Team lead

**P3 - Low (Enhancement)**
- Response time: 24 hours
- Action: Plan for future sprint
- Notification: Product owner

### Contact List

- **On-Call Engineer:** [YOUR_NAME] ([YOUR_EMAIL])
- **Backup Engineer:** TBD
- **Product Owner:** TBD
- **DevOps Lead:** TBD

---

## 📚 Additional Resources

- **Architecture Documentation:** `/docs/ARCHITECTURE.md`
- **API Documentation:** `/openapi.yaml`
- **Security Guidelines:** `/docs/GUIDELINES.md`
- **Deployment Guide:** `/DEPLOYMENT-GUIDE.md`
- **Implementation Plan:** `/IMPLEMENTATION-PLAN.md`
- **Firebase Best Practices:** `/docs/FIREBASE-BEST-PRACTICES.md`

---

## 🔧 Common Issues & Solutions

### Issue: "Function execution took too long"

**Symptoms:** API requests timeout after 60 seconds

**Solutions:**
1. Check Firestore query performance
2. Review Cloud Function logs for slow operations
3. Increase function timeout if needed:
   ```javascript
   export const api = onRequest({
     timeoutSeconds: 300,
     memory: "256MB"
   }, app);
   ```
4. Optimize database queries (add indexes)

### Issue: "Authentication token expired"

**Symptoms:** 401 Unauthorized errors

**Solutions:**
1. Frontend should refresh token automatically
2. Check token refresh logic in `lib/firebase.ts`
3. Verify Firebase Auth is properly initialized
4. Clear browser cache and cookies

### Issue: "CORS errors on API calls"

**Symptoms:** Browser console shows CORS policy error

**Solutions:**
1. Verify API URL in frontend config
2. Check Cloud Function CORS middleware
3. Ensure request includes proper headers
4. Verify function is deployed and accessible

### Issue: "Firestore permission denied"

**Symptoms:** Permission denied errors in logs

**Solutions:**
1. Review Firestore security rules
2. Verify user is authenticated
3. Check token contains required claims
4. Test rules in emulator first

---

**Document Version:** 1.0  
**Status:** Production Ready  
**Maintained by:** [YOUR_NAME]
