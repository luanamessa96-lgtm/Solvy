import { supabase } from './supabase';
import { Document, Deadline, Profile, Accountant } from '../types';

export async function uploadFile(dataUrl: string, fileName: string): Promise<string> {
  const [meta, base64] = dataUrl.split(',');
  const mimeType = meta.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const byteArray = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
  const blob = new Blob([byteArray], { type: mimeType });
  const path = `${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
  const { data, error } = await supabase.storage.from('uploads').upload(path, blob, { contentType: mimeType });
  if (error) throw error;
  return supabase.storage.from('uploads').getPublicUrl(data.path).data.publicUrl;
}

export async function deleteFile(url: string): Promise<void> {
  const path = url.split('/uploads/')[1];
  if (path) await supabase.storage.from('uploads').remove([path]);
}

export async function getDocuments(profileId: string): Promise<Document[]> {
  const { data, error } = await supabase
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
  const { error } = await supabase
    .from('documents')
    .insert([{
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
    }]);

  if (error) throw error;
}

export async function updateDocument(doc: Document): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({
      title: doc.title,
      amount: doc.amount,
      date: doc.date,
      status: doc.status,
      client: doc.client,
      category: doc.category,
      invoice_number: doc.invoiceNumber,
      client_address: doc.clientAddress,
      client_piva: doc.clientPiva,
      client_cf: doc.clientCf,
      ritenuta: doc.ritenuta,
      marca_bollo: doc.marcaBollo,
      iva_rate: doc.ivaRate,
      rivalsa_inps: doc.rivalsaInps,
      doc_regime: doc.docRegime,
    })
    .eq('id', doc.id);

  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(p => ({
    ...p,
    jobType: p.job_type,
    codiceFiscale: p.codice_fiscale,
    coefficiente: p.coefficiente,
    annoInizioAttivita: p.anno_inizio_attivita,
    iban: p.iban,
  }));
}

export async function updateProfile(profile: Profile): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      country: profile.country,
      currency: profile.currency,
      job_type: profile.jobType,
      avatar: profile.avatar,
      address: profile.address,
      piva: profile.piva,
      codice_fiscale: profile.codiceFiscale,
      regime: profile.regime,
      coefficiente: profile.coefficiente,
      anno_inizio_attivita: profile.annoInizioAttivita,
      iban: profile.iban,
    });

  if (error) throw error;
}

export async function getAccountant(): Promise<Accountant | null> {
  const { data, error } = await supabase
    .from('accountant')
    .select('*')
    .single();

  if (error) return null;
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

export async function updateAccountant(a: Accountant): Promise<void> {
  const { error } = await supabase
    .from('accountant')
    .update({
      first_name: a.firstName,
      last_name: a.lastName,
      email: a.email,
      phone: a.phone,
      office: a.office,
      contract_details: a.contractDetails,
      sending_instructions: a.sendingInstructions,
    })
    .eq('id', '1');

  if (error) throw error;
}

export async function getDeadlines(profileId: string): Promise<Deadline[]> {
  const { data, error } = await supabase
    .from('deadlines')
    .select('*')
    .eq('profile_id', profileId)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data || []).map(d => ({ ...d, completed: d.completed ?? false }));
}

export async function addDeadline(deadline: Deadline, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('deadlines')
    .insert([{ ...deadline, profile_id: profileId }]);

  if (error) throw error;
}

export async function updateDeadline(deadline: Deadline): Promise<void> {
  const { error } = await supabase
    .from('deadlines')
    .update({
      title: deadline.title,
      date: deadline.date,
      type: deadline.type,
      amount: deadline.amount,
      completed: deadline.completed ?? false,
    })
    .eq('id', deadline.id);

  if (error) throw error;
}

export async function deleteDeadline(id: string): Promise<void> {
  const { error } = await supabase
    .from('deadlines')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
