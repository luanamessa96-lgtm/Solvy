import { getClient } from './supabase';
import { Document, Deadline, Profile, Accountant } from '../types';

export async function uploadFile(dataUrl: string, fileName: string): Promise<string> {
  const [meta, base64] = dataUrl.split(',');
  const mimeType = meta.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const byteArray = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
  const blob = new Blob([byteArray], { type: mimeType });
  const path = `${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
  const { data, error } = await getClient().storage.from('uploads').upload(path, blob, { contentType: mimeType });
  if (error) throw error;
  return getClient().storage.from('uploads').getPublicUrl(data.path).data.publicUrl;
}

export async function deleteFile(url: string): Promise<void> {
  const path = url.split('/uploads/')[1];
  if (path) await getClient().storage.from('uploads').remove([path]);
}

export async function getDocuments(profileId: string): Promise<Document[]> {
  const { data, error } = await getClient()
    .from('documents')
    .select('*')
    .eq('profile_id', profileId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []).map(d => ({
    ...d,
    imageData: d.image_data,
    fileName: d.file_name,
    invoiceNumber: d.invoice_number,
    clientAddress: d.client_address,
    clientPiva: d.client_piva,
    clientCf: d.client_cf,
    ritenuta: d.ritenuta,
    marcaBollo: d.marca_bollo,
    ivaRate: d.iva_rate,
    rivalsaInps: d.rivalsa_inps,
    docRegime: d.doc_regime,
  }));
}

export async function addDocument(doc: Document, profileId: string): Promise<void> {
  const { error } = await getClient()
    .from('documents')
    .upsert([{
      id: doc.id,
      type: doc.type,
      title: doc.title,
      amount: doc.amount,
      date: doc.date,
      status: doc.status,
      client: doc.client,
      category: doc.category,
      image_data: doc.imageData,
      file_name: doc.fileName,
      invoice_number: doc.invoiceNumber,
      client_address: doc.clientAddress,
      client_piva: doc.clientPiva,
      client_cf: doc.clientCf,
      ritenuta: doc.ritenuta,
      marca_bollo: doc.marcaBollo,
      iva_rate: doc.ivaRate,
      rivalsa_inps: doc.rivalsaInps,
      doc_regime: doc.docRegime,
      profile_id: profileId,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'id' });

  if (error) throw error;
}

export async function updateDocument(doc: Document): Promise<void> {
  const { error } = await getClient()
    .from('documents')
    .update({
      title: doc.title,
      amount: doc.amount,
      date: doc.date,
      status: doc.status,
      client: doc.client,
      category: doc.category,
      image_data: doc.imageData,
      file_name: doc.fileName,
      invoice_number: doc.invoiceNumber,
      client_address: doc.clientAddress,
      client_piva: doc.clientPiva,
      client_cf: doc.clientCf,
      ritenuta: doc.ritenuta,
      marca_bollo: doc.marcaBollo,
      iva_rate: doc.ivaRate,
      rivalsa_inps: doc.rivalsaInps,
      doc_regime: doc.docRegime,
      updated_at: new Date().toISOString(),
    })
    .eq('id', doc.id);

  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await getClient()
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getProfiles(userId: string, userEmail?: string): Promise<Profile[]> {
  const { data, error } = await getClient()
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .order('job_type', { ascending: true });

  if (error) throw error;
  return (data || []).map(p => ({
    ...p,
    name: p.name || userEmail?.split('@')[0] || 'Utente',
    jobType: p.job_type,
    nie: p.nie,
    codiceFiscale: p.codice_fiscale,
    coefficiente: p.coefficiente,
    annoInizioAttivita: p.anno_inizio_attivita,
    iban: p.iban,
    isPro: p.is_pro ?? false,
    subscriptionStartedAt: p.subscription_started_at ?? undefined,
    regimenFiscal: p.regimen_fiscal ?? undefined,
    ivaHabitual: p.iva_habitual ?? undefined,
    region: p.region ?? undefined,
    street: p.street ?? undefined,
    cap: p.cap ?? undefined,
    city: p.city ?? undefined,
    province: p.province ?? undefined,
    redditoN1: p.reddito_n1 ?? undefined,
  }));
}

export async function createProfile(profile: Profile): Promise<void> {
  const { data: { user } } = await getClient().auth.getUser();
  const { error } = await getClient()
    .from('profiles')
    .insert({
      id: profile.id,
      user_id: user?.id,
      name: profile.name,
      email: profile.email,
      country: profile.country,
      currency: profile.currency,
      job_type: profile.jobType,
      avatar: profile.avatar,
      address: profile.address,
      piva: profile.piva,
      nie: profile.nie,
      codice_fiscale: profile.codiceFiscale,
      regime: profile.regime,
      coefficiente: profile.coefficiente,
      anno_inizio_attivita: profile.annoInizioAttivita,
      iban: profile.iban,
      is_pro: profile.isPro ?? false,
      regimen_fiscal: profile.regimenFiscal ?? null,
      iva_habitual: profile.ivaHabitual ?? null,
      region: profile.region ?? null,
      street: profile.street ?? null,
      cap: profile.cap ?? null,
      city: profile.city ?? null,
      province: profile.province ?? null,
      reddito_n1: profile.redditoN1 ?? null,
    });

  if (error) throw error;
}

export async function updateProfile(profile: Profile): Promise<void> {
  const { data: { user } } = await getClient().auth.getUser();
  const { error } = await getClient()
    .from('profiles')
    .upsert({
      id: profile.id,
      user_id: user?.id,
      name: profile.name,
      email: profile.email,
      country: profile.country,
      currency: profile.currency,
      job_type: profile.jobType,
      avatar: profile.avatar,
      address: profile.address,
      piva: profile.piva,
      nie: profile.nie,
      codice_fiscale: profile.codiceFiscale,
      regime: profile.regime,
      coefficiente: profile.coefficiente,
      anno_inizio_attivita: profile.annoInizioAttivita,
      iban: profile.iban,
      regimen_fiscal: profile.regimenFiscal ?? null,
      iva_habitual: profile.ivaHabitual ?? null,
      region: profile.region ?? null,
      street: profile.street ?? null,
      cap: profile.cap ?? null,
      city: profile.city ?? null,
      province: profile.province ?? null,
      reddito_n1: profile.redditoN1 ?? null,
    });

  if (error) throw error;
}

export async function getAccountant(profileId: string): Promise<Accountant | null> {
  const { data, error } = await getClient()
    .from('accountant')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    office: data.office,
    contractDetails: data.contract_details,
    sendingInstructions: data.sending_instructions,
  };
}

export async function updateAccountant(a: Accountant, profileId: string): Promise<void> {
  const { error } = await getClient()
    .from('accountant')
    .upsert({
      profile_id: profileId,
      first_name: a.firstName,
      last_name: a.lastName,
      email: a.email,
      phone: a.phone,
      office: a.office,
      contract_details: a.contractDetails,
      sending_instructions: a.sendingInstructions,
    }, { onConflict: 'profile_id' });

  if (error) throw error;
}

export async function getDeadlines(profileId: string): Promise<Deadline[]> {
  const { data, error } = await getClient()
    .from('deadlines')
    .select('*')
    .eq('profile_id', profileId)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data || []).map(d => ({ ...d, completed: d.completed ?? false }));
}

export async function addDeadline(deadline: Deadline, profileId: string): Promise<void> {
  const { error } = await getClient()
    .from('deadlines')
    .upsert([{ ...deadline, profile_id: profileId, updated_at: new Date().toISOString() }], { onConflict: 'id' });

  if (error) throw error;
}

export async function updateDeadline(deadline: Deadline): Promise<void> {
  const { error } = await getClient()
    .from('deadlines')
    .update({
      title: deadline.title,
      date: deadline.date,
      type: deadline.type,
      amount: deadline.amount,
      completed: deadline.completed ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deadline.id);

  if (error) throw error;
}

export async function deleteDeadline(id: string): Promise<void> {
  const { error } = await getClient()
    .from('deadlines')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
