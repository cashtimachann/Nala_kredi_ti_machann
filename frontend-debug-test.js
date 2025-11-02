// ========================================
// TEST DEBUG FRONTEND -> BACKEND
// ========================================
// Kopi ak kole kòd sa a nan console développeur (F12)

console.log("🔍 KÒMANSE DEBUG FRONTEND -> BACKEND");
console.log("=====================================");

// Test 1: Verifye si frontend ka rive nan backend
console.log("\n📡 Test 1: Koneksyon Backend...");
fetch('http://localhost:7001/swagger')
    .then(response => {
        console.log('✅ Backend aksèsib:', response.status, response.statusText);
        if (response.ok) {
            console.log('✅ Swagger UI fonksyone');
        }
    })
    .catch(error => {
        console.error('❌ Erè koneksyon backend:', error);
    });

// Test 2: Test CORS ak OPTIONS request
console.log("\n🌐 Test 2: Konfigirasyon CORS...");
fetch('http://localhost:7001/api/auth/login', {
    method: 'OPTIONS',
    headers: {
        'Origin': 'http://localhost:3000'
    }
})
.then(response => {
    console.log('🔒 CORS OPTIONS Response:', response.status);
    console.log('📋 CORS Headers:', {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
    });
})
.catch(error => {
    console.error('❌ Erè CORS:', error);
});

// Test 3: Test login depi frontend (menm jan ak frontend fè li)
console.log("\n🔑 Test 3: Login SuperAdmin depi frontend...");
const loginData = {
    email: 'superadmin@nalacredit.com',
    password: 'SuperAdmin123!'
};

fetch('http://localhost:7001/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'http://localhost:3000'  // Important pou CORS
    },
    credentials: 'include',  // Important pou cookies/sessions
    body: JSON.stringify(loginData)
})
.then(response => {
    console.log('🔐 Login Response Status:', response.status, response.statusText);
    console.log('📨 Response Headers:', [...response.headers.entries()]);
    
    if (response.ok) {
        return response.json();
    } else if (response.status === 401) {
        throw new Error('❌ Kredansyèl yo pa bon (401 Unauthorized)');
    } else if (response.status === 400) {
        return response.text().then(text => {
            throw new Error(`❌ Bad Request (400): ${text}`);
        });
    } else {
        throw new Error(`❌ HTTP ${response.status}: ${response.statusText}`);
    }
})
.then(data => {
    console.log('✅ LOGIN REYISI depi frontend!');
    console.log('👤 Itilizatè:', data.user);
    console.log('🎟️ Token (50 premye karaktè):', data.token.substring(0, 50) + '...');
    
    // Test 4: Sove token ak essaye yon request otentifye
    localStorage.setItem('debug_token', data.token);
    console.log('💾 Token sove nan localStorage');
    
    // Test yon endpoint ki mande otentifikasyon
    return fetch('http://localhost:7001/api/auth/profile', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json'
        }
    });
})
.then(response => {
    if (response) {
        console.log('🔍 Profile endpoint response:', response.status);
        if (response.ok) {
            return response.json();
        }
    }
})
.then(profile => {
    if (profile) {
        console.log('✅ Profile endpoint fonksyone:', profile);
    }
})
.catch(error => {
    console.error('❌ ERÈ LOGIN depi frontend:', error.message);
    console.error('📍 Stack trace:', error);
    
    // Gade si gen pwoblèm ak CORS
    if (error.message.includes('CORS') || error.message.includes('network')) {
        console.error('💡 Sa ka yon pwoblèm CORS. Verifye:');
        console.error('   - Backend CORS config pèmèt http://localhost:3000');
        console.error('   - Access-Control-Allow-Credentials aktif');
    }
});

// Test 5: Verifye localStorage ak sessionStorage
console.log("\n💾 Test 5: Depo navigatè a...");
console.log('📦 localStorage keys:', Object.keys(localStorage));
console.log('📦 sessionStorage keys:', Object.keys(sessionStorage));

// Gade si gen token ki deja sove
const existingToken = localStorage.getItem('token');
const existingUser = localStorage.getItem('user');
if (existingToken) {
    console.log('🎟️ Token ki deja egziste:', existingToken.substring(0, 50) + '...');
}
if (existingUser) {
    console.log('👤 User data ki deja egziste:', existingUser);
}

console.log("\n🏁 FIN DEBUG TEST");
console.log("================");
console.log("💡 Gade mesaj yo pi wo pou jwenn kote pwoblèm nan ye.");