import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Chargement...' }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
      <h2 className="font-display font-bold text-xl text-slate-800 animate-pulse">{message}</h2>
    </div>
  );
};