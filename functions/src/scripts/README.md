# Scripts Directory

This directory contains utility scripts for the LoyaltyGen platform.

## Seed Script

### Overview

The `seed.ts` script populates the Firestore database with sample data for development and testing purposes. This includes:

- **Affinity Groups**: 3 sample groups (VIP, Frequent Buyers, New Customers)
- **Clients**: 4 sample clients with various configurations:
  - Francisco Noya (email + cedula_identidad, phones, addresses, VIP)
  - María Elena González Pérez (email + pasaporte, multiple phones, VIP + Frequent)
  - Juan Carlos Rodríguez (email only, New Customer)
  - Ana Martínez López (cedula_identidad only, no email, Frequent)
- **Loyalty Accounts**: Multiple accounts per client
- **Transactions**: Sample credit and debit transactions

### Usage

#### With Firebase Emulator (Recommended for Development)

```bash
# Start the Firebase emulator
firebase emulators:start

# In another terminal, run the seed script
cd functions
FIRESTORE_EMULATOR_HOST="localhost:8080" npm run seed
```

#### With Production Firestore (Use with Caution)

**⚠️ WARNING:** This will clear all existing data in the target Firestore database!

```bash
# Ensure you have valid Firebase credentials configured
# Set GOOGLE_APPLICATION_CREDENTIALS environment variable if needed

cd functions
npm run seed
```

### Sample Data Structure

#### Clients

All clients include structured names with search fields:
- `firstName`, `secondName`, `firstLastName`, `secondLastName`
- `firstName_lower`, `secondName_lower`, `firstSurname_lower`, `secondSurname_lower` (for case-insensitive search)
- `phoneNumbers` array (for phone search)

Example client structure:
```json
{
  "name": {
    "firstName": "Francisco",
    "secondName": null,
    "firstLastName": "Noya",
    "secondLastName": null
  },
  "firstName_lower": "francisco",
  "firstSurname_lower": "noya",
  "email": "francisco.noya@example.com",
  "identity_document": {
    "type": "cedula_identidad",
    "number": "12345678",
    "number_lower": "12345678"
  },
  "phones": [...],
  "phoneNumbers": ["99123456"],
  "addresses": [...],
  "affinityGroupIds": ["vip-customers"],
  "account_balances": {
    "acc-points-1": 1500,
    "acc-bonus-1": 500
  }
}
```

#### Affinity Groups

- **vip-customers**: Clientes VIP (high-volume purchasers)
- **frequent-buyers**: Compradores Frecuentes (regular buyers)
- **new-customers**: Clientes Nuevos (recently registered)

#### Loyalty Accounts

Each client has one or more loyalty accounts with initial point balances:
- Francisco: 1500 general points + 500 bonus points
- María: 2500 points
- Juan: 100 points  
- Ana: 800 points

#### Transactions

Sample transactions demonstrate:
- **Credit transactions**: Welcome bonuses, purchases, promotions
- **Debit transactions**: Product redemptions

### Search Features

The seeded data supports the Firestore-based search implementation:

1. **Name Search** (case-insensitive):
   - Single name: "francisco" or "noya"
   - Full name: "francisco noya" (searches firstName AND firstSurname)

2. **Document Search**:
   - "12345678" finds Francisco
   - "ab123456" finds María (case-insensitive)

3. **Phone Search** (startsWith):
   - "99123456" finds Francisco
   - "98765432" finds María

### Data Safety

The script includes a `clearCollections()` function that:
- Deletes all existing clients (including subcollections)
- Deletes all affinity groups
- Deletes all audit logs

This ensures a clean state before seeding but **will destroy existing data**.

### Customization

To customize the seed data:

1. Edit the arrays at the top of `seed.ts`:
   - `sampleGroups`
   - `sampleClients`
   - `sampleAccounts`
   - `sampleTransactions`

2. Follow the existing data structure to ensure compatibility with the API schemas

3. Run the seed script again

### Troubleshooting

#### "Firebase Admin app not initialized"
- Ensure Firebase emulator is running OR
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable OR
- Initialize `gcloud auth application-default login`

#### "Permission denied"
- Check Firestore security rules
- Ensure your Firebase project has proper permissions configured

#### "Module not found"
- Run `npm install` in the `functions` directory

### Related Documentation

- [WORK-PLAN.md](../../../WORK-PLAN.md) - Full project implementation plan
- [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) - System architecture
- [FIRESTORE-SEARCH-SOLUTION.md](../../../docs/FIRESTORE-SEARCH-SOLUTION.md) - Search implementation details
