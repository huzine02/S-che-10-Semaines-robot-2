import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';

const { Link } = ReactRouterDOM;

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">🤔</div>
      <h1 className="font-display font-bold text-3xl text-[#0F2C59] mb-2">Page introuvable</h1>
      <p className="text-slate-500 mb-8">Il semblerait que vous ayez perdu votre chemin (mais pas vos abdos !).</p>
      <Link to="/dashboard" className="bg-[#0F2C59] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-colors">
        Retour au Dashboard
      </Link>
    </div>
  );
};