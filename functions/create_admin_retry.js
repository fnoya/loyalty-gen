const admin = require('firebase-admin');

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = 'loyalty-gen';

admin.initializeApp({
  projectId: 'loyalty-gen'
});

async function createAdmin() {
  try {
    const user = await admin.auth().createUser({
      email: 'admin@example.com',
      password: 'password123',
      emailVerified: true
    });
    console.log('Successfully created new user:', user.uid);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
        console.log('User already exists.');
    } else {
        console.log('Error creating new user:', error);
    }
  }
}

createAdmin();
