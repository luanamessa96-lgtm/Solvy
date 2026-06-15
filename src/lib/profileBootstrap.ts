import { Profile } from '../types';

export type BootstrapResult =
  | { kind: 'dashboard'; profiles: Profile[] }
  | { kind: 'existing-incomplete'; profile: Profile }
  | { kind: 'onboarding'; shell: Profile }
  | { kind: 'session-expired' };

export interface ResolveBootstrapParams {
  profiles: Profile[];
  userId: string;
  userName: string;
  userEmail: string;
  onboardingComplete: boolean;
  hasLocalProfileTrace: boolean;
}

export function resolveBootstrapState(params: ResolveBootstrapParams): BootstrapResult {
  const { profiles, userId, userName, userEmail, onboardingComplete, hasLocalProfileTrace } = params;

  const completeProfiles = profiles.filter(p =>
    p.id === userId ? !!p.jobType : !!p.name
  );

  if (completeProfiles.length > 0) {
    return { kind: 'dashboard', profiles: completeProfiles };
  }

  if (onboardingComplete && profiles.length > 0) {
    return { kind: 'existing-incomplete', profile: profiles[0] };
  }

  if (profiles.length === 0 && hasLocalProfileTrace) {
    return { kind: 'session-expired' };
  }

  const triggerProfileId = profiles.length > 0 ? profiles[0].id : userId;
  return {
    kind: 'onboarding',
    shell: {
      id: triggerProfileId,
      name: userName,
      email: userEmail,
      jobType: '',
      country: 'Italy',
      currency: 'EUR',
      regime: 'forfettario',
    },
  };
}
