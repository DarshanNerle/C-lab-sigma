
import routeApiRequest from './lib/serverless/router.ts';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const mockRes = {
  statusCode: 200,
  headers: {},
  setHeader(name, value) { this.headers[name] = value; return this; },
  status(code) { 
    this.statusCode = code; 
    console.log('STATUS CALLED:', code);
    return this; 
  },
  json(data) { 
    console.log('JSON CALLED:', JSON.stringify(data, null, 2));
  },
  end(data) {
    console.log('END CALLED');
  }
};

async function run() {
  console.log('Testing /api/ai...');
  const req = {
    url: '/api/ai',
    method: 'POST',
    body: { message: 'What is water?' }
  };
  await routeApiRequest(req, mockRes);

  console.log('Testing /api/learn/search...');
  const req2 = {
    url: '/api/learn/search?topic=Acid&language=english',
    method: 'GET'
  };
  await routeApiRequest(req2, mockRes);
}

run().catch(e => console.error(e));
