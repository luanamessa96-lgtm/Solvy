import { supabase } from './supabase';
import { Document, Deadline, Profile } from '../types';

export async function getDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addDocument(doc: Document): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .insert([doc]);

  if (error) throw error;
}

export async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(p => ({ ...p, jobType: p.job_type }));
}

export async function updateProfile(profile: Profile): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      name: profile.name,
      email: profile.email,
      country: profile.country,
      currency: profile.currency,
      job_type: profile.jobType,
      avatar: profile.avatar,
    })
    .eq('id', profile.id);

  if (error) throw error;
}

export async function getDeadlines(): Promise<Deadline[]> {
  const { data, error } = await supabase
    .from('deadlines')
    .select('*')
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}
