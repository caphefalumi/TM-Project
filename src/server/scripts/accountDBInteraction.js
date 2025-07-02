import connectDB from '../config/db.js';
import Account from '../models/Account.js';

// test purposes only

async function addAccount(username, email, password) {
  await connectDB(); // Ensure DB is connected

  const account = new Account({ username, email, password });
  await account.save(); // Password will be hashed by the pre-save hook

  console.log('Account created:', account);
}

// Example usage:
// addAccount('mingsy', 'test@example.com', 'plainpassword');