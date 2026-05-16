import { Document, Profile } from '../types';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatAmount(n: number): string {
  return n.toFixed(2);
}

function formatDate(dateStr: string): string {
  return dateStr.split('T')[0];
}

function parseAddress(address: string): { indirizzo: string; cap: string; comune: string } {
  const parts = address.split(',');
  if (parts.length >= 2) {
    const indirizzo = parts.slice(0, -1).join(',').trim();
    const lastPart = parts[parts.length - 1].trim();
    const capMatch = lastPart.match(/\b(\d{5})\b/);
    if (capMatch) {
      const cap = capMatch[1];
      const comune = lastPart.replace(cap, '').trim();
      return { indirizzo, cap, comune: comune || 'ND' };
    }
    return { indirizzo, cap: '00000', comune: lastPart || 'ND' };
  }
  return { indirizzo: address || 'ND', cap: '00000', comune: 'ND' };
}

export interface MissingProfileField {
  label: string;
}

export function getMissingProfileFields(profile: Profile): MissingProfileField[] {
  const missing: MissingProfileField[] = [];
  if (!profile.piva) missing.push({ label: 'Partita IVA' });
  if (!profile.codiceFiscale) missing.push({ label: 'Codice Fiscale' });
  if (!profile.address) missing.push({ label: 'Indirizzo' });
  return missing;
}

export interface SdiValidationError {
  field: string;
  label: string;
  where: 'profilo' | 'fattura';
}

export function validateForSdi(doc: Document, profile: Profile): SdiValidationError[] {
  const errors: SdiValidationError[] = [];

  // Dati profilo obbligatori
  if (!profile.piva && !profile.codiceFiscale)
    errors.push({ field: 'piva', label: 'P.IVA o Codice Fiscale', where: 'profilo' });
  if (!profile.name)
    errors.push({ field: 'name', label: 'Nome o Ragione Sociale', where: 'profilo' });
  if (!profile.address)
    errors.push({ field: 'address', label: 'Indirizzo', where: 'profilo' });
  else if (!/\d{5}/.test(profile.address))
    errors.push({ field: 'address', label: 'Indirizzo profilo: aggiungi il CAP (es. Via Roma 1, 20100 Milano)', where: 'profilo' });

  // Formato P.IVA profilo (11 cifre, senza prefisso IT)
  if (profile.piva) {
    const clean = profile.piva.replace(/\s/g, '').replace(/^IT/i, '');
    if (!/^\d{11}$/.test(clean))
      errors.push({ field: 'piva', label: 'P.IVA non valida (deve essere 11 cifre, senza prefisso IT)', where: 'profilo' });
  }

  // Dati fattura obbligatori
  if (!doc.invoiceNumber)
    errors.push({ field: 'invoiceNumber', label: 'Numero fattura', where: 'fattura' });
  if (!doc.title)
    errors.push({ field: 'title', label: 'Descrizione prestazione', where: 'fattura' });

  // Dati cliente (solo se non privato)
  if (doc.clientPiva !== 'Privato') {
    if (!doc.clientPiva && !doc.clientCf)
      errors.push({ field: 'clientPiva', label: 'P.IVA o CF del cliente', where: 'fattura' });
    if (doc.clientPiva && doc.clientPiva !== 'Privato') {
      const clean = doc.clientPiva.replace(/\s/g, '').replace(/^IT/i, '');
      if (!/^\d{11}$/.test(clean))
        errors.push({ field: 'clientPiva', label: 'P.IVA cliente non valida (deve essere 11 cifre)', where: 'fattura' });
    }
    if (!doc.clientAddress)
      errors.push({ field: 'clientAddress', label: 'Indirizzo del cliente', where: 'fattura' });
    else if (!/\d{5}/.test(doc.clientAddress))
      errors.push({ field: 'clientAddress', label: 'Indirizzo cliente: aggiungi il CAP (es. Via Roma 1, 20100 Milano)', where: 'fattura' });
  }

  return errors;
}

