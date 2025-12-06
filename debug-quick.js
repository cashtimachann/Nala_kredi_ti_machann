// 🔍 DEBUG FRONTEND - VERSION SENP
// Paste sa nan Console Browser la (F12 > Console)

console.clear();
console.log('🔍 QUICK DIAGNOSTICS\n');
console.log('═══════════════════════════════════════\n');

// 1. Check token
const token = localStorage.getItem('token');
console.log('1️⃣ Token:', token ? '✅ Present' : '❌ Missing');

// 2. Check user
const user = localStorage.getItem('user');
if (user) {
    try {
        const userData = JSON.parse(user);
        console.log('2️⃣ User Role:', userData.role || 'N/A');
        console.log('3️⃣ Branch ID:', userData.branchId || '❌ Missing!');
    } catch (e) {
        console.log('2️⃣ User: ⚠️  Error parsing');
    }
} else {
    console.log('2️⃣ User: ❌ Not logged in');
}

// 3. Check if page loaded
const hasContent = document.querySelector('h1') !== null;
console.log('4️⃣ Page loaded:', hasContent ? '✅ Yes' : '❌ No');

// 4. Check for report sections
const allH3 = [...document.querySelectorAll('h3')];
const hasDeposits = allH3.some(h => h.textContent.includes('Dépôts'));
const hasWithdrawals = allH3.some(h => h.textContent.includes('Retraits'));
console.log('5️⃣ Report sections:', (hasDeposits || hasWithdrawals) ? '✅ Found' : '❌ Not found');

// 5. Check for currency values
const hasCurrency = [...document.querySelectorAll('*')].some(el => 
    /\$\d+|\d+\s*Gds/i.test(el.textContent)
);
console.log('6️⃣ Currency values:', hasCurrency ? '✅ Displayed' : '❌ Not displayed');

// 6. Test API
console.log('\n🌐 Testing API...\n');

if (!token) {
    console.log('❌ Cannot test API - no token');
    console.log('   → Go to /login and sign in');
} else {
    fetch('http://localhost:5000/api/BranchReport/my-branch/daily', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    })
    .then(data => {
        console.log('✅ API SUCCESS!');
        console.log('   Branch:', data.branchName);
        console.log('   Date:', data.reportDate?.split('T')[0]);
        console.log('   Deposits:', data.depositsCount);
        console.log('   Withdrawals:', data.withdrawalsCount);
        console.log('   Total USD:', '$' + data.totalDepositsUSD);
        console.log('   Total HTG:', data.totalDepositsHTG + ' Gds');
        
        console.log('\n═══════════════════════════════════════');
        console.log('✅ DATA RECEIVED FROM API!');
        console.log('═══════════════════════════════════════\n');
        
        if (!hasCurrency) {
            console.log('⚠️  BUT NOT DISPLAYED ON PAGE!');
            console.log('\n💡 SOLUTION:');
            console.log('   1. Click the 🔄 Actualiser button');
            console.log('   2. Or hard refresh: Ctrl+Shift+R (Win) / Cmd+Shift+R (Mac)');
            console.log('   3. Or run: location.reload(true)');
        } else {
            console.log('🎉 Everything looks good!');
        }
    })
    .catch(error => {
        console.log('❌ API ERROR:', error.message);
        
        if (error.message.includes('401')) {
            console.log('\n💡 SOLUTION: Token expired');
            console.log('   → Logout and login again');
            console.log('   → Or run: localStorage.removeItem("token"); location.href="/login"');
        } else if (error.message.includes('404')) {
            console.log('\n💡 SOLUTION: Endpoint not found');
            console.log('   → Check backend is running on port 5000');
        } else if (error.message.includes('Failed to fetch')) {
            console.log('\n💡 SOLUTION: Cannot connect to backend');
            console.log('   → Check backend is running: curl http://localhost:5000/api/health');
        }
    });
}

console.log('\n═══════════════════════════════════════');
console.log('ℹ️  Waiting for API response...');
console.log('═══════════════════════════════════════');
