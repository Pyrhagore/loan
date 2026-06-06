# LoanService - Plateforme de Gestion de Prêts Full-Stack

LoanService est une solution complète de microfinance permettant la gestion des demandes de prêts, la validation par des agents techniques, et l'arbitrage final par l'administration avec décaissement et remboursement via FedaPay.

## 🚀 Fonctionnalités Clés

- **Authentification Sécurisée** : Gestion des rôles Admin, Agent et Client via JWT.
- **Gestion des Prêts** : Cycle de vie complet (Demande -> Étude -> Validation -> Octroi -> Remboursement).
- **Synchronisation Temps Réel** : Tous les prêts et remboursements sont synchronisés en temps réel avec une base de données PostgreSQL.
- **Intégration FedaPay** : 
  - **Décaissement Simulé** : Initiation de transaction FedaPay lors de l'approbation finale pour simulation de virement.
  - **Remboursements Automatisés** : Les clients peuvent rembourser leurs mensualités via Mobile Money/Carte.
  - **Validation Instantanée** : Le système vérifie automatiquement le statut des paiements via l'API FedaPay et met à jour l'échéancier du prêt.
- **Analyse Financière Client** : Calcul dynamique du "Somme déjà payée" et du "Reste à payer" dans le dashboard client.

## 🛠️ Stack Technique

- **Frontend** : React 19, Vite, Tailwind CSS 4, Lucide Icons.
- **Backend** : FastAPI, Python 3.12, SQLAlchemy.
- **Base de données** : PostgreSQL (Hébergé sur Neon).
- **Service de paiement** : FedaPay API.

## ⚙️ Installation & Configuration

### 1. Prérequis
- Python 3.12+
- Node.js & npm

### 2. Configuration du Backend
```bash
cd back
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
Créez un fichier `.env` dans le dossier `back/` :
```env
DATABASE_URL=votre_url_postgresql_neon
SECRET_KEY=votre_cle_secrete_jwt
FEDAPAY_PUBLIC_KEY=votre_cle_publique
FEDAPAY_SECRET_KEY=votre_cle_secrete
FEDAPAY_API_URL=https://sandbox-api.fedapay.com/v1
FRONTEND_URL=http://localhost:5173
```

Lancer le serveur :
```bash
uvicorn app.main:app --reload
```

### 3. Configuration du Frontend
```bash
cd front
npm install
npm run dev
```

## 🔑 Comptes de Test (Défaut)

- **Admin** : `admin@loan.com` / `admin123`
- **Agent** : À créer via le dashboard Admin.
- **Client** : Création via le formulaire d'inscription.

## 📄 Flux de Remboursement
1. Le client choisit un prêt "En cours".
2. Il clique sur "Saisir un remboursement".
3. Redirection vers la page de paiement FedaPay sécurisée.
4. Au retour, le dashboard vérifie la transaction et marque la mensualité comme payée si le succès est confirmé par FedaPay.
