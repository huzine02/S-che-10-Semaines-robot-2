import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { SetupDiet } from './pages/SetupDiet';
import { Dashboard } from './pages/Dashboard';
import { Journal } from './pages/Journal';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';
import { LoadingScreen } from './components/LoadingScreen';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, userProfile } = useAuth();
  const location = useLocation(); // Utilisation hook officiel pour le path
  
  if (loading) return <LoadingScreen message="Vérification du compte..." />;
  
  // 1. Si pas connecté -> Login
  if (!user) return <Navigate to="/login" />;
  
  // 2. Si connecté mais pas d'onboarding complet -> Setup (Sauf si on est déjà sur /setup)
  // On utilise location.pathname car HashRouter met le path dans pathname (ex: /setup)
  if (user && !userProfile?.onboardingComplete && location.pathname !== '/setup') {
     return <Navigate to="/setup" />;
  }
  
  // 3. Si tout est bon
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route 
            path="/setup" 
            element={
              <ProtectedRoute>
                <SetupDiet />
              </ProtectedRoute>
            } 
          />
          <Route element={<Layout />}>
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
             <Route 
              path="/journal" 
              element={
                <ProtectedRoute>
                  <Journal />
                </ProtectedRoute>
              } 
            />
             <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}