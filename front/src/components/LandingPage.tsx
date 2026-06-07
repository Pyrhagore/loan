import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Percent, 
  Clock, 
  Users, 
  HelpCircle, 
  Mail, 
  Phone, 
  MapPin, 
  TrendingUp, 
  Lock,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'login' | 'register' | 'dashboard' | 'home') => void;
  currentUser?: any;
}

export default function LandingPage({ onNavigate, currentUser }: LandingPageProps) {
  // Simulator State
  const [amount, setAmount] = useState<number>(1000000);
  const [duration, setDuration] = useState<number>(12);
  const [interestRate, setInterestRate] = useState<number>(8); // Default 8%
  
  // Calculations
  const calculatedTotal = amount * (1 + (interestRate / 100));
  const monthlyPart = Math.round(calculatedTotal / duration);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Qui peut demander un prêt sur BG Microfinance ?",
      a: "Toute personne physique ou morale enregistrée (professionnel, commerçant, agriculteur, entrepreneur) disposant d'une source de revenus mensuelle stable et de pièces justificatives valides."
    },
    {
      q: "Quels sont les documents requis ?",
      a: "Une carte d'identité à jour (CNI ou passeport), un justificatif de revenus (fiches de paie, relevés de vente ou bilans d'activité) et un justificatif de domicile récent."
    },
    {
      q: "Quel est le délai de validation d'un dossier ?",
      a: "Notre processus requiert une analyse soignée par l'agent de crédit sous 24 à 48 heures, suivie d'une validation finale de l'administrateur. Les fonds sont généralement débloqués dans les 3 jours ouvrés."
    },
    {
      q: "Comment s'effectuent les remboursements ?",
      a: "Les remboursements sont échelonnés mensuellement selon le calendrier fixé. Vous pouvez effectuer vos règlements directement en ligne ou auprès de nos agents agréés."
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans" id="landing-page-root">
      
      {/* Top Header / Nav Container */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 py-4 px-6 md:px-12 flex justify-between items-center" id="landing-navbar">
        <div 
          className="flex items-center space-x-3 cursor-pointer group" 
          onClick={() => onNavigate('home')}
          id="nav-logo"
        >
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-slate-900">
            Superviseur Général BG Microfinance
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {currentUser ? (
              <button 
                onClick={() => onNavigate('dashboard')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition duration-200 shadow-lg shadow-indigo-100 flex items-center space-x-2"
              >
                <span>Tableau de bord</span>
              </button>
          ) : (
            <>
              <button 
                id="nav-login-btn"
                onClick={() => onNavigate('login')}
                className="px-5 py-2 text-slate-600 hover:text-indigo-700 font-medium transition duration-200"
              >
                Se connecter
              </button>
              <button 
                id="nav-register-btn"
                onClick={() => onNavigate('register')}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-indigo-650 font-bold rounded-xl transition duration-200 shadow-sm"
              >
                Créer un compte
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto" id="landing-hero">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Hero Copy */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-805 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border border-indigo-100">
              <ShieldCheck size={14} className="mr-1 text-indigo-650" />
              Excellence & Sécurité Garantie
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950 leading-[1.1]">
              Propulsez vos projets avec nos <span className="text-indigo-600">micro-crédits</span> simplifiés.
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed max-w-xl">
              Une plateforme moderne de microfinance conçue pour simplifier la gestion, réduire les erreurs manuelles et vous accompagner dans votre insertion financière au quotidien.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                id="hero-request-btn"
                onClick={() => onNavigate('register')}
                className="px-8 py-4 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-200"
              >
                <span>Faire ma demande</span>
                <ArrowRight size={18} />
              </button>
              <a
                href="#simulator-section"
                className="px-8 py-4 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition duration-200 flex items-center justify-center space-x-2"
              >
                <span>Simuler mon prêt</span>
              </a>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-slate-200/80">
              <div>
                <dt className="text-4xl font-bold font-display text-slate-900">24h</dt>
                <dd className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Étude express</dd>
              </div>
              <div>
                <dt className="text-4xl font-bold font-display text-slate-900">0%</dt>
                <dd className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Frais cachés</dd>
              </div>
              <div>
                <dt className="text-4xl font-bold font-display text-slate-900">98%</dt>
                <dd className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Clients satisfaits</dd>
              </div>
            </div>
          </div>

          {/* Interactive Loan Simulator */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-6" id="simulator-section">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Calculator size={20} />
              </div>
              <h3 className="font-display font-semibold text-lg text-slate-900">Simulateur Intuitif de Prêt</h3>
            </div>

            {/* Slider Amount */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Montant souhaité</span>
                <span className="font-bold text-indigo-700 font-mono">
                  {amount.toLocaleString()} FCFA
                </span>
              </div>
              <input
                type="range"
                min="100000"
                max="5000000"
                step="50000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>100 000 F</span>
                <span>5 000 000 F max</span>
              </div>
            </div>

            {/* Duration Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Durée de remboursement</span>
                <span className="font-bold text-slate-900 font-mono">{duration} Mois</span>
              </div>
              <input
                type="range"
                min="3"
                max="36"
                step="3"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-655"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>3 Mois</span>
                <span>36 Mois max</span>
              </div>
            </div>

            {/* Simulated Interest rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Taux d'intérêt annuel conseillé</span>
                <span className="font-bold text-slate-900 font-mono">{interestRate}%</span>
              </div>
              <input
                type="range"
                min="4"
                max="18"
                step="1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Taux bas : 4%</span>
                <span>Taux max : 18%</span>
              </div>
            </div>

            {/* Calculations Area */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-3 font-mono text-sm border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Capital à emprunter:</span>
                <span className="font-semibold text-slate-900">{amount.toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Intérêts ({interestRate}%):</span>
                <span className="font-semibold text-slate-900">{(amount * (interestRate / 100)).toLocaleString()} F</span>
              </div>
              <div className="border-t border-slate-200 my-2 pt-2 flex justify-between text-slate-900 font-bold">
                <span>Montant Total:</span>
                <span className="text-slate-900">{calculatedTotal.toLocaleString()} FCFA</span>
              </div>
              <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between text-indigo-800 text-base font-bold">
                <span>Mensualité estimée:</span>
                <span className="text-indigo-700">{monthlyPart.toLocaleString()} F / mois</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('register')}
              className="w-full py-3.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition duration-200 flex items-center justify-center space-x-2"
            >
              <span>Commencer ma demande</span>
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      </section>

      {/* Key Services & Benefits Section */}
      <section className="bg-white py-20 px-6 md:px-12" id="landing-services">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
              La microfinance, repensée pour l'efficacité.
            </h2>
            <p className="text-slate-600">
              BG MicroFinance automatise les flux de validation pour assurer un traitement d'une fluidité absolue entre clients, agents de crédit et l'administration globale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Card 1 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 hover:shadow-lg hover:shadow-slate-100 transition duration-200">
              <div className="p-3 bg-indigo-100 text-indigo-800 rounded-xl inline-block">
                <Clock size={24} />
              </div>
              <h3 className="font-display font-semibold text-lg text-slate-900">Demande en 5 Minutes</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Renseignez votre montant, joignez vos pièces justificatives via votre mobile or ordinateur en un clin d'œil.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 hover:shadow-lg hover:shadow-slate-100 transition duration-200">
              <div className="p-3 bg-blue-100 text-blue-800 rounded-xl inline-block">
                <Users size={24} />
              </div>
              <h3 className="font-display font-semibold text-lg text-slate-900">Étude par Agent</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Chaque dossier est assigné à un conseiller agréé qui analyse les justificatifs, fixe le taux idéal et valide promptement.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 hover:shadow-lg hover:shadow-slate-100 transition duration-200">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-xl inline-block">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-display font-semibold text-lg text-slate-900">Double Validation</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Une gouvernance stricte et une validation finale par l'administrateur pour prémunir des fraudes et erreurs comptables.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 hover:shadow-lg hover:shadow-slate-100 transition duration-200">
              <div className="p-3 bg-red-100 text-red-800 rounded-xl inline-block">
                <Lock size={24} />
              </div>
              <h3 className="font-display font-semibold text-lg text-slate-900">Transparence Absolue</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Notification en temps réel à chaque étape : validation d'agent, acceptation finale ou enregistrement de versement.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-20 px-6 md:px-12 bg-slate-50 border-t border-slate-150" id="landing-faq">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-1 text-slate-500 text-sm font-semibold tracking-wider uppercase">
              <HelpCircle size={16} />
              <span>Questions Fréquentes</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-slate-950">Des réponses claires à vos questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-6 flex justify-between items-center hover:bg-slate-50 transition duration-150"
                  >
                    <span className="font-semibold text-slate-900 font-display">{faq.q}</span>
                    <ChevronDown 
                      size={20} 
                      className={`text-slate-500 transition-transform duration-305 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-sm text-slate-605 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-white py-20 px-6 md:px-12 text-center border-t border-slate-150" id="landing-cta">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-950">
            Prêt à concrétiser vos ambitions financières ?
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Rejoignez des milliers d'entrepreneurs qui font confiance à BG Microfinance pour leur croissance.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('register')}
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition duration-200 shadow-xl shadow-indigo-100"
            >
              Ouvrir mon compte dès maintenant
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-6 md:px-12 border-t border-slate-900" id="landing-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-650 rounded-lg text-white">
              <TrendingUp size={18} />
            </div>
            <span className="font-display font-bold text-white tracking-widest text-base">
              BG MICROFINANCE
            </span>
          </div>
          <div>
            © 2026 BG Microfinance S.A. Tous droits réservés. Licence n° R-2026-BFN-09.
          </div>
        </div>
      </footer>

    </div>
  );
}
