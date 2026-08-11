# 🐾 DevPet · Animal de bureau pour développeurs

![Version](https://img.shields.io/badge/version-v1.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

> **Un petit animal de bureau qui vous accompagne pendant que vous travaillez/développez** — avec météo, données de marché, vitrine GitHub et minuteur Pomodoro intégrés, pour que votre bureau ne soit plus jamais ennuyeux.

![DevPet](devpet/assets/favicon.svg)

Une application **mascotte de bureau pour développeurs** zéro dépendance, purement statique et prête à l'emploi. Elle inclut une mascotte adorable dessinée en SVG inline, avec prise en charge du glisser-déposer, du verrouillage, des réactions d'humeur/météo, et des panneaux d'information pour développeurs (météo, actions, crypto, vitrine GitHub, Pomodoro).

---

## ✨ Fonctionnalités principales

| Fonctionnalité | Description |
| --- | --- |
| 🐱 **Cœur mascotte** | Dessin SVG inline, machine à états idle / sleep / happy / sad / working / chase |
| 🌦️ **Réaction météo** | Heureux par beau temps, triste en pluie/neige, réactions extensibles (vêtements/accessoires) |
| 📈 **Cours actions / crypto** | Actions (CSV Stooq) + crypto (CoinGecko) en temps réel |
| 🐙 **Vitrine GitHub** | Affiche les dépôts publics, le nombre d'étoiles, la heatmap de contribution, les commits/PR récents |
| 🍅 **Pomodoro** | Technique Pomodoro 25+5, bascule automatique travail/repos |
| 🧲 **Glisser / Verrouiller** | Position librement déplaçable, verrouillage en un clic |
| 🧩 **Glisser / Basculer des widgets** | Chaque panneau d'info peut être réordonné et fermé |
| 🪪 **Métadonnées du pet** | Nom / type (kind) / vibes / sexe / profession / personnalité / couleurs / sprites configurables, aligné sur l'écosystème petdex |
| 🖌️ **UI d'éditeur de pet** | Modification visuelle du nom, type, vibes, sexe, profession, personnalité, couleurs avec aperçu en direct |
| 🔗 **Association de compte GitHub** | Saisir le nom d'utilisateur dans les réglages pour une heatmap de contribution en temps réel |
| 💾 **Dégradation hors ligne** | Tous les échecs d'API externes basculent automatiquement vers les données intégrées, fonctionne hors ligne |
| 🎨 **Thème sombre/clair** | Bascule en un clic, préférence persistée |
| 🎨 **Marché de thèmes (multi-pets)** | 6 thèmes de pets prédéfinis (dont le chat tigré coloré), bascule + export/import de config pet |
| 🔔 **Service de notifications (Webhook)** | Configurez Discord / Slack / Telegram pour l'envoi d'événements (Pomodoro / like / collab) |
| 🤝 **Mode collaboration** | Statut en ligne + progression de projet partagée + liens d'invitation |
| 🧵 **File d'attente de bulles prioritaire** | Notifications critiques affichées d'abord, faible priorité mise en file sans interrompre |
| 🦋 **Chat tigré coloré** | Détecte l'activité de saisie → chasse le papillon ; 15 min d'inactivité → dort dans son panier |
| 🐟 **Système de nourriture** | consommation de tokens → accumulation de nourriture, rappel toutes les 4 heures, plusieurs niveaux |
| 🤖 **Intégration des tokens Codex** | Rapport API / manuel de la consommation réelle de tokens, synchronisation auto du portefeuille |
| 🛒 **Achat de nourriture** | Achetez différents niveaux de nourriture avec les tokens du portefeuille (basique/saumon/thon/wagyu) |
| 🏅 **Système de croissance du pet** | Nourriture/interaction/concentration augmentent l'affinité et l'XP, le niveau débloque la nourriture premium |
| 🍅 **Intégration Pomodoro** | Les sessions de concentration octroient XP + affinité, nourrir pendant le repos, logique temporelle auto |
| ⚡ **Réaction à l'activité de codage** | Écoute les deltas de tokens Codex → le pet réagit en temps réel à l'activité de l'agent (working + bulle d'encouragement) |

---

## 🚀 Démarrage rapide

### Option 1 : Lancer directement dans le navigateur (recommandé)

```bash
# Cloner le dépôt
git clone <repo-url>
cd DevPet

# Ouvrir index.html directement dans le navigateur
open devpet/index.html        # macOS
start devpet/index.html       # Windows
xdg-open devpet/index.html    # Linux
```

> Pur statique, zéro dépendance — pas de `npm install`, pas d'étape de build, double-clic et c'est parti.

### Option 2 : Serveur HTTP local

