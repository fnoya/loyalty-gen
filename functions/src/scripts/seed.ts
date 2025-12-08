#!/usr/bin/env ts-node

/**
 * Seed Script for LoyaltyGen Platform
 * 
 * This script populates the Firestore database with sample data for development and testing.
 * 
 * Usage:
 *   npm run seed
 * 
 * Requirements:
 *   - Firebase emulator running OR
 *   - FIRESTORE_EMULATOR_HOST environment variable set OR
 *   - Valid Firebase project credentials
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`🔧 Using Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  admin.initializeApp({ projectId: 'loyalty-cloud' });
} else {
  console.log('🌐 Using production Firestore (ensure you have credentials configured)');
  admin.initializeApp();
}

const db = admin.firestore();

// Sample Data

const sampleGroups = [
  {
    id: 'vip-customers',
    name: 'Clientes VIP',
    description: 'Clientes con alto volumen de compras',
  },
  {
    id: 'frequent-buyers',
    name: 'Compradores Frecuentes',
    description: 'Clientes que compran regularmente',
  },
  {
    id: 'new-customers',
    name: 'Clientes Nuevos',
    description: 'Clientes registrados en los últimos 30 días',
  },
];

const sampleClients = [
  {
    id: 'client-francisco',
    name: {
      firstName: 'Francisco',
      secondName: null,
      firstLastName: 'Noya',
      secondLastName: null,
    },
    firstName_lower: 'francisco',
    firstSurname_lower: 'noya',
    email: 'francisco.noya@example.com',
    identity_document: {
      type: 'cedula_identidad',
      number: '12345678',
      number_lower: '12345678',
    },
    phones: [
      {
        type: 'mobile',
        number: '+598 99 123 456',
        extension: null,
        isPrimary: true,
      },
    ],
    phoneNumbers: ['99123456'], // For search
    addresses: [
      {
        type: 'home',
        street: 'Av. Brasil',
        buildingBlock: null,
        number: '2889',
        apartment: '101',
        locality: 'Montevideo',
        state: 'Montevideo',
        postalCode: '11300',
        country: 'UY',
        isPrimary: true,
      },
    ],
    photoUrl: null,
    extra_data: {
      preferredLanguage: 'es',
      marketingConsent: true,
    },
    affinityGroupIds: ['vip-customers'],
    account_balances: {},
  },
  {
    id: 'client-maria',
    name: {
      firstName: 'María',
      secondName: 'Elena',
      firstLastName: 'González',
      secondLastName: 'Pérez',
    },
    firstName_lower: 'maría',
    secondName_lower: 'elena',
    firstSurname_lower: 'gonzález',
    secondSurname_lower: 'pérez',
    email: 'maria.gonzalez@example.com',
    identity_document: {
      type: 'pasaporte',
      number: 'AB123456',
      number_lower: 'ab123456',
    },
    phones: [
      {
        type: 'mobile',
        number: '+598 98 765 432',
        extension: null,
        isPrimary: true,
      },
      {
        type: 'work',
        number: '+598 2 123 4567',
        extension: '102',
        isPrimary: false,
      },
    ],
    phoneNumbers: ['98765432', '21234567'], // For search
    addresses: [
      {
        type: 'home',
        street: 'Calle Uruguay',
        buildingBlock: 'Torre A',
        number: '1234',
        apartment: '501',
        locality: 'Montevideo',
        state: 'Montevideo',
        postalCode: '11100',
        country: 'UY',
        isPrimary: true,
      },
    ],
    photoUrl: null,
    extra_data: {
      preferredLanguage: 'es',
      birthday: '1985-05-15',
    },
    affinityGroupIds: ['vip-customers', 'frequent-buyers'],
    account_balances: {},
  },
  {
    id: 'client-juan',
    name: {
      firstName: 'Juan',
      secondName: 'Carlos',
      firstLastName: 'Rodríguez',
      secondLastName: null,
    },
    firstName_lower: 'juan',
    secondName_lower: 'carlos',
    firstSurname_lower: 'rodríguez',
    email: 'juan.rodriguez@example.com',
    identity_document: null,
    phones: [
      {
        type: 'mobile',
        number: '+598 95 555 777',
        extension: null,
        isPrimary: true,
      },
    ],
    phoneNumbers: ['95555777'], // For search
    addresses: [],
    photoUrl: null,
    extra_data: {},
    affinityGroupIds: ['new-customers'],
    account_balances: {},
  },
  {
    id: 'client-ana',
    name: {
      firstName: 'Ana',
      secondName: null,
      firstLastName: 'Martínez',
      secondLastName: 'López',
    },
    firstName_lower: 'ana',
    firstSurname_lower: 'martínez',
    secondSurname_lower: 'lópez',
    email: null,
    identity_document: {
      type: 'cedula_identidad',
      number: '87654321',
      number_lower: '87654321',
    },
    phones: [],
    phoneNumbers: [], // For search
    addresses: [
      {
        type: 'home',
        street: '18 de Julio',
        buildingBlock: null,
        number: '1234',
        apartment: null,
        locality: 'Montevideo',
        state: 'Montevideo',
        postalCode: '11200',
        country: 'UY',
        isPrimary: true,
      },
    ],
    photoUrl: null,
    extra_data: {
      notes: 'Cliente preferente sin email',
    },
    affinityGroupIds: ['frequent-buyers'],
    account_balances: {},
  },
];

const sampleAccounts = [
  {
    clientId: 'client-francisco',
    accountId: 'acc-points-1',
    account_name: 'Puntos Generales',
    points: 1500,
  },
  {
    clientId: 'client-francisco',
    accountId: 'acc-bonus-1',
    account_name: 'Puntos Bonus',
    points: 500,
  },
  {
    clientId: 'client-maria',
    accountId: 'acc-points-2',
    account_name: 'Puntos Generales',
    points: 2500,
  },
  {
    clientId: 'client-juan',
    accountId: 'acc-points-3',
    account_name: 'Puntos Generales',
    points: 100,
  },
  {
    clientId: 'client-ana',
    accountId: 'acc-points-4',
    account_name: 'Puntos Generales',
    points: 800,
  },
];

const sampleTransactions = [
  {
    clientId: 'client-francisco',
    accountId: 'acc-points-1',
    transactionId: 'txn-1',
    transaction_type: 'credit',
    amount: 1000,
    description: 'Bono de bienvenida',
  },
  {
    clientId: 'client-francisco',
    accountId: 'acc-points-1',
    transactionId: 'txn-2',
    transaction_type: 'credit',
    amount: 500,
    description: 'Compra en tienda',
  },
  {
    clientId: 'client-francisco',
    accountId: 'acc-bonus-1',
    transactionId: 'txn-3',
    transaction_type: 'credit',
    amount: 500,
    description: 'Bonus por referido',
  },
  {
    clientId: 'client-maria',
    accountId: 'acc-points-2',
    transactionId: 'txn-4',
    transaction_type: 'credit',
    amount: 2000,
    description: 'Compras acumuladas',
  },
  {
    clientId: 'client-maria',
    accountId: 'acc-points-2',
    transactionId: 'txn-5',
    transaction_type: 'credit',
    amount: 1000,
    description: 'Promoción especial',
  },
  {
    clientId: 'client-maria',
    accountId: 'acc-points-2',
    transactionId: 'txn-6',
    transaction_type: 'debit',
    amount: 500,
    description: 'Canje de producto',
  },
  {
    clientId: 'client-juan',
    accountId: 'acc-points-3',
    transactionId: 'txn-7',
    transaction_type: 'credit',
    amount: 100,
    description: 'Primera compra',
  },
  {
    clientId: 'client-ana',
    accountId: 'acc-points-4',
    transactionId: 'txn-8',
    transaction_type: 'credit',
    amount: 800,
    description: 'Acumulación mensual',
  },
];

/**
 * Clear all collections before seeding
 */