export function generateFatturaPA(doc: Document, profile: Profile): { xml: string; filename: string } {
  const isCreditNote = doc.type === 'credit_note';
  const isForfettario = (doc.docRegime ?? profile.regime ?? 'forfettario') !== 'ordinario';
  const ivaRate = isForfettario ? 0 : (doc.ivaRate ?? 22);
  const regimeFiscale = isForfettario ? 'RF19' : 'RF01';
  const tipoDocumento = isCreditNote ? 'TD04' : 'TD01';

  const baseAmount = isCreditNote ? -doc.amount : doc.amount;
  const rivalsaAmount = (!isCreditNote && doc.rivalsaInps) ? baseAmount * 0.04 : 0;
  const imponibile = baseAmount + rivalsaAmount;
  const ivaAmount = isForfettario ? 0 : imponibile * (ivaRate / 100);
  const bolloAmount = (!isCreditNote && doc.marcaBollo) ? 2 : 0;
  const ritenutaAmount = (!isCreditNote && doc.ritenuta) ? imponibile * 0.20 : 0;
  const importoTotale = imponibile + ivaAmount + bolloAmount - ritenutaAmount;

  const profAddr = parseAddress(profile.address || '');
  const clientAddr = parseAddress(doc.clientAddress || '');

  const invoiceNumber = doc.invoiceNumber || doc.id.slice(0, 8).toUpperCase();
  const progressivo = invoiceNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 10) || '00001';
  const piva = (profile.piva || '00000000000').replace(/\s/g, '');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12"
  xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${escapeXml(piva)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${escapeXml(progressivo)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${escapeXml(doc.clientSdi || '0000000')}</CodiceDestinatario>${doc.clientPec ? `
      <PECDestinatario>${escapeXml(doc.clientPec)}</PECDestinatario>` : ''}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${escapeXml(piva)}</IdCodice>
        </IdFiscaleIVA>${profile.codiceFiscale ? `
        <CodiceFiscale>${escapeXml(profile.codiceFiscale)}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${escapeXml(profile.name)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>${regimeFiscale}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(profAddr.indirizzo)}</Indirizzo>
        <CAP>${profAddr.cap}</CAP>
        <Comune>${escapeXml(profAddr.comune)}</Comune>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>${doc.clientPiva ? `
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${escapeXml(doc.clientPiva)}</IdCodice>
        </IdFiscaleIVA>` : ''}${doc.clientCf ? `
        <CodiceFiscale>${escapeXml(doc.clientCf)}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${escapeXml(doc.client || 'Cliente')}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(clientAddr.indirizzo || 'ND')}</Indirizzo>
        <CAP>${clientAddr.cap}</CAP>
        <Comune>${escapeXml(clientAddr.comune)}</Comune>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>${tipoDocumento}</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${formatDate(doc.date)}</Data>
        <Numero>${escapeXml(invoiceNumber)}</Numero>
        <ImportoTotaleDocumento>${formatAmount(importoTotale)}</ImportoTotaleDocumento>${isCreditNote && doc.category ? `
        <Causale>Nota di credito a storno fattura n. ${escapeXml(doc.category)}</Causale>` : ''}${doc.ritenuta && !isCreditNote ? `
        <DatiRitenuta>
          <TipoRitenuta>RT01</TipoRitenuta>
          <ImportoRitenuta>${formatAmount(ritenutaAmount)}</ImportoRitenuta>
          <AliquotaRitenuta>20.00</AliquotaRitenuta>
          <CausalePagamento>A</CausalePagamento>
        </DatiRitenuta>` : ''}${doc.marcaBollo ? `
        <DatiBollo>
          <BolloVirtuale>SI</BolloVirtuale>
          <ImportoBollo>2.00</ImportoBollo>
        </DatiBollo>` : ''}${isForfettario && !isCreditNote ? `
        <Causale>Operazione effettuata ai sensi dell&apos;art. 1, commi 54-89, della Legge 190/2014 - Regime forfettario. Imposta non dovuta.</Causale>` : ''}
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>${escapeXml(doc.title)}</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>${formatAmount(baseAmount)}</PrezzoUnitario>
        <PrezzoTotale>${formatAmount(baseAmount)}</PrezzoTotale>
        <AliquotaIVA>${ivaRate.toFixed(2)}</AliquotaIVA>${isForfettario ? `
        <Natura>N2.2</Natura>` : ''}
      </DettaglioLinee>${doc.rivalsaInps ? `
      <DettaglioLinee>
        <NumeroLinea>2</NumeroLinea>
        <Descrizione>Rivalsa INPS 4%</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>${formatAmount(rivalsaAmount)}</PrezzoUnitario>
        <PrezzoTotale>${formatAmount(rivalsaAmount)}</PrezzoTotale>
        <AliquotaIVA>${ivaRate.toFixed(2)}</AliquotaIVA>${isForfettario ? `
        <Natura>N2.2</Natura>` : ''}
      </DettaglioLinee>` : ''}
      <DatiRiepilogo>
        <AliquotaIVA>${ivaRate.toFixed(2)}</AliquotaIVA>${isForfettario ? `
        <Natura>N2.2</Natura>` : ''}
        <ImponibileImporto>${formatAmount(imponibile)}</ImponibileImporto>
        <Imposta>${formatAmount(ivaAmount)}</Imposta>${!isForfettario ? `
        <EsigibilitaIVA>I</EsigibilitaIVA>` : ''}${isForfettario ? `
        <RiferimentoNormativo>Regime forfettario art. 1, c. 54-89, L. 190/2014</RiferimentoNormativo>` : ''}
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

  const numForFilename = invoiceNumber.replace(/[/\\]/g, '_');
  const filename = `IT${piva}_${numForFilename}.xml`;

  return { xml, filename };
}

export function downloadFatturaPA(doc: Document, profile: Profile): void {
  const { xml, filename } = generateFatturaPA(doc, profile);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
