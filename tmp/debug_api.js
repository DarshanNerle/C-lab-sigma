
import { createServer } from 'http';
import routeApiRequest from '../lib/serverless/router.ts';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const mockReq = {
  url: '/api/ai',
  method: 'POST',
  body: { message: 'hello' },
  headers: {}
};

const mockRes = {
  statusCode: 200,
  headers: {},
  setHeader(name, value) { 
    this.headers[name] = value; 
    return this;
  },
  status(code) { 
    this.statusCode = code; 
    console.log('STATUS CALLED:', code);
    return this; 
  },
  json(data) { 
    console.log('JSON CALLED:', JSON.stringify(data, null, 2));
    // Not calling exit here, to see if anything else happens
  },
  end(data) {
    console.log('END CALLED:', data);
  }
};

async function test() {
  console.log('Starting test...');
  try {
    console.log('Calling routeApiRequest...');
    const result = await routeApiRequest(mockReq, mockRes);
    console.log('Returned from routeApiRequest');
  } catch (err) {
    console.error('CRITICAL CRASH:', err);
  }
}

test().then(() => {
    console.log('Test completed.');
    // Keep it alive for a second to ensure output is flushed
    setTimeout(() => {}, 1000);
});
