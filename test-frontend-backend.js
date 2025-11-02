// Test de communication Frontend -> Backend
// Ouvrir la console développeur (F12) dans le navigateur et coller ce code

console.log("🔍 Test de communication Frontend -> Backend");

// Test 1: Appel simple à l'API
fetch('http://localhost:7001/swagger')
    .then(response => {
        console.log('✅ Test Swagger:', response.status, response.statusText);
        return response.text();
    })
    .then(data => {
        console.log('📄 Swagger accessible depuis le frontend');
    })
    .catch(error => {
        console.error('❌ Erreur Swagger:', error);
    });

// Test 2: Test de login (simulation du frontend)
const loginData = {
    email: 'superadmin@nalacredit.com',
    password: 'SuperAdmin123!'
};

console.log("🔑 Test de login depuis le frontend...");

fetch('http://localhost:7001/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify(loginData)
})
.then(response => {
    console.log('🔐 Réponse login:', response.status, response.statusText);
    if (response.ok) {
        return response.json();
    } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
})
.then(data => {
    console.log('✅ Login réussi depuis le frontend!');
    console.log('👤 Utilisateur:', data.user);
    console.log('🎟️ Token reçu:', data.token.substring(0, 50) + '...');
})
.catch(error => {
    console.error('❌ Erreur login depuis frontend:', error);
    console.error('💡 Vérifiez la console Network pour plus de détails');
});

// Test 3: Vérification CORS
console.log("🌐 Test CORS avec OPTIONS...");

fetch('http://localhost:7001/api/auth/login', {
    method: 'OPTIONS'
})
.then(response => {
    console.log('🔒 CORS OPTIONS:', response.status);
    console.log('📋 Headers CORS:', {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
    });
})
.catch(error => {
    console.error('❌ Erreur CORS OPTIONS:', error);
});

console.log("🏁 Tests terminés. Vérifiez les résultats ci-dessus.");