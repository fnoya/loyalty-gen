# LoyaltyGen - Deployment Guide

**Project:** LoyaltyGen Customer Loyalty Platform  
**Date:** December 15, 2025  
**Status:** Phase 12 - Production Deployment Ready  
**Firebase Project:** [YOUR_PROJECT_ID]

---

## 📋 Table of Contents

1. [Deployment Prerequisites](#deployment-prerequisites)
2. [Pre-Deployment Validation](#pre-deployment-validation)
3. [Firebase Project Setup](#firebase-project-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring and Alerts](#monitoring-and-alerts)
8. [Rollback Procedures](#rollback-procedures)
9. [Environment Variables](#environment-variables)
10. [Troubleshooting](#troubleshooting)

---

## 🔐 Deployment Prerequisites

### Required Accounts & Access
- ✅ Firebase/GCP account with billing enabled
- ✅ Firebase project created: `[YOUR_PROJECT_ID]`
- ✅ Firebase CLI installed: `npm install -g firebase-tools`
- ✅ Authenticated to Firebase: `firebase login`
- ✅ Node.js 24+ LTS installed
- ⚠️  **CRITICAL**: Firebase Blaze (pay-as-you-go) plan required for Cloud Functions

### Pre-Deployment Checklist
- ✅ All 751 tests passing (352 backend + 283 frontend + 116 integration)
- ✅ Code coverage > 80% (Backend: 95.88%, Frontend: TBD)
- ✅ ESLint passes with 0 errors (24 warnings acceptable)
- ✅ No high/critical npm vulnerabilities
- ✅ All feature branches merged to main
- ✅ Git working directory clean

**Validation Results (Dec 15, 2025):**
```
✅ Backend Tests:     352 passed, 0 failed
✅ Frontend Tests:    283 passed, 0 failed
✅ Integration Tests: 116 passed, 0 failed
✅ Total:            751 passed, 0 failed
✅ Coverage:         95.88% lines (backend)
✅ Security:         0 high/critical vulnerabilities
✅ Linting:          0 errors, 24 warnings
```

---

## ✅ Pre-Deployment Validation

Run the comprehensive test suite before any deployment:

```bash
cd /Users/fnoya/Projects/google/loyalty-gen
bash run-all-tests.sh
```

Expected output:
```
╔════════════════════════════════════════════════════════════════════════════════╗
║                       ✅ ALL TESTS PASSED                                      ║
╠════════════════════════════════════════════════════════════════════════════════╣
║  Backend Tests:     352 passed, 0 failed                                       ║
║  Frontend Tests:    283 passed, 0 failed                                       ║
║  Integration Tests: 116 passed, 0 failed                                      ║
║  Total:            751 passed, 0 failed (751 tests)                            ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

Run security audit:
```bash
cd functions && npm audit --audit-level=high
cd ../frontend && npm audit --audit-level=high
```

---

## 🔥 Firebase Project Setup

### 1. Project Information
- **Project ID:** `[YOUR_PROJECT_ID]`
- **Project Number:** `[YOUR_PROJECT_NUMBER]`
- **Region:** `us-central1` (Cloud Functions)
- **Firestore Region:** `nam5` (North America)
- **Console:** https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/overview

### 2. Enable Required Services

**⚠️ CRITICAL: Upgrade to Blaze Plan**

Cloud Functions require the Blaze (pay-as-you-go) plan. Visit:
```
https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/usage/details
```

**Required APIs:**
- ✅ Cloud Firestore API
- ⚠️  Cloud Functions API (requires Blaze plan)
- ⚠️  Cloud Build API (requires Blaze plan)
- ⚠️  Artifact Registry API (requires Blaze plan)
- ⚠️  Firebase Storage API (requires manual setup)

### 3. Initialize Firebase Services

Already completed:
```bash
# Firestore with indexes and rules
✅ firebase deploy --only firestore

# Result:
✔  firestore: deployed indexes in firestore.indexes.json successfully
✔  firestore: released rules firestore.rules to cloud.firestore
```

### 4. Web App Configuration

Web app created with following details:
- **App ID:** `[YOUR_APP_ID]`
- **Display Name:** LoyaltyGen Web App
- **Configuration saved to:** `frontend/.env.production`

---

## 🚀 Backend Deployment

### 1. Build and Validate

```bash
cd functions
npm run lint
npm run build
npm test
```

### 2. Deploy Cloud Functions

**⚠️ REQUIRES BLAZE PLAN**

```bash
cd /Users/fnoya/Projects/google/loyalty-gen
firebase deploy --only functions
```

Expected output:
```
✔  functions: Finished running predeploy script.
i  functions: preparing codebase default for deployment
✔  functions[api(us-central1)]: Successful create operation.
Function URL (api(us-central1)): https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api
✔  Deploy complete!
```

### 3. Verify Backend Deployment

```bash
# Test health endpoint
curl https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-12-15T..."}
```

### 4. Deploy Storage Rules

**Note:** Firebase Storage must be initialized in console first:
```
https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/storage
```

Then deploy rules:
```bash
firebase deploy --only storage
```

---

## 🎨 Frontend Deployment

### 1. Environment Configuration

Production environment file already created at `frontend/.env.production`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=[YOUR_FIREBASE_API_KEY]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[YOUR_PROJECT_ID].firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=[YOUR_PROJECT_ID]
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=[YOUR_PROJECT_ID].firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=[YOUR_MESSAGING_SENDER_ID]
NEXT_PUBLIC_FIREBASE_APP_ID=[YOUR_APP_ID]
NEXT_PUBLIC_API_BASE_URL=https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/v1
```

### 2. Build Next.js Application

```bash
cd frontend
npm run build
```

Expected output:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    ...      ...
├ ○ /dashboard                           ...      ...
├ ○ /dashboard/audit                     ...      ...
├ ○ /dashboard/clients                   ...      ...
└ ○ /dashboard/groups                    ...      ...

○  (Static)  prerendered as static content

✓ Compiled successfully
```

### 3. Deploy to Firebase Hosting

```bash
cd /Users/fnoya/Projects/google/loyalty-gen
firebase deploy --only hosting
```

Expected output:
```
✔  hosting[[YOUR_PROJECT_ID]]: file upload complete
✔  hosting[[YOUR_PROJECT_ID]]: version finalized
✔  hosting[[YOUR_PROJECT_ID]]: release complete

Hosting URL: https://[YOUR_PROJECT_ID].web.app
```

### 4. Complete Deployment (All Services)

```bash
# Deploy everything at once (after Blaze upgrade)
firebase deploy
```

---

## ✅ Post-Deployment Verification

### 1. Frontend Health Check

Visit: https://[YOUR_PROJECT_ID].web.app

Expected:
- ✅ Login page loads
- ✅ No console errors
- ✅ Firebase SDK initializes

### 2. Backend API Health Check

```bash
# Health endpoint
curl https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/health

# Get API version
curl https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/v1
```

### 3. Authentication Flow

1. Navigate to: https://[YOUR_PROJECT_ID].web.app
2. Click "Sign In with Google"
3. Complete authentication
4. Verify redirect to dashboard

### 4. API Functionality Test

```bash
# Create test user (requires auth token)
# Get token from Firebase Console > Authentication > Users

AUTH_TOKEN="<your-token-here>"

curl -X POST https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/v1/clients \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": {
      "firstName": "Test",
      "firstLastName": "User"
    },
    "email": "test@example.com"
  }'
```

### 5. Firestore Connectivity

Check Firebase Console:
```
https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/firestore
```

Verify collections:
- `clients/`
- `affinityGroups/`
- `auditLogs/`

---

## 📊 Monitoring and Alerts

### 1. Cloud Functions Logs

View logs in Firebase Console:
```
https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/functions/logs
```

Or via CLI:
```bash
firebase functions:log
```

### 2. Firestore Usage

Monitor at:
```
https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/firestore/usage
```

### 3. Hosting Analytics

```
https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/hosting
```

### 4. Error Reporting

Enable Google Cloud Error Reporting:
```
https://console.cloud.google.com/errors?project=[YOUR_PROJECT_ID]
```

### 5. Performance Monitoring

Enable Firebase Performance Monitoring:
```bash
# Add to frontend package.json
npm install firebase

# Update frontend initialization to include performance
import { getPerformance } from 'firebase/performance';
const perf = getPerformance(app);
```

---

## 🔄 Rollback Procedures

### Rollback Cloud Functions

```bash
# List recent deployments
firebase functions:log

# Rollback to previous version (via Console)
# https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/functions
# Select function > Version History > Rollback
```

### Rollback Hosting

```bash
# List releases
firebase hosting:channel:list

# Rollback via Console
# https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/hosting
# Release History > Previous Release > Restore
```

### Rollback Firestore Rules

```bash
# Restore from git
git checkout HEAD~1 -- firestore.rules
firebase deploy --only firestore:rules
```

---

## 🔐 Environment Variables

### Production Environment

**Frontend** (`frontend/.env.production`):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=[YOUR_FIREBASE_API_KEY]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[YOUR_PROJECT_ID].firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=[YOUR_PROJECT_ID]
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=[YOUR_PROJECT_ID].firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=[YOUR_MESSAGING_SENDER_ID]
NEXT_PUBLIC_FIREBASE_APP_ID=[YOUR_APP_ID]
NEXT_PUBLIC_API_BASE_URL=https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/v1
```

**Backend** (Cloud Functions - set via Firebase):
```bash
# Currently using Firebase Admin SDK default credentials
# No additional environment variables required for production
```

### Setting Cloud Functions Environment Variables

```bash
firebase functions:config:set someservice.key="THE API KEY"
firebase deploy --only functions
```

---

## 🔧 Troubleshooting

### Issue: "Missing required API cloudbuild.googleapis.com"

**Solution:** Upgrade to Blaze plan:
```
https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/usage/details
```

### Issue: "Storage not initialized"

**Solution:** Initialize Storage in console:
```
https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/storage
Click "Get Started"
```

### Issue: 401 Unauthorized on API requests

**Solution:** 
1. Check Firebase Authentication is enabled
2. Verify token is valid and not expired
3. Check token is passed in Authorization header: `Bearer <token>`

### Issue: CORS errors on API calls

**Solution:** Cloud Functions automatically handle CORS. Check:
1. API URL is correct in frontend config
2. Request includes proper headers
3. Function is deployed and accessible

### Issue: Frontend 404 on refresh

**Solution:** Firebase Hosting rewrites configured in `firebase.json`:
```json
{
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

---

## 📝 Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment
- [ ] All tests passing (run `bash run-all-tests.sh`)
- [ ] Code coverage > 80%
- [ ] No ESLint errors
- [ ] No high/critical vulnerabilities
- [ ] Environment variables updated
- [ ] Git branch up to date with main
- [ ] Change log updated

### Deployment
- [ ] Backend built successfully (`cd functions && npm run build`)
- [ ] Frontend built successfully (`cd frontend && npm run build`)
- [ ] Cloud Functions deployed (`firebase deploy --only functions`)
- [ ] Hosting deployed (`firebase deploy --only hosting`)
- [ ] Firestore rules updated if needed
- [ ] Storage rules updated if needed

### Post-Deployment
- [ ] Health endpoint responding
- [ ] Frontend loads without errors
- [ ] Authentication flow works
- [ ] API requests succeed
- [ ] Firestore reads/writes work
- [ ] Storage uploads work (if applicable)
- [ ] Monitor logs for errors (15 minutes)
- [ ] Team notified of deployment

---

## 🎯 Next Steps After Deployment

1. **Monitor Initial Traffic**
   - Watch Cloud Functions logs for errors
   - Monitor Firestore usage
   - Check authentication success rate

2. **Performance Optimization**
   - Enable Firebase Performance Monitoring
   - Set up Cloud Monitoring alerts
   - Configure log-based metrics

3. **Security Hardening**
   - Review Firestore security rules
   - Set up API rate limiting
   - Configure DDoS protection

4. **Backup Strategy**
   - Enable Firestore automated backups
   - Document restore procedures
   - Test backup restoration

5. **User Onboarding**
   - Create admin user accounts
   - Import initial client data
   - Configure affinity groups

---

## 📞 Support Contacts

- **Project Lead:** [YOUR_NAME] ([YOUR_EMAIL])
- **Firebase Console:** https://console.firebase.google.com/project/[YOUR_PROJECT_ID]
- **GCP Console:** https://console.cloud.google.com/home/dashboard?project=[YOUR_PROJECT_ID]
- **Documentation:** See `docs/` directory

---

**Document Version:** 1.0  
**Last Updated:** December 15, 2025  
**Status:** ✅ Ready for Production Deployment (pending Blaze upgrade)
