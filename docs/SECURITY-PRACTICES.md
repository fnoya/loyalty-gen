# Security Practices for LoyaltyGen

**Last Updated:** December 18, 2025  
**Status:** Production Security Guidelines

---

## Overview

This document outlines security practices for the LoyaltyGen project, with a focus on protecting sensitive information and maintaining secure development practices.

---

## Sensitive Data Management

### What is Considered Sensitive?

**NEVER commit the following to the repository:**

1. **API Keys & Secrets**
   - Firebase API keys
   - Service account keys
   - OAuth client secrets
   - Third-party API keys

2. **Project Identifiers**
   - Firebase Project IDs (in production docs)
   - Project Numbers
   - App IDs
   - Deployment URLs containing project-specific identifiers

3. **Personal Information**
   - Email addresses
   - Phone numbers
   - Real user data

4. **Authentication Credentials**
   - Passwords
   - JWT tokens
   - Session tokens
   - Service account JSON files

5. **Infrastructure Details**
   - Production database connection strings
   - Internal network configurations
   - Server IP addresses

---

## Protecting Sensitive Data

### 1. Environment Variables

**Always use environment variables for sensitive configuration:**

```bash
# ✅ CORRECT - Use placeholders in documentation
NEXT_PUBLIC_FIREBASE_API_KEY=[YOUR_FIREBASE_API_KEY]
NEXT_PUBLIC_FIREBASE_PROJECT_ID=[YOUR_PROJECT_ID]

# ❌ WRONG - Never hardcode actual values
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCgnoUdjZeaby9djiGeE-SO6RN_zdzOKFk
```

### 2. .gitignore Configuration

Ensure the following are in `.gitignore`:

```
# Environment files
.env
.env.local
.env.*.local
.env.production
frontend/.env
frontend/.env.local
frontend/.env.production

# Service accounts
service-account.json
*-service-account.json
```

### 3. GitHub Secrets

For CI/CD, use GitHub Secrets instead of hardcoding:

```yaml
# ✅ CORRECT
env:
  PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
  FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}

# ❌ WRONG
env:
  PROJECT_ID: geoloyaltycloud
```

### 4. Documentation Guidelines

When writing documentation:

**Use placeholders:**
- `[YOUR_PROJECT_ID]` instead of actual project ID
- `[YOUR_FIREBASE_API_KEY]` instead of actual API key
- `[YOUR_EMAIL]` instead of actual email addresses
- `[YOUR_APP_ID]` instead of actual app IDs

**Example:**

```markdown
# ✅ GOOD
curl https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/health

# ❌ BAD
curl https://us-central1-geoloyaltycloud.cloudfunctions.net/api/health
```

---

## Firebase Security Best Practices

### 1. API Key Protection

**Important:** Firebase Web API keys are safe to include in client-side code as they identify the Firebase project, not authenticate requests. However:

- For documentation, still use placeholders
- Actual keys can be in `.env.production` (which is gitignored)
- Security is enforced by Firestore Rules and Firebase Auth

### 2. Service Account Keys

**CRITICAL:** Service account keys provide admin access.

```bash
# ✅ Store securely
# - Use GitHub Secrets for CI/CD
# - Use Firebase environment config for Cloud Functions
# - Never commit to repository

# ❌ NEVER do this
git add service-account.json
```

### 3. Firestore Security Rules

Always use authentication and authorization rules:

```javascript
// ✅ CORRECT - Require authentication
match /clients/{clientId} {
  allow read, write: if request.auth != null;
}

// ❌ WRONG - Open access
match /clients/{clientId} {
  allow read, write: if true;
}
```

---

## Code Security Practices

### 1. Logging

**NEVER log sensitive data:**

```typescript
// ❌ BAD - Logs sensitive data
console.log('User token:', authToken);
console.log('Request:', JSON.stringify(req)); // May contain tokens

// ✅ GOOD - Log without sensitive data
console.log('Authentication successful');
console.log('Request path:', req.path);
```

