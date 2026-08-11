# 🐾 DevPet · Developer Desktop Pet

![Version](https://img.shields.io/badge/version-v1.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

> **A desktop pet that keeps you company while you work/code** — with integrated weather, market data, GitHub showcase and Pomodoro timer, so your desktop is never boring.

![DevPet](devpet/assets/favicon.svg)

A zero-dependency, pure-static, ready-to-use **developer desktop mascot** app. It ships with a cute mascot drawn with inline SVG, supporting drag, lock, mood/weather reactions, and integrated developer info panels (weather, stocks, cryptocurrency, GitHub showcase, Pomodoro).

---

## ✨ Core Features

| Feature | Description |
| --- | --- |
| 🐱 **Mascot Core** | Inline SVG drawing, supporting idle / sleep / happy / sad / working / chase state machine |
| 🌦️ **Weather Reaction** | Happy on sunny days, sad on rain/snow, extensible clothing/prop reactions |
| 📈 **Stock / Crypto Quotes** | Stocks (Stooq CSV) + cryptocurrency (CoinGecko) real-time quotes |
| 🐙 **GitHub Showcase** | Display public repos, star count, contribution heatmap, recent commits/PRs |
| 🍅 **Pomodoro** | 25+5 Pomodoro technique, auto-switch work/rest states |
| 🧲 **Drag / Lock** | Freely drag position, one-click lock to prevent misoperation |
| 🧩 **Widget Drag / Toggle** | Each info panel can be reordered by drag and closed |
| 🪪 **Pet Metadata** | Configurable pet name / kind / vibes / gender / occupation / personality / colors / sprites, aligned with the petdex ecosystem |
| 🖌️ **Pet Editor UI** | Visually modify name, type, vibes, gender, occupation, personality, colors with live preview |
| 🔗 **GitHub Account Linking** | Enter username in settings panel for real-time contribution heatmap |
| 💾 **Offline Degradation** | All external API failures automatically fall back to built-in data, works offline |
| 🎨 **Dark/Light Theme** | One-click dark/light theme switch with persisted preference |
| 🎨 **Theme Market (Multi-pet)** | 6 built-in preset pet themes (incl. colorful tabby cat), one-click switch + export/import pet config |
| 🔔 **Notification Service (Webhook)** | Configure Discord / Slack / Telegram for Pomodoro/like/collab event push |
| 🤝 **Collaboration Mode** | Online status + shared project progress + collab invite links |
| 🧵 **Bubble Priority Queue** | Critical notifications shown first, low priority queued without interruption |
| 🦋 **Colorful Tabby Cat** | Detects user input activity → chases butterfly; idle 15 min → sleeps in cat bed |
| 🐟 **Cat Food System** | token consumption → cat food accumulation, feeding reminder every 4 hours, multiple tiers |
| 🤖 **Codex Token Integration** | API / manual report of real token consumption, auto-sync wallet |
| 🛒 **Cat Food Purchase** | Buy different tiers of cat food with wallet tokens (basic/salmon/tuna/wagyu) |
| 🏅 **Pet Growth System** | Feeding/interaction/focus raise intimacy and XP, level up unlocks premium cat food |
| 🍅 **Pomodoro Integration** | Focus sessions grant XP + intimacy, feed during rest to recover, time logic auto-links |
| ⚡ **Coding Activity Reaction** | Listens to Codex token deltas → pet reacts in real time to coding agent activity (working + encouraging bubble) |

---

## 🚀 Quick Start

### Option 1: Run Directly in Browser (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd DevPet

# Open index.html directly in browser
open devpet/index.html        # macOS
start devpet/index.html       # Windows
xdg-open devpet/index.html    # Linux
```

> Pure static, zero dependency — no npm install, no build step, double-click and go.

### Option 2: Local HTTP Server

```bash
cd devpet
python3 -m http.server 8000
# Visit http://localhost:8000 in browser
```

---

## 📁 Directory Structure

```
DevPet/
├── devpet/
│   ├── index.html          # App entry
│   ├── assets/
│   │   └── favicon.svg     # Mascot SVG icon
│   ├── css/
│   │   └── style.css       # Global styles + dark theme + animations
│   ├── js/
│   │   ├── app.js          # App entry, settings panel & event bindings
│   │   ├── config.js       # Config / API endpoints / offline data
│   │   ├── store.js        # localStorage state management
│   │   ├── mascot.js       # Mascot core (state machine/weather/drag/lock)
│   │   ├── weather.js      # Weather module
│   │   ├── market.js       # Stock / crypto quotes
│   │   ├── github.js       # GitHub showcase/contribution heatmap/account link
│   │   ├── pet.js          # Pet metadata schema
│   │   ├── widgets.js      # Widget rendering (drag/toggle)
│   │   ├── social.js       # Social layer (bubble priority queue/business card/collab)
│   │   ├── hub.js          # Control center (theme market/notification service/collab)
│   │   ├── activity.js     # Activity detection (tabby chase butterfly/sleep)
│   │   ├── catfood.js      # Cat food purchase & transaction system
│   │   ├── growth.js       # Pet growth system
│   │   ├── codex.js        # Codex token real data integration
│   │   └── codingActivity.js # Coding activity reaction (petdex-style)
│   └── docs/
│       ├── ARCHITECTURE.md # Architecture docs
│       ├── PET_SPEC.md     # Pet spec docs
│       └── PROJECT_PLAN.md # Project plan
├── tauri/                  # Tauri 2 desktop shell (phase 2)
│   ├── index.html          # Desktop shell entry (reuses ../devpet)
│   ├── tauri.css           # Desktop shell extra styles
│   ├── tauri.js            # Tauri bridge layer (always-on-top/passthrough/notify)
│   ├── vite.config.js      # Vite config
│   └── src-tauri/          # Rust backend (window/tray/notification)
└── README.md               # This document
```

---

## 🔧 Tech Stack

| Item | Choice | Description |
| --- | --- | --- |
| Runtime | Pure static HTML/CSS/JS | Zero dependency, double-click ready |
| Desktop shell | **Tauri 2** (Rust backend) | Global always-on-top / click-through / tray / notifications |
| State management | `localStorage` | Persists pet position/mood/settings |
| Data source | Public API + offline fallback | Works without keys |
| Module organization | ES Modules (13 modules) | Clear structure, easy to maintain |
| Icons | Inline SVG | No external resources |

---

## 🎮 Mascot State Machine

```
idle ──► sleep   （30s idle timeout; tabby 15 min）
idle ──► happy   （nice weather / like）
idle ──► sad     （bad weather / data fetch failure）
idle ──► working （Pomodoro running）
idle ──► chase   （tabby detects input → chase butterfly）
chase ─► idle    （butterfly animation ends / stops input）
sleep ─► chase   （tabby: detects input → wake & chase butterfly）
sleep ─► idle    （click to wake）
locked ─► drag disabled in all states
```

---

## 🛠️ Custom Configuration

All configuration is centralized in `devpet/js/config.js`; you can easily modify:

- **API endpoints**: replace weather / market / GitHub data sources
- **Mascot position**: default initial position
- **Widget toggles**: `DEFAULT_WIDGETS` controls which panels show
- **Pomodoro**: work duration / rest duration / long break cycle
- **Offline data**: fallback data when offline

---

## 🗺️ Roadmap

### Done ✅
- [x] Mascot core (state machine / weather reaction / drag / lock)
- [x] Weather / stocks / crypto / GitHub / Pomodoro widgets
- [x] **Pet metadata schema** (name / occupation / colors / sprites / widgets)
- [x] **Widget drag-sort + close toggle**
- [x] **GitHub contribution heatmap + recent commits/PRs + account linking**
- [x] Social layer (bubble / business card / basic collab state)
- [x] Offline degradation mechanism
- [x] **Tauri 2 desktop shell**: global always-on-top / frameless transparent / click-through / system tray / native notifications
- [x] **Pomodoro system notification link**: session end → desktop shell native notification (browser degrades to bubble)
- [x] **Pet editor UI**: visually modify name / gender / occupation / personality / colors, live preview + reset default
- [x] **Dark/Light theme switch**: 🌓 one-click toggle, persisted
- [x] **Theme market (multi-pet)**: 6 built-in themes (incl. colorful tabby) + pet config export/import (JSON)
- [x] **Notification service (Webhook)**: Discord / Slack / Telegram config & event push (Pomodoro / like / collab / startup / test)
- [x] **Collaboration mode**: online status (online / collaborating / away) + shared project progress + collab invite links
- [x] **Bubble priority queue**: critical / normal / low, critical notifications shown first
- [x] **Colorful tabby cat (Huali)**: detects input activity → chase butterfly; idle 15 min → sleep in cat bed; tabby striped look
- [x] **Cat food system**: token consumption → cat food accumulation (1000 token = 1g), feeding reminder every 4 hours, multiple-tier pricing
- [x] **Codex token integration**: API auto-fetch / manual report of real token consumption, wallet balance persisted
- [x] **Cat food purchase**: buy 4 tiers with wallet tokens (basic/salmon/tuna/wagyu), unlocked by level
- [x] **Pet growth system**: intimacy / XP / level; feeding, interaction, Pomodoro focus all boost growth
- [x] **Pomodoro integration**: focus session grants XP + intimacy, feed during rest to recover, slower cat food consumption while focusing

### Planned 🚧
- [ ] **Theme market online version**: community interop, pull remote pet configs
- [ ] **Real-time collaboration**: WebSocket server for multi-user file-state sync
- [ ] **More notification channels**: DingTalk / Feishu / Email
- [ ] **Pet skills / plugin system**

---

## 🔐 Security & Deployment

### Deployment Environments

- **Web**: `devpet/` is a pure static app, open directly in browser or host on any static server, no build needed.
- **Desktop**: `tauri/` is a Tauri 2 desktop shell; requires `npm install` + `tauri build` (depends on Rust toolchain and system WebKit libs).
- **CI**: the repo ships a `.cnb.yml` pipeline that runs JS syntax checks and frontend build on `push` / `pull_request`.
- **Ignored files**: root `.gitignore` ignores `node_modules`, `target`, build artifacts and local secrets.

### Security Model

DevPet is a pure frontend local app with no server, following the "least privilege" principle:

- **External data escaping**: text returned by GitHub / weather / market APIs (bio, repo descriptions, commit messages, city, quote names, etc.) is HTML-escaped before rendering to prevent XSS.
- **Local data escaping**: user-writable data such as pet config and collab state (incl. imported pet configs) is escaped before being rendered into the DOM.
- **Tauri CSP**: the `tauri.conf.json` CSP tightens `img-src` to only GitHub avatar/heatmap domains to reduce injection risk.
- **API Key**: Codex API Key is stored only in the local browser `localStorage`; do not configure it on shared/public computers.
- **Webhook**: notification Webhook URLs are user-configured; requests originate from the local browser, only used for event push.

### Known Limitations

- Pure frontend cannot provide server-side session auth; please be careful when handling sensitive credentials (e.g. API Key) locally.

---

## 📚 Documentation

- [Architecture](devpet/docs/ARCHITECTURE.md)
- [Pet Spec](devpet/docs/PET_SPEC.md)
- [Project Plan](devpet/docs/PROJECT_PLAN.md)

---

## 🤝 Contributing

Issues and PRs are welcome. This is an early-stage personal project; all features are freely extendable.

## 📄 License

MIT License

---

*Made with ❤️ by [uzi999](https://cnb.cool/uzi999-2026)*
