// Simple smoke test for PM DTO mapping precedence and omissions

function normalizeDateToYMD(val, fallback) {
  if (!val) return fallback;
  try {
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return fallback;
  } catch {
    return fallback;
  }
}

function convertDocumentType(t) {
  // Pass-through for test purposes; real app maps codes
  return t;
}

function buildPmDtoFromClientData(clientData, selectedCustomer) {
  const isBusiness = true;
  const companyName = clientData.companyName || 'ACME SA';
  const legalForm = clientData.legalForm || 'PM';

  const firstNameForApi = isBusiness ? companyName : (clientData.firstName || '');
  const lastNameForApi = isBusiness ? legalForm : (clientData.lastName || '');
  const safeDob = isBusiness ? '2000-01-01' : normalizeDateToYMD(clientData.dateOfBirth);

  const repName = clientData.legalRepresentativeName || '';
  const repFirst = repName ? repName.trim().split(' ')[0] : undefined;
  const repLast = repName ? repName.trim().split(' ').slice(1).join(' ') || undefined : undefined;

  let dto = {
    isBusiness,
    firstName: firstNameForApi,
    lastName: lastNameForApi,
    dateOfBirth: safeDob,
    gender: clientData.gender || 'M',
    documentType: convertDocumentType(clientData.documentType),
    documentNumber: clientData.documentNumber || '',
    issuedDate: normalizeDateToYMD(clientData.issuedDate),
    expiryDate: normalizeDateToYMD(clientData.expiryDate),
    issuingAuthority: clientData.issuingAuthority || '',

    companyName,
    legalForm,

    representativeFirstName: repFirst || selectedCustomer?.legalRepresentative?.firstName || undefined,
    representativeLastName: repLast || selectedCustomer?.legalRepresentative?.lastName || undefined,
    representativeTitle: clientData.legalRepresentativeTitle || selectedCustomer?.legalRepresentative?.title || undefined,

    representativeDocumentType: (
      clientData.legalRepresentativeDocumentType
        ? convertDocumentType(clientData.legalRepresentativeDocumentType)
        : (clientData.documentType ? convertDocumentType(clientData.documentType) : selectedCustomer?.legalRepresentative?.documentType)
    ),
    representativeDocumentNumber: clientData.legalRepresentativeDocumentNumber || clientData.documentNumber || selectedCustomer?.legalRepresentative?.documentNumber || undefined,
    representativeIssuedDate: normalizeDateToYMD(clientData.legalRepresentativeIssuedDate) || normalizeDateToYMD(clientData.issuedDate) || normalizeDateToYMD(selectedCustomer?.legalRepresentative?.issuedDate),
    representativeExpiryDate: normalizeDateToYMD(clientData.legalRepresentativeExpiryDate) || normalizeDateToYMD(clientData.expiryDate) || normalizeDateToYMD(selectedCustomer?.legalRepresentative?.expiryDate),
    representativeIssuingAuthority: clientData.legalRepresentativeIssuingAuthority || clientData.issuingAuthority || selectedCustomer?.legalRepresentative?.issuingAuthority || undefined,
  };

  if (isBusiness) {
    dto = {
      ...dto,
      occupation: undefined,
      monthlyIncome: undefined,
      birthPlace: undefined,
      nationality: undefined,
      personalNif: undefined,
      employerName: undefined,
      workAddress: undefined,
      incomeSource: undefined,
      maritalStatus: undefined,
      numberOfDependents: undefined,
      educationLevel: undefined,
      signaturePlace: undefined,
      signatureDate: undefined,
      referencePersonName: undefined,
      referencePersonPhone: undefined,
    };
  }

  return dto;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  // Case A: PM with explicit legalRepresentative* fields
  const dataA = {
    companyName: 'BETA SARL',
    legalForm: 'SARL',
    documentType: 'CIN',
    documentNumber: 'P-123',
    issuedDate: '2024-05-02',
    expiryDate: '2029-05-01',
    issuingAuthority: 'DGI',

    legalRepresentativeName: 'Marie Pierre',
    legalRepresentativeTitle: 'Gérante',
    legalRepresentativeDocumentType: 'PASSPORT',
    legalRepresentativeDocumentNumber: 'PP-999',
    legalRepresentativeIssuedDate: '2023-01-01',
    legalRepresentativeExpiryDate: '2033-01-01',
    legalRepresentativeIssuingAuthority: 'MAE',
  };

  const dtoA = buildPmDtoFromClientData(dataA, null);
  const jsonA = JSON.stringify(dtoA);
  console.log('Case A DTO:', dtoA);
  assert(!jsonA.includes('occupation'), 'PP-only field should be omitted');
  assert(dtoA.representativeDocumentType === 'PASSPORT', 'Should use legal rep doc type');
  assert(dtoA.representativeDocumentNumber === 'PP-999', 'Should use legal rep doc number');
  assert(dtoA.representativeIssuedDate === '2023-01-01', 'Rep issued date normalized');
  assert(dtoA.representativeExpiryDate === '2033-01-01', 'Rep expiry date normalized');
  assert(dtoA.representativeIssuingAuthority === 'MAE', 'Rep issuing authority from rep fields');

  // Case B: PM without legalRepresentative* fields -> fallback to main document fields
  const dataB = {
    companyName: 'GAMMA SA',
    legalForm: 'SA',
    documentType: 'CIN',
    documentNumber: 'X-777',
    issuedDate: '2022-06-15',
    expiryDate: '2027-06-15',
    issuingAuthority: 'ONI',

    legalRepresentativeName: 'Jean Paul',
  };
  const dtoB = buildPmDtoFromClientData(dataB, null);
  assert(dtoB.representativeDocumentType === 'CIN', 'Fallback to main document type');
  assert(dtoB.representativeDocumentNumber === 'X-777', 'Fallback to main document number');
  assert(dtoB.representativeIssuedDate === '2022-06-15', 'Fallback to main issued date');
  assert(dtoB.representativeExpiryDate === '2027-06-15', 'Fallback to main expiry date');
  assert(dtoB.representativeIssuingAuthority === 'ONI', 'Fallback to main issuing authority');

  console.log('PM DTO smoke tests passed. Sample payload B:', JSON.stringify(dtoB, null, 2));
}

try {
  run();
} catch (err) {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
}