async function clearCollections() {
  console.log('🗑️  Clearing existing data...');

  // Clear clients and their subcollections
  const clientsSnapshot = await db.collection('clients').get();
  for (const clientDoc of clientsSnapshot.docs) {
    // Delete subcollections first
    const accountsSnapshot = await clientDoc.ref.collection('loyaltyAccounts').get();
    for (const accountDoc of accountsSnapshot.docs) {
      const transactionsSnapshot = await accountDoc.ref.collection('transactions').get();
      for (const txnDoc of transactionsSnapshot.docs) {
        await txnDoc.ref.delete();
      }
      await accountDoc.ref.delete();
    }
    await clientDoc.ref.delete();
  }

  // Clear affinity groups
  const groupsSnapshot = await db.collection('affinityGroups').get();
  for (const groupDoc of groupsSnapshot.docs) {
    await groupDoc.ref.delete();
  }

  // Clear audit logs
  const auditLogsSnapshot = await db.collection('auditLogs').get();
  for (const logDoc of auditLogsSnapshot.docs) {
    await logDoc.ref.delete();
  }

  console.log('✅ Collections cleared');
}

/**
 * Seed affinity groups
 */
async function seedGroups() {
  console.log('📦 Seeding affinity groups...');

  for (const group of sampleGroups) {
    const { id, ...data } = group;
    await db
      .collection('affinityGroups')
      .doc(id)
      .set({
        ...data,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    console.log(`  ✓ Created group: ${data.name}`);
  }

  console.log('✅ Affinity groups seeded');
}

/**
 * Seed clients
 */
async function seedClients() {
  console.log('👥 Seeding clients...');

  for (const client of sampleClients) {
    const { id, ...data } = client;
    await db
      .collection('clients')
      .doc(id)
      .set({
        ...data,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    console.log(`  ✓ Created client: ${data.name.firstName} ${data.name.firstLastName}`);
  }

  console.log('✅ Clients seeded');
}

/**
 * Seed loyalty accounts and transactions
 */
async function seedAccountsAndTransactions() {
  console.log('💳 Seeding loyalty accounts and transactions...');

  for (const account of sampleAccounts) {
    const { clientId, accountId, ...accountData } = account;

    // Create account
    await db
      .collection('clients')
      .doc(clientId)
      .collection('loyaltyAccounts')
      .doc(accountId)
      .set({
        ...accountData,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Update client's account_balances
    await db
      .collection('clients')
      .doc(clientId)
      .update({
        [`account_balances.${accountId}`]: account.points,
      });

    console.log(`  ✓ Created account: ${accountData.account_name} for client ${clientId}`);

    // Add transactions for this account
    const accountTransactions = sampleTransactions.filter(
      (txn) => txn.clientId === clientId && txn.accountId === accountId
    );

    for (const transaction of accountTransactions) {
      const { clientId: txnClientId, accountId: txnAccountId, transactionId, ...txnData } = transaction;

      await db
        .collection('clients')
        .doc(txnClientId)
        .collection('loyaltyAccounts')
        .doc(txnAccountId)
        .collection('transactions')
        .doc(transactionId)
        .set({
          ...txnData,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

      console.log(`    ✓ Added transaction: ${txnData.transaction_type} ${txnData.amount} pts`);
    }
  }

  console.log('✅ Loyalty accounts and transactions seeded');
}

/**
 * Main seed function
 */
async function seed() {
  try {
    console.log('🌱 Starting seed process...\n');

    await clearCollections();
    await seedGroups();
    await seedClients();
    await seedAccountsAndTransactions();

    console.log('\n🎉 Seed process completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${sampleGroups.length} affinity groups`);
    console.log(`  - ${sampleClients.length} clients`);
    console.log(`  - ${sampleAccounts.length} loyalty accounts`);
    console.log(`  - ${sampleTransactions.length} transactions`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seed process:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
