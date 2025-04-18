import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Set a global flag to indicate if we have a valid API key
// This will be used in tests to determine whether to run real API tests
global.HAS_API_KEY = Boolean(process.env.OPENAI_API_KEY);

// If no API key is provided, use a dummy one for tests that mock API calls
if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY environment variable is not set. Tests will run in mock mode.');
  process.env.OPENAI_API_KEY = 'dummy-api-key-for-tests';
}
