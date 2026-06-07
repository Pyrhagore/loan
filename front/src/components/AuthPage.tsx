import React, { useState } from 'react';
import { getStoredUsers, saveStoredUsers, generateId, setCurrentSessionUser as setLocalSession } from '../dataStore';
import { User, UserRole } from '../types';
import { login, register } from '../api/auth';
import { Eye, EyeOff, KeyRound, Mail, UserPlus, Phone, User as UserIcon, LogIn, Sparkles, ShieldAlert } from 'lucide-react';
import LoadingButton from './LoadingButton';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
  onBackToHome: () => void;
  initialMode?: 'login' | 'register';
}

export default function AuthPage({ onLoginSuccess, onBackToHome, initialMode = 'login' }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle Login submitting
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login(email, password);
      setLocalSession(user);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Signup submitting (Clients only, per spec)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await register({
        email: email.toLowerCase().trim(),
        password: password,
        nom: nom.toUpperCase().trim(),
        prenom: prenom.trim(),
        telephone: telephone.trim(),
        role: 'client'
      });
      setLocalSession(user);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Auto-fill helpers
  const handleDemoFill = (role: UserRole) => {
    setError(null);
    setMode('login');
    if (role === 'admin') {
      setEmail('admin@loan.com');
      setPassword('admin123');
    } else if (role === 'agent') {
      setEmail('agent@bg.com');
      setPassword('agent');
    } else if (role === 'client') {
      setEmail('client@bg.com');
      setPassword('client');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center font-sans" id="auth-page-root">
      
      {/* Brand Back-to-home button anchor */}
      <button 
        onClick={onBackToHome}
        className="mb-8 flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-indigo-700 transition duration-150 group"
      >
        <span>← Retour à l'accueil BG MicroFinance</span>
      </button>

      {/* Main Authentication Card */}
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden" id="auth-box">
        
        {/* Banner header of the card */}
        <div className="bg-slate-900 px-6 py-8 text-center text-white relative">
          <div className="absolute right-3 top-3 inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-500/15 text-indigo-400 rounded-full text-[10px] font-mono tracking-widest uppercase border border-indigo-550/20">
            <Sparkles size={10} />
            <span>Portail unique</span>
          </div>
          <h2 className="font-display font-bold text-2xl tracking-tight">
            {mode === 'login' ? 'Connexion Sécurisée' : 'Création de Compte'}
          </h2>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            {mode === 'login' 
              ? 'Veuillez saisir vos identifiants pour accéder à votre espace de gestion.'
              : 'Rejoignez-nous et simulez vos échéanciers bancaires à taux réduit.'
            }
          </p>
        </div>

        {/* Form area */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start space-x-2 animate-pulse" id="auth-error-box">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4" id="login-form">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Adresse email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: admin@bg.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Mot de passe</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <KeyRound size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Saisissez votre mot de passe"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <LoadingButton
                type="submit"
                id="login-submit-btn"
                isLoading={isLoading}
                loadingText="Connexion..."
                className="w-full py-3.5 rounded-xl font-medium flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100"
              >
                <LogIn size={18} />
                <span>Se connecter</span>
              </LoadingButton>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Vous n'avez pas de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(null); }}
                    className="text-indigo-700 font-semibold hover:underline"
                  >
                    S'inscrire comme Client
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleRegister} className="space-y-4" id="register-form">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nom</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <UserIcon size={14} />
                    </span>
                    <input
                      type="text"
                      required
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="DUPONT"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Prénom</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <UserIcon size={14} />
                    </span>
                    <input
                      type="text"
                      required
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      placeholder="Jean"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Numéro de téléphone</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Phone size={14} />
                  </span>
                  <input
                    type="tel"
                    required
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="Ex: +229 97 88 55 22"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Adresse email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="j.dupont@email.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Mot de passe</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Confirmer</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <LoadingButton
                type="submit"
                id="register-submit-btn"
                isLoading={isLoading}
                loadingText="Création..."
                className="w-full py-3 rounded-xl font-medium flex items-center justify-center space-x-2 shadow-md"
              >
                <UserPlus size={18} />
                <span>Créer mon compte</span>
              </LoadingButton>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Vous avez déjà un compte ?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className="text-indigo-705 font-semibold hover:underline"
                  >
                    Se connecter
                  </button>
                </p>
              </div>
            </form>
          )}

        </div>


      </div>
    </div>
  );
}