```bash
cd devpet
python3 -m http.server 8000
# Accéder à http://localhost:8000 dans le navigateur
```

---

## 📁 Structure des répertoires

```
DevPet/
├── devpet/
│   ├── index.html          # Point d'entrée de l'application
│   ├── assets/
│   │   └── favicon.svg     # Icône SVG de la mascotte
│   ├── css/
│   │   └── style.css       # Styles globaux + thème sombre + animations
│   ├── js/
│   │   ├── app.js          # Entrée, panneau de réglages et événements
│   │   ├── config.js       # Config / endpoints API / données hors ligne
│   │   ├── store.js        # Gestion d'état localStorage
│   │   ├── mascot.js       # Cœur mascotte (machine à états/météo/glisser/verrouiller)
│   │   ├── weather.js      # Module météo
│   │   ├── market.js       # Cours actions / crypto
│   │   ├── github.js       # Vitrine GitHub/heatmap/association de compte
│   │   ├── pet.js          # Schéma des métadonnées du pet
│   │   ├── widgets.js      # Rendu des widgets (glisser/basculer)
│   │   ├── social.js       # Couche sociale (file de bulles/carte de visite/collab)
│   │   ├── hub.js          # Centre de contrôle (marché de thèmes/notifications/collab)
│   │   ├── activity.js     # Détection d'activité (chat tigré/chasse/sommeil)
│   │   ├── catfood.js      # Système d'achat de nourriture
│   │   ├── growth.js       # Système de croissance du pet
│   │   ├── codex.js        # Intégration des données réelles Codex
│   │   └── codingActivity.js # Réaction à l'activité de codage (style petdex)
│   └── docs/
│       ├── ARCHITECTURE.md # Documentation d'architecture
│       ├── PET_SPEC.md     # Spécifications du pet
│       └── PROJECT_PLAN.md # Plan du projet
├── tauri/                  # Coquille de bureau Tauri 2 (phase 2)
│   ├── index.html          # Entrée coquille (réutilise ../devpet)
│   ├── tauri.css           # Styles supplémentaires coquille
│   ├── tauri.js            # Couche pont Tauri (toujours au-dessus/transparence/notif)
│   ├── vite.config.js      # Configuration Vite
│   └── src-tauri/          # Backend Rust (fenêtre/plateau/notifications)
└── README.md               # Ce document
```

---

## 🔧 Pile technologique

| Élément | Choix | Description |
| --- | --- | --- |
| Exécution | HTML/CSS/JS pur statique | Zéro dépendance, prêt au double-clic |
| Coquille de bureau | **Tauri 2** (backend Rust) | Toujours au-dessus / clic-transparent / plateau / notifications |
| Gestion d'état | `localStorage` | Persiste position/humeur/réglages du pet |
| Source de données | API publique + repli hors ligne | Fonctionne sans clés |
| Organisation des modules | ES Modules (13 modules) | Structure claire, facile à maintenir |
| Icônes | SVG inline | Aucune ressource externe |

---

## 🎮 Machine à états de la mascotte

```
idle ──► sleep   （timeout idle 30 s; chat tigré 15 min）
idle ──► happy   （beau temps / like）
idle ──► sad     （mauvais temps / échec de récupération）
idle ──► working （Pomodoro en cours）
idle ──► chase   （le chat tigré détecte la saisie → chasse le papillon）
chase ─► idle    （fin de l'animation / arrêt de la saisie）
sleep ─► chase   （chat tigré : détecte la saisie → réveil et chasse）
sleep ─► idle    （clic pour réveiller）
locked ─► glisser désactivé dans tous les états
```

---

## 🛠️ Configuration personnalisée

Toute la configuration est centralisée dans `devpet/js/config.js` ; vous pouvez facilement modifier :

- **Endpoints API** : remplacer les sources météo / marché / GitHub
- **Position de la mascotte** : position initiale par défaut
- **Bascules des widgets** : `DEFAULT_WIDGETS` contrôle les panneaux affichés
- **Pomodoro** : durée de travail / repos / cycle de longue pause
- **Données hors ligne** : données de repli hors connexion

---

## 🗺️ Feuille de route

