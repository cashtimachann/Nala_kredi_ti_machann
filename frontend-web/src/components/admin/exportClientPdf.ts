import toast from 'react-hot-toast';

const documentTypeLabel = (type?: number) => {
  switch (type) {
    case 0: return 'CIN';
    case 1: return 'Passeport';
    case 2: return 'Permis de conduire';
    default: return 'Autre';
  }
};

const formatDate = (d?: string) => {
  if (!d) return 'N/A';
  try {
    const t = new Date(d);
    if (isNaN(t.getTime())) return 'N/A';
    return t.toLocaleDateString('fr-FR');
  } catch {
    return 'N/A';
  }
};

const getDisplayClientId = (customer: any): string => {
  try {
    if (!customer) return 'N/A';
    if (customer.customerCode) return customer.customerCode;
    const docNum = customer.identity?.documentNumber || customer.identity?.DocumentNumber;
    if (docNum && String(docNum).length <= 8) return String(docNum);

    const firstInitial = (customer.firstName || customer.FirstName || 'X').toString().charAt(0).toUpperCase();
    const lastInitial = (customer.lastName || customer.LastName || 'X').toString().charAt(0).toUpperCase();
    const fullName = `${customer.firstName || ''}${customer.lastName || ''}${customer.dateOfBirth || ''}`;
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      const char = fullName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    hash = Math.abs(hash);
    const digits = (hash % 9000 + 1000).toString();
    return `${firstInitial}${lastInitial}${digits}`;
  } catch (e) {
    return (customer && (customer.customerCode || customer.id)) || 'N/A';
  }
};

