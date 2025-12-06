// 🔍 DEBUG FRONTEND RENDERING - Paste sa nan Console Browser la
// Pou verifye si done yo ap afiche kòrèkteman

console.clear();
console.log('🔍 DEBUG FRONTEND RENDERING\n');

// 1. Check if React component is mounted
const checkReactComponent = () => {
    const reportContainer = document.querySelector('[class*="BranchReport"]') || 
                           document.querySelector('div[class*="space-y-6"]') ||
                           document.querySelector('div[class*="bg-gray-50"]');
    
    if (reportContainer) {
        console.log('✅ React component mounted');
        return true;
    } else {
        console.log('❌ React component NOT found');
        return false;
    }
};

// 2. Check for loading indicators
const checkLoadingState = () => {
    const loadingIndicator = document.querySelector('.animate-spin');
    if (loadingIndicator) {
        console.log('⏳ Page is loading...');
        return true;
    }
    console.log('✅ No loading indicator (page should be loaded)');
    return false;
};

// 3. Check for error messages
const checkErrors = () => {
    const errorElements = document.querySelectorAll('[class*="error"], [class*="text-red"]');
    if (errorElements.length > 0) {
        console.log('❌ Error elements found:');
        errorElements.forEach(el => console.log('   -', el.textContent));
        return true;
    }
    console.log('✅ No error messages displayed');
    return false;
};

// 4. Check for report data in DOM
const checkReportData = () => {
    // Check for section headers
    const allH3 = [...document.querySelectorAll('h3')];
    
    const sections = {
        'credits': allH3.find(el => el.textContent.includes('Crédits')),
        'payments': allH3.find(el => el.textContent.includes('Paiements')),
        'deposits': allH3.find(el => el.textContent.includes('Dépôts')),
        'withdrawals': allH3.find(el => el.textContent.includes('Retraits'))
    };
    
    console.log('\n📊 Report Sections Found:');
    Object.entries(sections).forEach(([name, element]) => {
        if (element) {
            console.log(`   ✅ ${name}: Found`);
        } else {
            console.log(`   ❌ ${name}: NOT found`);
        }
    });
    
    return Object.values(sections).some(el => el !== null);
};

// 5. Check for actual numbers displayed
const checkDisplayedValues = () => {
    console.log('\n💰 Looking for displayed values...');
    
    // Look for currency patterns
    const currencyElements = [...document.querySelectorAll('*')].filter(el => {
        const text = el.textContent || '';
        return /\$\d+|\d+\s*Gds/i.test(text);
    });
    
    if (currencyElements.length > 0) {
        console.log('✅ Found currency values:');
        currencyElements.slice(0, 10).forEach(el => {
            const text = el.textContent.trim();
            if (text.length < 100) { // Only show short text
                console.log('   -', text);
            }
        });
    } else {
        console.log('❌ No currency values found in DOM');
    }
};

// 6. Simulate clicking refresh button
const tryRefresh = () => {
    console.log('\n🔄 Looking for Refresh button...');
    
    const allButtons = [...document.querySelectorAll('button')];
    const refreshButton = allButtons.find(btn => 
        btn.textContent.includes('Actualiser') || 
        btn.textContent.includes('🔄')
    );
    
    if (refreshButton) {
        console.log('✅ Refresh button found');
        console.log('💡 TIP: Click it to reload data manually');
        
        // Auto-click option (commented out by default)
        // refreshButton.click();
        // console.log('🔄 Clicked refresh button automatically!');
    } else {
        console.log('❌ Refresh button NOT found');
    }
};

// 7. Check localStorage for any cached data
const checkLocalStorage = () => {
    console.log('\n💾 Checking localStorage...');
    
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('   Token:', token ? '✅ Present' : '❌ Missing');
    console.log('   User:', user ? '✅ Present' : '❌ Missing');
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log('   User Role:', userData.role || 'N/A');
            console.log('   Branch ID:', userData.branchId || '❌ Missing!');
        } catch (e) {
            console.log('   ⚠️  Could not parse user data');
        }
    }
};

// 8. Force re-fetch data
const forceFetch = async () => {
    console.log('\n🌐 Attempting to fetch report data...');
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('❌ No token found - cannot fetch');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:5000/api/BranchReport/my-branch/daily', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Successfully fetched report:');
            console.log('   Branch:', data.branchName);
            console.log('   Date:', data.reportDate);
            console.log('   Deposits:', data.depositsCount);
            console.log('   Total Deposits USD:', data.totalDepositsUSD);
            console.log('   Total Transactions:', data.totalTransactions);
            
            console.log('\n💡 Data is available from API!');
            console.log('   If not displayed, try:');
            console.log('   1. Clicking Refresh button');
            console.log('   2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
            console.log('   3. Check React DevTools for component state');
        } else {
            console.log('❌ API returned error:', response.status);
            const errorData = await response.json();
            console.log('   Error:', errorData);
        }
    } catch (error) {
        console.log('❌ Fetch failed:', error.message);
    }
};

// Run all checks
(async () => {
    console.log('════════════════════════════════════════');
    console.log('🔍 RUNNING DIAGNOSTICS...');
    console.log('════════════════════════════════════════\n');
    
    checkReactComponent();
    checkLoadingState();
    checkErrors();
    checkReportData();
    checkDisplayedValues();
    tryRefresh();
    checkLocalStorage();
    
    await forceFetch();
    
    console.log('\n════════════════════════════════════════');
    console.log('✅ DIAGNOSTICS COMPLETE');
    console.log('════════════════════════════════════════');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. If data was fetched successfully but not displayed:');
    console.log('   → Click the Refresh (🔄 Actualiser) button');
    console.log('   → Or hard refresh the page (Ctrl+Shift+R)');
    console.log('');
    console.log('2. If errors were shown:');
    console.log('   → Check the error messages above');
    console.log('   → Make sure you are logged in with correct role');
    console.log('');
    console.log('3. If nothing appears:');
    console.log('   → Check that you are on /reports/branch URL');
    console.log('   → Make sure frontend is running on localhost:3000');
})();