### Terminé ✅
- [x] Cœur mascotte (machine à états / réaction météo / glisser / verrouiller)
- [x] Widgets météo / actions / crypto / GitHub / Pomodoro
- [x] **Schéma des métadonnées du pet** (nom / profession / couleurs / sprites / widgets)
- [x] **Tri par glisser + bascule de fermeture des widgets**
- [x] **Heatmap de contribution GitHub + commits/PR récents + association de compte**
- [x] Couche sociale (bulle / carte de visite / état de collab de base)
- [x] Mécanisme de dégradation hors ligne
- [x] **Coquille de bureau Tauri 2** : toujours au-dessus / transparent sans bordure / clic-transparent / plateau système / notifications natives
- [x] **Liaison des notifications Pomodoro** : fin de session → notification native de la coquille (le navigateur se dégrade en bulle)
- [x] **UI d'éditeur de pet** : modification visuelle du nom / sexe / profession / personnalité / couleurs, aperçu en direct + réinitialisation
- [x] **Bascule thème sombre/clair** : bouton 🌓, persisté
- [x] **Marché de thèmes (multi-pets)** : 6 thèmes intégrés (dont le chat tigré) + export/import de config (JSON)
- [x] **Service de notifications (Webhook)** : Discord / Slack / Telegram config & envoi d'événements (Pomodoro / like / collab / démarrage / test)
- [x] **Mode collaboration** : statut en ligne (en ligne / en collab / absent) + progression partagée + liens d'invitation
- [x] **File de bulles prioritaire** : critical / normal / low, critiques affichées d'abord
- [x] **Chat tigré coloré (Huali)** : détecte la saisie → chasse le papillon ; 15 min d'inactivité → dort dans son panier ; look rayé de chat tigré
- [x] **Système de nourriture** : consommation de tokens → accumulation (1000 tokens = 1 g), rappel toutes les 4 heures, prix multi-niveaux
- [x] **Intégration des tokens Codex** : récupération auto API / rapport manuel de la consommation réelle, solde du portefeuille persisté
- [x] **Achat de nourriture** : achetez 4 niveaux avec les tokens (basique/saumon/thon/wagyu), débloqués par niveau
- [x] **Système de croissance du pet** : affinité / XP / niveau ; nourriture, interaction, concentration Pomodoro boostent la croissance
- [x] **Intégration Pomodoro** : la session de concentration octroie XP + affinité, nourrir pendant le repos, consommation plus lente pendant la concentration

### Planifié 🚧
- [ ] **Marché de thèmes en ligne** : interopérabilité communautaire, récupération de configs distantes
- [ ] **Collaboration en temps réel** : serveur WebSocket pour la synchro d'état de fichiers multi-utilisateurs
- [ ] **Plus de canaux de notification** : DingTalk / Feishu / Email
- [ ] **Système de compétences / plugins du pet**

---

## 🔐 Sécurité et déploiement

### Environnements de déploiement

- **Web** : `devpet/` est une app purement statique, ouvrez-la directement dans le navigateur ou hébergez-la sur n'importe quel serveur statique, sans build.
- **Bureau** : `tauri/` est une coquille de bureau Tauri 2 ; nécessite `npm install` + `tauri build` (dépend de la toolchain Rust et des bibliothèques WebKit du système).
- **CI** : le dépôt inclut un pipeline `.cnb.yml` qui exécute des vérifications de syntaxe JS et un build frontend sur `push` / `pull_request`.
- **Fichiers ignorés** : `.gitignore` racine ignore `node_modules`, `target`, les artefacts de build et les secrets locaux.

### Modèle de sécurité

DevPet est une application frontend purement locale sans serveur, suivant le principe du « moindre privilège » :

- **Échappement des données externes** : les textes renvoyés par les API GitHub / météo / marché (bio, descriptions de dépôts, messages de commit, ville, noms de cours, etc.) sont échappés en HTML avant le rendu pour prévenir le XSS.
- **Échappement des données locales** : les données écrites par l'utilisateur comme la config du pet et l'état de collab (incl. les configs importées) sont échappées avant le rendu dans le DOM.
- **CSP Tauri** : le CSP de `tauri.conf.json` resserre `img-src` aux seuls domaines d'avatars/heatmaps GitHub pour réduire le risque d'injection.
- **API Key** : la clé API Codex n'est stockée que dans le `localStorage` du navigateur local ; ne la configurez pas sur des ordinateurs partagés/publics.
- **Webhook** : les URLs Webhook de notification sont configurées par l'utilisateur ; les requêtes proviennent du navigateur local, uniquement pour l'envoi d'événements.

### Limitations connues

- Un frontend pur ne peut pas fournir d'authentification de session côté serveur ; soyez prudent avec les identifiants sensibles (comme l'API Key) en local.

---

## 📚 Documentation

- [Architecture](devpet/docs/ARCHITECTURE.md)
- [Spécifications du pet](devpet/docs/PET_SPEC.md)
- [Plan du projet](devpet/docs/PROJECT_PLAN.md)

---

## 🤝 Contribution

Les issues et les PR sont bienvenues. C'est un projet personnel en phase de démarrage ; toutes les fonctionnalités sont librement extensibles.

## 📄 Licence

Licence MIT

---

*Fait avec ❤️ par [uzi999](https://cnb.cool/uzi999-2026)*
