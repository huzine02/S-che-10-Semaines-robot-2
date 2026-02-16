import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithRedirect, 
  getRedirectResult,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { createInitialUserProfile } from '../utils/onboarding';
import { useAuth } from '../AuthContext';

const { useNavigate } = ReactRouterDOM;

export const Auth: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirection automatique si l'utilisateur est déjà connecté (ex: retour de Google, ou session persistante)
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Gestion du retour de redirection Google (création de profil si nécessaire)
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const res = await getRedirectResult(auth);
        if (res) {
          // L'utilisateur revient de Google, on vérifie/crée son profil
          const userDoc = await getDoc(doc(db, 'users', res.user.uid));
          if (!userDoc.exists()) {
             const profile = createInitialUserProfile(res.user);
             // @ts-ignore
            await setDoc(doc(db, 'users', res.user.uid), profile);
          }
          navigate('/dashboard');
        }
      } catch (err: any) {
        handleAuthError(err);
      }
    };
    
    checkRedirect();
  }, [navigate]);

  const handleAuthError = (err: any) => {
    console.error("Auth Error:", err);
    if (err.code === 'permission-denied') {
      setError("Erreur de permissions : Veuillez configurer les règles Firestore dans la console Firebase.");
    } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      setError("Email ou mot de passe incorrect.");
    } else if (err.code === 'auth/email-already-in-use') {
      setError("Cet email est déjà utilisé.");
    } else if (err.code === 'auth/popup-closed-by-user') {
      setError("Connexion annulée par l'utilisateur.");
    } else {
      setError(err.message || "Une erreur est survenue.");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (view === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Email de réinitialisation envoyé ! Vérifiez vos spams.');
        setView('login');
      } else if (view === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const profile = createInitialUserProfile(res.user, name);
        // @ts-ignore
        await setDoc(doc(db, 'users', res.user.uid), profile);
        navigate('/setup');
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setError('');
      // Utilisation de la redirection au lieu de la popup pour éviter les erreurs COOP/Mobile
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      handleAuthError(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-[#0F2C59] font-display">
          Sèche<span className="text-[#00B894]">10</span>Semaines
        </h1>
        <p className="text-xs font-bold text-[#00B894] uppercase tracking-widest mt-1">Protocole Métabolique</p>
      </div>

      <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#0F2C59] font-display">
            {view === 'login' ? 'Espace Membre' : view === 'register' ? 'Créer un compte' : 'Mot de passe oublié'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {view === 'login' ? 'Connectez-vous pour accéder au programme.' : view === 'register' ? 'Commencez votre transformation.' : 'Entrez votre email.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg mb-4 text-center border border-red-200 font-medium leading-relaxed">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 text-emerald-600 text-xs p-3 rounded-lg mb-4 text-center border border-emerald-200 font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {view === 'register' && (
            <input
              type="text"
              placeholder="Votre Prénom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0F2C59] outline-none font-medium"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0F2C59] outline-none font-medium"
            required
          />
          {view !== 'reset' && (
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#0F2C59] outline-none font-medium"
              required
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#0F2C59] text-white font-bold rounded-xl shadow-md hover:bg-[#163A70] transition disabled:opacity-50"
          >
            {loading ? 'Chargement...' : (view === 'login' ? 'Se connecter' : view === 'register' ? 'Commencer' : 'Envoyer le lien')}
          </button>
        </form>

        {view !== 'reset' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase font-bold text-slate-400 bg-white px-2">
                Ou continuer avec
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Google
            </button>
          </>
        )}

        <div className="mt-6 text-center text-sm space-y-2">
          {view === 'login' && (
            <>
              <button onClick={() => setView('register')} className="block w-full text-[#00B894] font-bold hover:underline">
                Pas encore membre ? Créer un compte
              </button>
              <button onClick={() => setView('reset')} className="block w-full text-slate-400 text-xs hover:text-slate-600">
                Mot de passe oublié ?
              </button>
            </>
          )}
          {view === 'register' && (
            <button onClick={() => setView('login')} className="text-[#00B894] font-bold hover:underline">
              Déjà membre ? Se connecter
            </button>
          )}
          {view === 'reset' && (
            <button onClick={() => setView('login')} className="text-slate-500 font-bold hover:underline">
              Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
};