### 2. Error Messages

**Don't expose internal details in production errors:**

```typescript
// ❌ BAD - Exposes internal structure
throw new Error(`Database error: ${dbConnection.host}`);

// ✅ GOOD - Generic error message
throw new Error('Database connection failed');
// Log details server-side only
logger.error('DB connection failed', { host: dbConnection.host });
```

### 3. Input Validation

Always validate and sanitize user input:

```typescript
// ✅ Use Zod schemas for validation
const clientSchema = z.object({
  name: z.object({
    firstName: z.string().min(1).max(100),
    firstLastName: z.string().min(1).max(100),
  }),
  email: z.string().email(),
});
```

---

## Deployment Security

### 1. Pre-Deployment Checklist

- [ ] No secrets in code
- [ ] Environment variables configured
- [ ] `.gitignore` includes all sensitive files
- [ ] Security rules deployed
- [ ] npm audit passes (no high/critical vulnerabilities)

### 2. GitHub Actions Security

```yaml
# Use secrets for all sensitive values
- name: Deploy to Firebase
  env:
    FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
    FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
  run: |
    echo "$FIREBASE_SERVICE_ACCOUNT" > "$HOME/firebase-service-account.json"
    firebase deploy --project $FIREBASE_PROJECT_ID
```

### 3. Service Account Management

**Principle of Least Privilege:**
- Only grant necessary permissions
- Use different service accounts for different environments
- Rotate keys regularly
- Revoke unused keys immediately

---

## Incident Response

### If Sensitive Data is Committed

1. **Immediate Actions:**
   ```bash
   # DO NOT just delete the file and commit
   # The data is still in git history!
   
   # Option 1: Use git-filter-repo (recommended)
   pip install git-filter-repo
   git filter-repo --path sensitive-file.json --invert-paths
   
   # Option 2: Use BFG Repo-Cleaner
   # Download from https://rtyley.github.io/bfg-repo-cleaner/
   bfg --delete-files sensitive-file.json
   ```

2. **Revoke Compromised Credentials:**
   - Rotate API keys immediately
   - Revoke service account keys
   - Generate new secrets

3. **Force Push (if private repo):**
   ```bash
   git push --force --all
   git push --force --tags
   ```

4. **If Public Repository:**
   - Treat all exposed credentials as compromised
   - Revoke immediately
   - Create new credentials
   - Consider deleting and recreating the repository

---

## Monitoring & Auditing

### 1. Regular Security Audits

```bash
# Run monthly
npm audit --audit-level=high
npm outdated

# Check for leaked secrets
# Use tools like:
# - git-secrets
# - truffleHog
# - GitGuardian
```

### 2. Access Reviews

- Review Firebase IAM permissions quarterly
- Audit service account usage
- Review GitHub collaborator access
- Check deployed environment variables

### 3. Log Monitoring

Monitor for suspicious activity:
- Failed authentication attempts
- Unusual API usage patterns
- Database access anomalies
- Deployment failures

---

## Developer Onboarding

### New Developer Checklist

1. **Environment Setup:**
   - Clone repository
   - Copy `.env.example` to `.env.local`
   - Request access to Firebase project
   - Get necessary API keys from team lead

2. **Security Training:**
   - Read this document
   - Understand what data is sensitive
   - Know how to use environment variables
   - Learn incident response procedures

3. **Tool Setup:**
   - Install git-secrets or similar
   - Enable pre-commit hooks
   - Configure IDE to warn about sensitive patterns

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Rules Documentation](https://firebase.google.com/docs/rules)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## Contact

For security concerns or questions:
- **Security Issues:** Report via GitHub Security Advisories
- **Questions:** Contact project maintainer

---

**Remember:** When in doubt, treat information as sensitive. It's better to be overly cautious than to expose sensitive data.

**Document Version:** 1.0  
**Status:** Active
