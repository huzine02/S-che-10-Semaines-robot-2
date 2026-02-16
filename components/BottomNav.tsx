import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';

const { Link, useLocation } = ReactRouterDOM;

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const getLinkClass = (route: string) => {
    const isActive = path === route;
    return `flex flex-col items-center gap-1 p-2 transition-colors ${
      isActive ? 'text-emerald-500' : 'text-slate-300'
    }`;
  };

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-slate-100 pb-safe pt-2 px-6 flex justify-between items-center z-30 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] h-[80px] pb-4">
      <Link to="/dashboard" className={getLinkClass('/dashboard')}>
        <span className="text-xl">🏠</span>
        <span className="text-[10px] font-bold">Suivi</span>
      </Link>
      <Link to="/journal" className={getLinkClass('/journal')}>
        <span className="text-xl">📖</span>
        <span className="text-[10px] font-bold">Journal</span>
      </Link>
      <Link to="/profile" className={getLinkClass('/profile')}>
        <span className="text-xl">👤</span>
        <span className="text-[10px] font-bold">Profil</span>
      </Link>
    </nav>
  );
};