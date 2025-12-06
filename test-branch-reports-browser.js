// Test Manual pou Branch Reports
// Ouvè sa nan Console Browser la (F12 > Console)
// Epi paste kòd sa pou teste API yo

console.clear();
console.log('🔍 TEST BRANCH REPORTS API\n');

// 1. Tcheke token
const token = localStorage.getItem('token');
if (!token) {
    console.error('❌ Pa gen token! Ou dwe konekte anvan.');
} else {
    console.log('✅ Token jwenn:', token.substring(0, 50) + '...');
    
    // Decode token (simple base64 decode - pa sekire)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('\n📋 Token Payload:');
        console.log('   - User ID:', payload.sub || payload.nameid);
        console.log('   - Email:', payload.email);
        console.log('   - Role:', payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']);
        console.log('   - BranchId:', payload.BranchId || payload.branchId || '❌ PA GEN!');
        console.log('   - Expiration:', new Date(payload.exp * 1000).toLocaleString());
    } catch (e) {
        console.error('❌ Pa ka decode token:', e);
    }
}

// 2. Test API
const API_URL = 'http://localhost:5000/api';

console.log('\n🧪 TEST API ENDPOINTS:\n');

// Function helper
async function testEndpoint(name, url, method = 'GET', body = null) {
    console.log(`\n--- Testing: ${name} ---`);
    console.log(`URL: ${url}`);
    
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ SUCCESS:', response.status);
            console.log('📊 Data:', data);
            return data;
        } else {
            console.error('❌ ERROR:', response.status);
            console.error('📛 Message:', data);
            return null;
        }
    } catch (error) {
        console.error('❌ FETCH ERROR:', error.message);
        return null;
    }
}

// Test endpoints
(async () => {
    // Test 1: My Branch Daily Report
    await testEndpoint(
        'My Branch Daily Report',
        `${API_URL}/BranchReport/my-branch/daily`
    );
    
    // Test 2: My Branch Monthly Report
    const now = new Date();
    await testEndpoint(
        'My Branch Monthly Report',
        `${API_URL}/BranchReport/my-branch/monthly?month=${now.getMonth() + 1}&year=${now.getFullYear()}`
    );
    
    // Test 3: Specific Branch Daily Report (Branch ID 1)
    await testEndpoint(
        'Specific Branch Daily Report (Branch 1)',
        `${API_URL}/BranchReport/daily/1?date=${now.toISOString().split('T')[0]}`
    );
    
    // Test 4: Get all branches
    await testEndpoint(
        'Get All Branches',
        `${API_URL}/Branch`
    );
    
    console.log('\n✅ TOUT TEST KONPLÈ!');
    console.log('\n💡 Si ou wè erè:');
    console.log('   1. Verifye ou gen bon role (Manager, BranchSupervisor, etc.)');
    console.log('   2. Verifye ou gen BranchId nan token ou');
    console.log('   3. Tcheke backend logs pou wè erè yo');
    console.log('   4. Verifye branch la egziste nan database');
})();
