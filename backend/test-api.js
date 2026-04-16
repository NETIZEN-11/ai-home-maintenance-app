const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const testData = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  password: 'Password123'
};

async function runTests() {
  console.log('--- Starting API Tests ---');
  
  try {
    // 1. Test Signup
    console.log('\n1. Testing Register...');
    const regRes = await axios.post(`${API_URL}/auth/register`, testData);
    console.log('Register Success:', regRes.data.success);
    console.log('Register Message:', regRes.data.message);
    console.log('Register Data keys:', Object.keys(regRes.data.data));
    
    const token = regRes.data.data.token;
    
    // 2. Test Login
    console.log('\n2. Testing Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testData.email,
      password: testData.password
    });
    console.log('Login Success:', loginRes.data.success);
    console.log('Login Message:', loginRes.data.message);
    console.log('Login Data keys:', Object.keys(loginRes.data.data));
    
    // 3. Test Protected Route (Appliances)
    console.log('\n3. Testing Protected Route (Get Appliances)...');
    const appRes = await axios.get(`${API_URL}/appliances`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Get Appliances Success:', appRes.data.success);
    console.log('Get Appliances Message:', appRes.data.message);
    console.log('Data is array:', Array.isArray(appRes.data.data));
    
    console.log('\n--- All API Tests Passed! ---');
  } catch (err) {
    console.error('\n Test Failed:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

runTests();
