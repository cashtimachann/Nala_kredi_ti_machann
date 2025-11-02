import apiService from './apiService';
import savingsCustomerService, { SavingsCustomerResponseDto } from './savingsCustomerService';
import { AccountType } from '../types/clientAccounts';

/**
 * Load customers that currently have accounts of a given type (Savings or Term Savings).
 * Strategy:
 * 1) Fetch accounts for the target type
 * 2) Collect valid customer IDs and fallback phones
 * 3) Fetch customers by ID; for accounts without IDs, fetch by phone
 * 4) Deduplicate by id; fallback build minimal objects when everything fails
 */
export async function loadCustomersHavingAccounts(
  accountType: 'SAVINGS' | 'TERM_SAVINGS' | 'CURRENT'
): Promise<SavingsCustomerResponseDto[]> {
  // 1) Fetch accounts by type
  let accounts: any[] = [];
  if (accountType === 'SAVINGS') {
    try {
      accounts = await apiService.getSavingsAccounts({});
    } catch (e) {
      console.error('Failed to fetch savings accounts:', e);
      accounts = [];
    }
  } else if (accountType === 'TERM_SAVINGS') {
    try {
      accounts = await apiService.getClientAccounts({ accountType: AccountType.TERM_SAVINGS });
      console.log('🔍 Raw term savings accounts fetched:', accounts.length, accounts);
      // Show first account details to diagnose customerId issue
      if (accounts.length > 0) {
        console.log('🔎 First account details:', {
          id: accounts[0].id,
          accountNumber: accounts[0].accountNumber,
          customerId: accounts[0].customerId,
          customerName: accounts[0].customerName,
          customerPhone: accounts[0].customerPhone,
          allKeys: Object.keys(accounts[0])
        });
      }
    } catch (e) {
      console.error('Failed to fetch term savings accounts:', e);
      accounts = [];
    }
  } else {
    // CURRENT accounts
    try {
      accounts = await apiService.getClientAccounts({ accountType: AccountType.CURRENT });
      console.log('🔍 Raw current accounts fetched:', accounts.length, accounts);
    } catch (e) {
      console.error('Failed to fetch current accounts:', e);
      accounts = [];
    }
  }

  // 2) Collect valid IDs and phones
  const validIds = Array.from(
    new Set(
      (accounts || [])
        .map(a => a.customerId)
        .filter((id: any) => id !== undefined && id !== null && String(id).trim() !== '' && String(id).toLowerCase() !== 'undefined')
        .map((id: any) => String(id))
    )
  );
  const phones = Array.from(
    new Set(
      (accounts || [])
        .filter((a: any) => !a.customerId || String(a.customerId).toLowerCase() === 'undefined')
        .map((a: any) => a.customerPhone)
        .filter((p: any) => !!p)
        .map((p: any) => String(p))
    )
  );

  console.log('📊 Collected from accounts:', { totalAccounts: accounts.length, validIds: validIds.length, phones: phones.length });
  console.log('🆔 Valid IDs:', validIds);
  console.log('📞 Phones:', phones);

  // 3) Fetch customers by id and by phone
  const matched: SavingsCustomerResponseDto[] = [];

  for (const id of validIds) {
    try {
      const c = await savingsCustomerService.getCustomer(id);
      if (c) matched.push(c);
    } catch (err) {
      console.warn('Customer fetch by id failed, attempting fallback for id=', id, err);
      const account = (accounts || []).find(a => String(a.customerId) === id);
      if (account?.customerPhone) {
        try {
          const byPhone = await savingsCustomerService.getCustomerByPhone(String(account.customerPhone));
          if (byPhone) {
            matched.push(byPhone);
            continue;
          }
        } catch {}
      }
      // Build minimal fallback
      if (account) {
        matched.push({
          id: id,
          customerCode: account.customerCode || (account as any).CustomerCode,
          firstName: (account.customerName || '').split(' ')[0] || '',
          lastName: (account.customerName || '').split(' ').slice(1).join(' ') || '',
          fullName: account.customerName || 'Nom inconnu',
          dateOfBirth: '',
          gender: 0,
          address: { street: '', commune: '', department: '', country: 'Haïti' },
          contact: { primaryPhone: account.customerPhone || '', secondaryPhone: '', email: '' },
          identity: { documentType: 0, documentNumber: '', issuedDate: '', issuingAuthority: '' },
          occupation: '',
          monthlyIncome: 0,
          signature: undefined,
          documents: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // If we couldn't fetch by id (and by phone fallback failed), it's likely inactive
          isActive: false
        } as any);
      }
    }
  }

  for (const phone of phones) {
    try {
      const c = await savingsCustomerService.getCustomerByPhone(phone);
      if (c && !matched.find(m => String(m.id) === String(c.id))) {
        matched.push(c);
      }
      
      // If customer not found (null/undefined), create fallback
      if (!c) {
        const account = (accounts || []).find(a => String(a.customerPhone) === phone);
        if (account) {
          console.warn(`⚠️ Creating fallback customer for phone ${phone} - no SavingsCustomer record found`);
          matched.push({
            id: account.id || `fallback-${phone}`, // Use account ID as fallback identifier
            customerCode: account.customerCode || '',
            firstName: (account.customerName || '').split(' ')[0] || '',
            lastName: (account.customerName || '').split(' ').slice(1).join(' ') || '',
            fullName: account.customerName || 'Client sans profil',
            dateOfBirth: '',
            gender: 0,
            address: { street: '', commune: '', department: '', country: 'Haïti' },
            contact: { primaryPhone: phone, secondaryPhone: '', email: '' },
            identity: { documentType: 0, documentNumber: '', issuedDate: '', issuingAuthority: '' },
            occupation: '',
            monthlyIncome: 0,
            signature: undefined,
            documents: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: false, // Mark as inactive since no customer record exists
            _isFallback: true // Flag to indicate this is incomplete data
          } as any);
        }
      }
    } catch (err) {
      console.warn('Customer fetch by phone failed for', phone, err);
      // Build fallback on error too
      const account = (accounts || []).find(a => String(a.customerPhone) === phone);
      if (account) {
        console.warn(`⚠️ Creating fallback customer for phone ${phone} after error`);
        matched.push({
          id: account.id || `fallback-${phone}`,
          customerCode: account.customerCode || '',
          firstName: (account.customerName || '').split(' ')[0] || '',
          lastName: (account.customerName || '').split(' ').slice(1).join(' ') || '',
          fullName: account.customerName || 'Client sans profil',
          dateOfBirth: '',
          gender: 0,
          address: { street: '', commune: '', department: '', country: 'Haïti' },
          contact: { primaryPhone: phone, secondaryPhone: '', email: '' },
          identity: { documentType: 0, documentNumber: '', issuedDate: '', issuingAuthority: '' },
          occupation: '',
          monthlyIncome: 0,
          signature: undefined,
          documents: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: false,
          _isFallback: true
        } as any);
      }
    }
  }

  // 4) De-duplicate by id (prefer normalized ones already added)
  const seen = new Set<string>();
  const deduped: SavingsCustomerResponseDto[] = [];
  for (const c of matched) {
    const key = String(c.id);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(c);
    }
  }
  // 5) Attach branch info from the original accounts where possible so UIs can filter by branch
  try {
    for (const a of accounts || []) {
      try {
        const accountCustomerId = a.customerId != null ? String(a.customerId) : undefined;
        const accountPhone = a.customerPhone ? String(a.customerPhone).replace(/\D+/g, '') : undefined;
        const branchName = a.branchName || a.branch || a.BranchName || '';
        const branchId = a.branchId || a.BranchId || undefined;

        // try to match by id first
        let found = null as any;
        if (accountCustomerId) {
          found = deduped.find(d => String(d.id) === accountCustomerId);
        }
        // fallback: match by phone (normalized digits)
        if (!found && accountPhone) {
          found = deduped.find(d => {
            const p = String(((d as any).contact?.primaryPhone) || (d as any).primaryPhone || '').replace(/\D+/g, '');
            return p && p === accountPhone;
          });
        }

        if (found) {
          // prefer existing property names but avoid overwriting if already set
          try { if (!found.accountBranchName) found.accountBranchName = branchName || ''; } catch {}
          try { if (!found.accountBranchId) found.accountBranchId = branchId; } catch {}
        }
      } catch (attachErr) {
        // non-fatal
      }
    }
  } catch (e) {
    // ignore attach errors
  }
  console.log('✅ Final deduped customers:', deduped.length, deduped);
  return deduped;
}

export default {
  loadCustomersHavingAccounts,
};
