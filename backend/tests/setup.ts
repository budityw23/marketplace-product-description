import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock the Gemini API key for tests
process.env.GEMINI_API_KEY = 'test_gemini_api_key';
process.env.JWT_SECRET = 'test_jwt_secret';