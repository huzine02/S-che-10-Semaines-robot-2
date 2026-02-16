import { User } from 'firebase/auth';

export const createInitialUserProfile = (user: User, name?: string) => {
  return {
    firstName: name || user.displayName?.split(' ')[0] || 'Athlète',
    email: user.email,
    uid: user.uid,
    createdAt: new Date().toISOString(),
    onboardingComplete: false,
    dietProfile: null,
    glucoseReadings: [],
    lipidesReadings: [],
    pesees: []
  };
};