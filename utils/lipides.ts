export interface LipidAnalysis {
  status: 'optimal' | 'warning' | 'danger';
  message: string;
  ratio: number;
}

export const analyzeLipidProfile = (ldl: number, hdl: number, trig: number): LipidAnalysis => {
  if (!ldl || !hdl) return { status: 'warning', message: 'Données insuffisantes', ratio: 0 };

  // Ratio Athérogène (LDL/HDL)
  // < 2.0 : Excellent
  // < 3.0 : Normal
  // > 4.0 : Risque élevé
  const ratio = Number((ldl / hdl).toFixed(2));

  let status: 'optimal' | 'warning' | 'danger' = 'optimal';
  let message = 'Profil lipidique excellent. Risque cardiovasculaire faible.';

  if (ratio > 4.0 || trig > 150) {
    status = 'danger';
    message = 'Attention : Ratio LDL/HDL élevé ou triglycérides hors norme. Réduisez les glucides simples.';
  } else if (ratio > 3.0) {
    status = 'warning';
    message = 'Profil moyen. Augmentez les Omega-3 et les fibres.';
  }

  return { status, message, ratio };
};