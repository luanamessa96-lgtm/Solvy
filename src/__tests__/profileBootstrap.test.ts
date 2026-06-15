import { describe, it, expect } from 'vitest';
import { resolveBootstrapState } from '../lib/profileBootstrap';
import { Profile } from '../types';

const USER_ID = 'user-123';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-abc',
    name: 'Mario Rossi',
    email: 'mario@example.com',
    country: 'Italy',
    currency: 'EUR',
    jobType: 'Consulente',
    regime: 'forfettario',
    ...overrides,
  };
}

describe('resolveBootstrapState', () => {
  it('returns dashboard when at least one profile is complete', () => {
    const profile = makeProfile();
    const result = resolveBootstrapState({
      profiles: [profile],
      userId: USER_ID,
      userName: 'Mario',
      userEmail: 'mario@example.com',
      onboardingComplete: true,
      hasLocalProfileTrace: true,
    });

    expect(result).toEqual({ kind: 'dashboard', profiles: [profile] });
  });

  it('returns existing-incomplete when onboarding is done but no profile passes the filter', () => {
    const incomplete = makeProfile({ id: USER_ID, jobType: '', name: '' });
    const result = resolveBootstrapState({
      profiles: [incomplete],
      userId: USER_ID,
      userName: 'Mario',
      userEmail: 'mario@example.com',
      onboardingComplete: true,
      hasLocalProfileTrace: true,
    });

    expect(result).toEqual({ kind: 'existing-incomplete', profile: incomplete });
  });

  it('returns session-expired when 0 profiles come back but the device has used the app before', () => {
    const result = resolveBootstrapState({
      profiles: [],
      userId: USER_ID,
      userName: 'Mario',
      userEmail: 'mario@example.com',
      onboardingComplete: false,
      hasLocalProfileTrace: true,
    });

    expect(result).toEqual({ kind: 'session-expired' });
  });

  it('returns onboarding for a genuinely new user (0 profiles, no local trace)', () => {
    const result = resolveBootstrapState({
      profiles: [],
      userId: USER_ID,
      userName: 'Mario',
      userEmail: 'mario@example.com',
      onboardingComplete: false,
      hasLocalProfileTrace: false,
    });

    expect(result).toEqual({
      kind: 'onboarding',
      shell: {
        id: USER_ID,
        name: 'Mario',
        email: 'mario@example.com',
        jobType: '',
        country: 'Italy',
        currency: 'EUR',
        regime: 'forfettario',
      },
    });
  });

  it('returns onboarding (not session-expired) when profiles exist but none are complete and there is no local trace', () => {
    const incomplete = makeProfile({ id: 'other-profile', jobType: '', name: '' });
    const result = resolveBootstrapState({
      profiles: [incomplete],
      userId: USER_ID,
      userName: 'Mario',
      userEmail: 'mario@example.com',
      onboardingComplete: false,
      hasLocalProfileTrace: false,
    });

    expect(result).toEqual({
      kind: 'onboarding',
      shell: {
        id: 'other-profile',
        name: 'Mario',
        email: 'mario@example.com',
        jobType: '',
        country: 'Italy',
        currency: 'EUR',
        regime: 'forfettario',
      },
    });
  });
});
