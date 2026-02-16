import { DietProfile } from '../types';

export const calculateDietProfile = (
  weight: number,
  height: number,
  age: number,
  gender: string,
  activity: number,
  healthProfile: string,
  glucose?: string
): DietProfile => {
  // Formule Mifflin-St Jeor
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (gender === 'male') bmr += 5; else bmr -= 161;

  const tdee = Math.round(bmr * activity);
  // Déficit agressif pour le protocole 10 semaines (-500kcal min ou 20%)
  const targetCalories = Math.round(tdee - 500);

  // Stratégie Macro-nutriments selon profil
  let pRatio = 0.35; // Protéines élevées par défaut pour préservation musculaire
  let cRatio = 0.35;
  let fRatio = 0.30;

  if (healthProfile === 'prediabetes') { 
    // Réduction glucides, augmentation graisses saines
    pRatio = 0.40; 
    cRatio = 0.25; 
    fRatio = 0.35; 
  } else if (healthProfile === 'cholesterol') { 
    // Réduction lipides saturés (donc total lipides plus bas)
    pRatio = 0.40; 
    cRatio = 0.40; 
    fRatio = 0.20; 
  }

  return {
    tdee,
    targetCalories,
    macros: {
      protein: Math.round((targetCalories * pRatio) / 4),
      carbs: Math.round((targetCalories * cRatio) / 4),
      fats: Math.round((targetCalories * fRatio) / 9)
    },
    biometrics: {
      gender,
      age,
      weight,
      height,
      activity
    },
    healthProfile,
    glucose
  };
};