export function exportClientPdf(customer: any) {
  try {
    if (!customer) {
      toast.error('Aucune donnée client à exporter');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour exporter en PDF');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Profil Client - ${customer.fullName || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
          .section { margin-bottom: 25px; page-break-inside: avoid; }
          .section-title { background: #2563eb; color: white; padding: 8px 12px; margin-bottom: 15px; font-weight: bold; font-size: 16px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .info-item { padding: 10px; background: #f9fafb; border-left: 3px solid #2563eb; }
          .info-label { font-weight: bold; color: #555; font-size: 12px; text-transform: uppercase; margin-bottom: 3px; }
          .info-value { color: #000; font-size: 14px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PROFIL CLIENT</h1>
          <p>Kredi Ti Machann - Système de Micro-crédit</p>
          <p>Date d'émission: ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="section">
          <div class="section-title">📋 INFORMATIONS PERSONNELLES</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Nom complet</div>
              <div class="info-value">${customer.fullName || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Date de naissance</div>
              <div class="info-value">${customer.dateOfBirth ? formatDate(customer.dateOfBirth) : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Genre</div>
              <div class="info-value">${customer.gender === 0 ? 'Masculin' : customer.gender === 1 ? 'Féminin' : '—'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">ID Client</div>
              <div class="info-value">${getDisplayClientId(customer)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📍 ADRESSE</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">Adresse</div><div class="info-value">${customer.address?.street || 'N/A'}</div></div>
            <div class="info-item"><div class="info-label">Commune</div><div class="info-value">${customer.address?.commune || 'N/A'}</div></div>
            <div class="info-item"><div class="info-label">Département</div><div class="info-value">${customer.address?.department || 'N/A'}</div></div>
            ${customer.address?.postalCode ? `<div class="info-item"><div class="info-label">Code postal</div><div class="info-value">${customer.address.postalCode}</div></div>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">📞 CONTACT</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">Téléphone principal</div><div class="info-value">${customer.contact?.primaryPhone || 'N/A'}</div></div>
            ${customer.contact?.secondaryPhone ? `<div class="info-item"><div class="info-label">Téléphone secondaire</div><div class="info-value">${customer.contact.secondaryPhone}</div></div>` : ''}
            ${customer.contact?.email ? `<div class="info-item"><div class="info-label">Email</div><div class="info-value">${customer.contact.email}</div></div>` : ''}
            ${customer.contact?.emergencyContactName ? `<div class="info-item"><div class="info-label">Contact d'urgence</div><div class="info-value">${customer.contact.emergencyContactName} - ${customer.contact.emergencyContactPhone || ''}</div></div>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">🪪 DOCUMENT D'IDENTITÉ</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">Type de document</div><div class="info-value">${customer.identity?.documentType !== undefined ? documentTypeLabel(customer.identity.documentType) : 'N/A'}</div></div>
            <div class="info-item"><div class="info-label">Numéro</div><div class="info-value">${customer.identity?.documentNumber || 'N/A'}</div></div>
            <div class="info-item"><div class="info-label">Date d'émission</div><div class="info-value">${customer.identity?.issuedDate ? formatDate(customer.identity.issuedDate) : 'N/A'}</div></div>
            ${customer.identity?.expiryDate ? `<div class="info-item"><div class="info-label">Date d'expiration</div><div class="info-value">${formatDate(customer.identity.expiryDate)}</div></div>` : ''}
            <div class="info-item"><div class="info-label">Autorité émettrice</div><div class="info-value">${customer.identity?.issuingAuthority || 'N/A'}</div></div>
          </div>
        </div>

        <div class="footer">
          <p><strong>Kredi Ti Machann</strong> - Système de Micro-crédit pour Haïti</p>
          <p>Document généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
          <p class="no-print"><button onclick="window.print()" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-top: 10px;">🖨️ Imprimer / Enregistrer en PDF</button></p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        toast.success('Fenêtre d\'export ouverte - Utilisez Ctrl+P ou le bouton Imprimer');
      }, 250);
    };
  } catch (error) {
    console.error('PDF export error', error);
    toast.error('Erreur lors de l\'export PDF');
  }
}

export function exportClientsPdf(customers: any[], title?: string) {
  try {
    if (!Array.isArray(customers) || customers.length === 0) {
      toast.error('Aucune donnée client à exporter');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les pop-ups pour exporter en PDF');
      return;
    }

    const rowsHtml = customers.map((c: any) => {
      const id = getDisplayClientId(c);
      const fullName = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim();
      const phone = c.contact?.primaryPhone || '';
      const email = c.contact?.email || '';
      const doc = c.identity?.documentNumber || '';
      const branch = (c as any).accountBranchName || c.branchName || c.branch || '';
      const commune = c.address?.commune || '';
      const department = c.address?.department || '';
      const created = c.createdAt ? formatDate(c.createdAt) : '';
      const status = c.isActive ? 'Actif' : 'Inactif';
      return `
        <tr>
          <td>${id}</td>
          <td>${fullName}</td>
          <td>${phone}</td>
          <td>${email}</td>
          <td>${doc}</td>
          <td>${branch}</td>
          <td>${commune}</td>
          <td>${department}</td>
          <td>${created}</td>
          <td>${status}</td>
        </tr>`;
    }).join('');

    const docTitle = title || 'Liste des clients';
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${docTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #222; }
            .header { text-align:center; margin-bottom: 12px; }
            h1 { margin:0; color:#2563eb; }
            table { width:100%; border-collapse: collapse; font-size:12px; }
            thead { background:#f3f4f6; display: table-header-group; }
            th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align:left; }
            th { font-weight:600; font-size:12px; }
            tr { page-break-inside: avoid; }
            @media print { thead { display: table-header-group; } .no-print { display:none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${docTitle}</h1>
            <div style="font-size:12px;color:#444;margin-top:6px">Généré le ${new Date().toLocaleString('fr-FR')}</div>
          </div>
          <div class="no-print" style="text-align:center;margin-bottom:8px">
            <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer">🖨️ Imprimer / Enregistrer en PDF</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Document</th>
                <th>Succursale</th>
                <th>Commune</th>
                <th>Département</th>
                <th>Créé le</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>`;

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
          // do not auto-close so user can inspect or save
        } catch (e) {
          // ignore
        }
      }, 300);
    };
  } catch (e) {
    console.error('Export clients PDF error', e);
    toast.error('Erreur lors de la génération du PDF');
  }
}
