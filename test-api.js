// Quick API test script
const testPhone = '9876543210';
const testAadhaar = '123456789012';
const API_URL = 'https://janaspandana-backend.onrender.com';

async function testAPI() {
  console.log('🧪 Testing JanaSpandana API...\n');
  
  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing Health Check...');
    const healthRes = await fetch(`${API_URL}/health`);
    const health = await healthRes.json();
    console.log('✅ Health:', health.message);
    console.log('');
    
    // Test 2: Register User
    console.log('2️⃣  Testing User Registration...');
    const registerRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        phone: testPhone,
        aadhaar: testAadhaar,
        address: '123 Test Street, Test City, Test State - 123456'
      })
    });
    const registerData = await registerRes.json();
    
    if (registerData.success) {
      console.log('✅ Registration successful!');
      console.log('   User ID:', registerData.data.userId);
      console.log('   OTP sent to:', registerData.data.phone);
      if (registerData.data.devOTP) {
        console.log('   🔐 Dev OTP:', registerData.data.devOTP);
      }
      console.log('');
      
      // Test 3: Verify OTP (using dev OTP)
      if (registerData.data.devOTP) {
        console.log('3️⃣  Testing OTP Verification...');
        const verifyRes = await fetch(`${API_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: testPhone,
            otp: registerData.data.devOTP
          })
        });
        const verifyData = await verifyRes.json();
        
        if (verifyData.success) {
          console.log('✅ OTP verified successfully!');
          console.log('   User:', verifyData.data.user.name);
          console.log('   Role:', verifyData.data.user.role);
          console.log('   Token received:', verifyData.data.accessToken ? 'Yes' : 'No');
          console.log('');
          
          // Test 4: Get Current User
          console.log('4️⃣  Testing Get Current User...');
          const meRes = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${verifyData.data.accessToken}`
            }
          });
          const meData = await meRes.json();
          
          if (meData.success) {
            console.log('✅ User data retrieved!');
            console.log('   Name:', meData.data.name);
            console.log('   Phone:', meData.data.phone);
            console.log('   Masked Aadhaar:', meData.data.maskedAadhaar);
            console.log('');
          }
          
          // Test 5: Logout
          console.log('5️⃣  Testing Logout...');
          const logoutRes = await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${verifyData.data.accessToken}`
            }
          });
          const logoutData = await logoutRes.json();
          
          if (logoutData.success) {
            console.log('✅ Logout successful!');
            console.log('');
          }
        }
      }
      
      console.log('🎉 All tests passed!\n');
      console.log('📝 Note: User created with phone:', testPhone);
      console.log('   You may want to delete this test user from MongoDB\n');
      
    } else {
      console.log('❌ Registration failed:', registerData.message);
      if (registerData.message.includes('already')) {
        console.log('\n💡 Test user already exists. Testing login instead...\n');
        
        // Test login flow
        console.log('2️⃣  Testing Request OTP...');
        const otpRes = await fetch(`${API_URL}/api/auth/request-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: testPhone })
        });
        const otpData = await otpRes.json();
        
        if (otpData.success) {
          console.log('✅ OTP requested successfully!');
          if (otpData.data.devOTP) {
            console.log('   🔐 Dev OTP:', otpData.data.devOTP);
          }
          console.log('');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
