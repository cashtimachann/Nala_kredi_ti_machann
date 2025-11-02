/**
 * AUTOMATED SYSTEM HEALTH CHECK
 * Vérifie rapidement les composants critiques après Phase 1 & 2
 * 
 * Usage: node verify-system.js
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_PATH = path.join(__dirname, 'frontend-web', 'src');
const checks = {
  passed: [],
  failed: [],
  warnings: []
};

console.log('🔍 VÉRIFICATION SYSTÈME - Phase 1 & 2\n');

// ============================================================================
// 1. VÉRIFIER STRUCTURE MODULAIRE
// ============================================================================

console.log('📂 1. Structure Modulaire...');

const requiredServices = [
  'services/base/BaseApiService.ts',
  'services/auth/AuthService.ts',
  'services/clientAccounts/ClientAccountService.ts',
  'services/savingsCustomerService.ts',
  'services/apiService.ts',
  'services/index.ts'
];

requiredServices.forEach(service => {
  const fullPath = path.join(FRONTEND_PATH, service);
  if (fs.existsSync(fullPath)) {
    checks.passed.push(`✅ Service exists: ${service}`);
  } else {
    checks.failed.push(`❌ Service MISSING: ${service}`);
  }
});

// ============================================================================
// 2. VÉRIFIER ZUSTAND STORES
// ============================================================================

console.log('🗄️  2. Zustand Stores...');

const requiredStores = [
  'stores/authStore.ts',
  'stores/uiStore.ts'
];

requiredStores.forEach(store => {
  const fullPath = path.join(FRONTEND_PATH, store);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Vérifier exports critiques
    if (store === 'stores/authStore.ts') {
      if (content.includes('useAuthStore') && content.includes('setAuth') && content.includes('clearAuth') && content.includes('hydrate')) {
        checks.passed.push(`✅ authStore exports: useAuthStore, setAuth, clearAuth, hydrate`);
      } else {
        checks.failed.push(`❌ authStore missing critical exports`);
      }
    }
    
    if (store === 'stores/uiStore.ts') {
      if (content.includes('useUIStore') && content.includes('withGlobalLoading')) {
        checks.passed.push(`✅ uiStore exports: useUIStore, withGlobalLoading`);
      } else {
        checks.failed.push(`❌ uiStore missing critical exports`);
      }
    }
  } else {
    checks.failed.push(`❌ Store MISSING: ${store}`);
  }
});

// ============================================================================
// 3. VÉRIFIER ZOD VALIDATION
// ============================================================================

console.log('✔️  3. Zod Validation...');

const validationPath = path.join(FRONTEND_PATH, 'validation/schemas.ts');
if (fs.existsSync(validationPath)) {
  const content = fs.readFileSync(validationPath, 'utf8');
  
  const requiredSchemas = ['loginSchema', 'branchSchema', 'createClientSchemaZ'];
  requiredSchemas.forEach(schema => {
    if (content.includes(`export const ${schema}`) || content.includes(`export function ${schema}`)) {
      checks.passed.push(`✅ Schema exists: ${schema}`);
    } else {
      checks.failed.push(`❌ Schema MISSING: ${schema}`);
    }
  });
} else {
  checks.failed.push(`❌ validation/schemas.ts MISSING`);
}

// ============================================================================
// 4. VÉRIFIER TESTS
// ============================================================================

console.log('🧪 4. Tests Unitaires...');

const testDirs = [
  'stores/__tests__',
  'validation/__tests__',
  'services/__tests__'
];

testDirs.forEach(dir => {
  const fullPath = path.join(FRONTEND_PATH, dir);
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx'));
    if (files.length > 0) {
      checks.passed.push(`✅ Tests found in ${dir}: ${files.length} file(s)`);
    } else {
      checks.warnings.push(`⚠️  No test files in ${dir}`);
    }
  } else {
    checks.warnings.push(`⚠️  Test dir missing: ${dir}`);
  }
});

// ============================================================================
// 5. VÉRIFIER CACHE IMPLEMENTATION
// ============================================================================

console.log('💾 5. Cache TTL Implementation...');

const baseApiPath = path.join(FRONTEND_PATH, 'services/base/BaseApiService.ts');
if (fs.existsSync(baseApiPath)) {
  const content = fs.readFileSync(baseApiPath, 'utf8');
  
  if (content.includes('x-cache-ttl') && content.includes('invalidateCacheByPrefix')) {
    checks.passed.push(`✅ BaseApiService: Cache TTL + invalidation implemented`);
  } else {
    checks.failed.push(`❌ BaseApiService: Cache features MISSING`);
  }
  
  if (content.includes('clearCache')) {
    checks.passed.push(`✅ BaseApiService: clearCache() method exists`);
  }
} else {
  checks.failed.push(`❌ BaseApiService.ts MISSING`);
}

// Vérifier usage du cache dans services
const apiServicePath = path.join(FRONTEND_PATH, 'services/apiService.ts');
if (fs.existsSync(apiServicePath)) {
  const content = fs.readFileSync(apiServicePath, 'utf8');
  
  const cacheUsages = (content.match(/x-cache-ttl/g) || []).length;
  if (cacheUsages >= 5) {
    checks.passed.push(`✅ apiService.ts: ${cacheUsages} endpoints use cache TTL`);
  } else if (cacheUsages > 0) {
    checks.warnings.push(`⚠️  apiService.ts: Only ${cacheUsages} endpoints use cache (attendu: 5+)`);
  } else {
    checks.failed.push(`❌ apiService.ts: NO cache TTL usage found`);
  }
  
  const invalidations = (content.match(/invalidateCacheByPrefix/g) || []).length;
  if (invalidations >= 3) {
    checks.passed.push(`✅ apiService.ts: ${invalidations} mutations invalidate cache`);
  } else if (invalidations > 0) {
    checks.warnings.push(`⚠️  apiService.ts: Only ${invalidations} invalidations (attendu: 3+)`);
  }
}

// ============================================================================
// 6. VÉRIFIER SENTRY MONITORING
// ============================================================================

console.log('📊 6. Monitoring (Sentry)...');

const sentryPath = path.join(FRONTEND_PATH, 'sentry.ts');
const errorBoundaryPath = path.join(FRONTEND_PATH, 'components/common/AppErrorBoundary.tsx');

if (fs.existsSync(sentryPath)) {
  const content = fs.readFileSync(sentryPath, 'utf8');
  if (content.includes('Sentry.init') && content.includes('BrowserTracing')) {
    checks.passed.push(`✅ Sentry: Initialization + BrowserTracing configured`);
  } else {
    checks.warnings.push(`⚠️  Sentry: Init incomplete`);
  }
} else {
  checks.warnings.push(`⚠️  sentry.ts missing (Sentry non configuré)`);
}

if (fs.existsSync(errorBoundaryPath)) {
  checks.passed.push(`✅ AppErrorBoundary component exists`);
} else {
  checks.warnings.push(`⚠️  AppErrorBoundary missing`);
}

// ============================================================================
// 7. VÉRIFIER UX IMPROVEMENTS
// ============================================================================

console.log('🎨 7. UX Improvements...');

const skeletonPath = path.join(FRONTEND_PATH, 'components/common/Skeleton.tsx');
const loadingOverlayPath = path.join(FRONTEND_PATH, 'components/common/GlobalLoadingOverlay.tsx');

if (fs.existsSync(skeletonPath)) {
  checks.passed.push(`✅ Skeleton component exists`);
} else {
  checks.warnings.push(`⚠️  Skeleton component missing`);
}

if (fs.existsSync(loadingOverlayPath)) {
  checks.passed.push(`✅ GlobalLoadingOverlay exists`);
} else {
  checks.warnings.push(`⚠️  GlobalLoadingOverlay missing`);
}

// ============================================================================
// 8. VÉRIFIER ENV EXAMPLE
// ============================================================================

console.log('⚙️  8. Configuration...');

const envExamplePath = path.join(__dirname, 'frontend-web', '.env.example');
if (fs.existsSync(envExamplePath)) {
  const content = fs.readFileSync(envExamplePath, 'utf8');
  if (content.includes('REACT_APP_API_URL') && content.includes('REACT_APP_SENTRY_DSN')) {
    checks.passed.push(`✅ .env.example: API_URL + SENTRY_DSN documented`);
  } else {
    checks.warnings.push(`⚠️  .env.example: Missing env vars`);
  }
} else {
  checks.warnings.push(`⚠️  .env.example missing`);
}

// ============================================================================
// 9. VÉRIFIER COMPOSANTS CRITIQUES
// ============================================================================

console.log('🧩 9. Composants Critiques...');

const criticalComponents = [
  'components/auth/Login.tsx',
  'components/admin/ClientCreationForm.tsx',
  'components/admin/ClientEditForm.tsx',
  'components/admin/ClientAccountManagement.tsx',
  'components/branches/BranchManagement.tsx',
  'App.tsx'
];

criticalComponents.forEach(comp => {
  const fullPath = path.join(FRONTEND_PATH, comp);
  if (fs.existsSync(fullPath)) {
    checks.passed.push(`✅ Component exists: ${comp}`);
  } else {
    checks.failed.push(`❌ Component MISSING: ${comp}`);
  }
});

// Vérifier que ClientCreationForm utilise Zod
const clientFormPath = path.join(FRONTEND_PATH, 'components/admin/ClientCreationForm.tsx');
if (fs.existsSync(clientFormPath)) {
  const content = fs.readFileSync(clientFormPath, 'utf8');
  if (content.includes('createClientSchemaZ') && content.includes('zodResolver')) {
    checks.passed.push(`✅ ClientCreationForm uses Zod validation`);
  } else {
    checks.warnings.push(`⚠️  ClientCreationForm: Zod usage unclear`);
  }
  
  if (content.includes('withGlobalLoading')) {
    checks.passed.push(`✅ ClientCreationForm uses withGlobalLoading`);
  }
}

// ============================================================================
// 10. VÉRIFIER PACKAGE.JSON
// ============================================================================

console.log('📦 10. Dependencies...');

const packagePath = path.join(__dirname, 'frontend-web', 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredDeps = ['zustand', 'zod', '@hookform/resolvers', '@sentry/react', 'axios'];
  requiredDeps.forEach(dep => {
    if (pkg.dependencies[dep] || pkg.devDependencies[dep]) {
      checks.passed.push(`✅ Dependency installed: ${dep}`);
    } else {
      checks.failed.push(`❌ Dependency MISSING: ${dep}`);
    }
  });
  
  // Vérifier Jest config
  if (pkg.jest && pkg.jest.transformIgnorePatterns) {
    checks.passed.push(`✅ Jest config: transformIgnorePatterns configured`);
  } else {
    checks.warnings.push(`⚠️  Jest config: transformIgnorePatterns missing`);
  }
}

// ============================================================================
// AFFICHER RÉSULTATS
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('📊 RÉSULTATS VÉRIFICATION SYSTÈME');
console.log('='.repeat(70) + '\n');

console.log(`✅ PASSED: ${checks.passed.length}`);
checks.passed.forEach(msg => console.log(msg));

console.log(`\n⚠️  WARNINGS: ${checks.warnings.length}`);
checks.warnings.forEach(msg => console.log(msg));

console.log(`\n❌ FAILED: ${checks.failed.length}`);
checks.failed.forEach(msg => console.log(msg));

console.log('\n' + '='.repeat(70));

if (checks.failed.length === 0) {
  console.log('🎉 SYSTÈME VALIDÉ - Aucun problème bloquant trouvé!');
  console.log('⚠️  Warnings peuvent être ignorés si features optionnelles.');
  process.exit(0);
} else {
  console.log('🚨 PROBLÈMES TROUVÉS - Vérifier les échecs ci-dessus.');
  process.exit(1);
}
