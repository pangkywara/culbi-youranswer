<p align="center">
  <img src="./assets/images/icon2.png" alt="Culbi Logo" width="120" />
</p>

<h1 align="center">🌏 Culbi — Cultural Bridge</h1>

<p align="center">
  <strong>Bridging Cultures Across ASEAN — One Landmark at a Time</strong>
</p>

<p align="center">
  <a href="https://echoframe.site">
    <img src="https://img.shields.io/badge/📲_Download_App-echoframe.site-blue?style=for-the-badge&logoColor=white" alt="Download on echoframe.site" />
  </a>
</p>

<p align="center">
<a href="https://drive.google.com/file/d/1r6q6-PUKH6X31_BPxbcYmFNNnyVAmsvQ/view">
    <img src="https://img.shields.io/badge/🎥_Video_Demo-Google_Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" alt="Video Demo" />
  </a>
  <a href="https://drive.google.com/file/d/1dXeqb4Kb6WChC0gw64gL5aUT8b8pW0Kh/view?usp=sharing">
    <img src="https://img.shields.io/badge/📊_Final_Report-View_Project-orange?style=for-the-badge&logo=googledocs&logoColor=white" alt="Final Report" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo_SDK-54-000020?style=flat-square&logo=expo" />
  <img src="https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/Gemini_AI-Powered-4285F4?style=flat-square&logo=google" />
</p>

---

## 📖 What is Culbi?

**Culbi (Cultural Bridge)** is a mobile-first platform that transforms how people discover, learn about, and connect through the cultural heritage of **ASEAN nations**. Instead of being a traditional travel guide, Culbi turns cultural exploration into a gamified, social, and AI-powered experience.

Point your camera at a landmark — Culbi identifies it instantly using **Google Gemini AI**, enriches it with cultural stories, and rewards you with XP and collectible badges. Plan trips with an **AI concierge**, join location-based community groups right on the map, and compete on leaderboards — all while discovering the rich tapestry of Southeast Asian culture.

### 🎯 The Problem We Solve

> Cultural heritage across ASEAN is incredibly rich but **fragmented and hard to access**. Travelers visit landmarks without understanding their cultural significance. Locals lack a platform to share and preserve their heritage. There's no engaging way to bridge this gap.

**Culbi bridges that gap** by making cultural discovery interactive, social, and rewarding.

---

## ✨ Core Features

### 🗺️ Interactive Discovery Map
- **Google Maps integration** with custom themed styles (Culbi, Dark, Minimal, Natural)
- Discover **cultural landmarks, temples, museums, and heritage sites** nearby
- Real-time **Points of Interest (POI)** with cultural tip overlays
- **Map clustering** for dense landmark areas
- Toggle layers: POI, Transit, Traffic, Satellite view

### 🤖 AI-Powered Landmark Detection
- **Point & detect** — aim your camera at any landmark and Culbi identifies it using **Google Gemini Vision AI**
- Instant cultural enrichment: history, significance, fun facts, and local stories
- Supports gallery uploads for offline identification
- Records scan history for your cultural passport

### 💬 Bridge — Social & Messaging
- **Direct messages** with other cultural explorers
- **Group chats** — join or create community groups based on interests
- **Map-based group placement** — long-press the map to pin a new group at any location
- **AI Liaison chatbot** — your personal Gemini-powered cultural concierge
- Full-text **message search** across all conversations

### 🎯 Missions & XP System
- Complete **cultural missions** to earn XP and level up
- Categories: Explore, Social, Learn, Create, and more
- Track your **total XP, rank, and level progression**
- Detailed mission drawer with progress tracking

### ✈️ Trip Planning with AI Concierge
- **AI-powered trip builder** — describe your interests, and Gemini generates a full itinerary
- Edit trips with drag-and-drop stop reordering
- Each stop includes a **mini-map with property marker**
- **Past trips archive** with timeline view
- Calendar integration for date planning

### 🏆 Badges, Collections & Passports
- Earn **collectible badges** from visiting landmarks and completing missions
- **Cultural collections** — curate your favorite discoveries
- **Digital passport** — a visual record of your ASEAN cultural journey
- **Gacha system** — spin for rare cultural collectible rewards

### 📅 Events Discovery
- Browse **upcoming cultural events** across ASEAN nations
- Filter by country, sorted chronologically
- Detailed event pages with location maps

### 👤 Profile & Leaderboard
- Track your stats: XP, badges, collections, trips
- **Leaderboard** — compete with other cultural explorers
- Google Sign-In authentication
- Guest mode for quick exploration

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────────────┐
│                   Mobile App (Expo)                    │
│  React Native 0.81 · TypeScript · Expo Router          │
│  ┌─────────┬──────────┬──────────┬─────────┬────────┐ │
│  │  Home   │  Bridge  │ Missions │  Trips  │Profile │ │
│  │ (Maps)  │  (Chat)  │  (XP)   │  (AI)   │(Stats) │ │
│  └────┬────┴────┬─────┴────┬────┴────┬────┴───┬────┘ │
│       │         │          │         │        │       │
│  ┌────▼─────────▼──────────▼─────────▼────────▼────┐  │
│  │        Supabase Client (Auth + Realtime DB)     │  │
│  └──────────────────────┬──────────────────────────┘  │
└─────────────────────────┼─────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐
  │   Supabase   │ │  Python/     │ │  Google APIs  │
  │  PostgreSQL  │ │  FastAPI     │ │  ───────────  │
  │  + Auth      │ │  Backend     │ │  Maps SDK     │
  │  + Storage   │ │  ──────────  │ │  Places API   │
  │  + Realtime  │ │  Gemini AI   │ │  Vision AI    │
  └──────────────┘ │  Landmark    │ └───────────────┘
                   │  Detection   │
                   │  Trip AI     │
                   │  Chat Agent  │
                   └──────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Expo SDK 54 · React Native 0.81.5 (New Architecture) |
| **Language** | TypeScript 5.9 |
| **Routing** | Expo Router (file-based) |
| **State** | Zustand · React Context |
| **Animations** | Reanimated 4 · Lottie |
| **Graphics** | Skia (Shopify) · Three.js · expo-three |
| **Maps** | react-native-maps (Google Maps) · Map Clustering |
| **UI** | NativeWind/TailwindCSS · Phosphor Icons · Bottom Sheet |
| **Backend** | Supabase (Postgres, Auth, Realtime, Storage) |
| **AI Engine** | Google Gemini 2.0 (Vision + Chat + Agent) |
| **API Server** | Python FastAPI (hosted on AWS App Runner) |
| **Auth** | Google Sign-In · Supabase Auth · Anonymous sessions |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|------------|---------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| Xcode | ≥ 15 (iOS) |
| Android Studio | Latest (Android) |
| Google Maps API Key | [Get one here](https://console.cloud.google.com/) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/culbi.git
cd culbi

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your keys (see Environment Variables below)

# 4. Generate native projects
npx expo prebuild

# 5. Install iOS pods
cd ios && pod install && cd ..
```

### Running the App

```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android

# Development server (Expo Go — limited features)
npm start
```

> **Note:** Google Maps and Landmark Detection require a **native dev build** (`npx expo run:ios/android`), not Expo Go.

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Google Services
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_key
EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY=your_key

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google Sign-In
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id

# Backend
EXPO_PUBLIC_GEMINI_BACKEND_URL=https://your-backend.awsapprunner.com
EXPO_PUBLIC_BACKEND_API_KEY=your_api_key
```

---

## 📁 Project Structure

```
culbi/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── index.tsx            #   Home — Discovery feed + Map
│   │   ├── bridge.tsx           #   Bridge — Messages & Groups
│   │   ├── missions.tsx         #   Missions — XP & Quests
│   │   ├── trips/               #   Trips — Plan & Track
│   │   └── profile.tsx          #   Profile — Stats & Settings
│   ├── chatbot/                  # AI Chatbot (Gemini)
│   ├── destinations/             # Landmark detail & discovery map
│   ├── events/                   # Cultural events
│   ├── explorer/                 # Full-screen explore
│   ├── landmark-detection.tsx    # Camera-based AI detection
│   ├── badges/                   # Badge collection
│   ├── collections/              # Curated collections
│   ├── passports/                # Digital cultural passport
│   ├── groupchat/                # Group messaging
│   ├── chat/                     # Direct messaging
│   └── onboarding/               # First-time user flow
├── components/                   # Reusable UI components
│   ├── Maps/                    #   Map views, markers, settings
│   ├── Explore/                 #   Search, cards, modals
│   ├── Messages/                #   Chat bubbles, bridge UI
│   ├── Missions/                #   Mission cards, drawers
│   ├── LandmarkDetection/       #   Camera UI, result cards
│   ├── Events/                  #   Event cards, detail views
│   ├── Gacha/                   #   Gacha spin system
│   ├── Collections/             #   Collection grids
│   ├── Trips/                   #   Timeline, trip cards
│   ├── PlanTrips/               #   AI trip builder
│   └── Profiles/                #   Profile cards, settings
├── hooks/                        # Custom React hooks (26 hooks)
│   ├── useGeminiChat.ts         #   AI chat with tool calling
│   ├── usePlacesSearch.ts       #   Google Places integration
│   ├── useMissions.ts           #   Mission tracking & XP
│   ├── useMapGroups.ts          #   Map-based communities
│   ├── useLandmarkDetail.ts     #   Landmark data fetching
│   ├── useGacha.ts              #   Gacha reward system
│   └── ...                      #   And 20 more
├── backend/                      # Python FastAPI + Gemini AI
│   ├── main.py                  #   API endpoints
│   ├── tools/                   #   Gemini tool modules
│   │   ├── landmark_detection.py#     Vision AI detection
│   │   ├── landmark_enrich.py   #     Cultural enrichment
│   │   ├── trip_concierge.py    #     AI trip planning
│   │   ├── chat.py              #     Multi-turn chat agent
│   │   ├── google_maps.py       #     Maps integration
│   │   └── landmark_db.py       #     Supabase DB queries
│   └── Dockerfile               #   Container deployment
├── constants/                    # App constants & map themes
├── context/                      # Auth context provider
├── assets/                       # Images, fonts, Lottie animations
└── types/                        # TypeScript type definitions
```

---

## 🧠 AI Features (Powered by Google Gemini)

| Feature | Model | Description |
|---------|-------|-------------|
| **Landmark Detection** | Gemini 2.0 Flash (Vision) | Identify landmarks from camera photos with cultural context |
| **Cultural Enrichment** | Gemini 2.0 Flash | Generate rich cultural narratives, history, and fun facts |
| **Trip Concierge** | Gemini 2.0 Flash | Build personalized ASEAN travel itineraries from natural language |
| **Chat Agent** | Gemini 2.0 Flash | Multi-turn conversational AI with tool calling (search, maps, code) |
| **Cultural Tips** | Gemini 2.0 Flash | Generate contextual cultural etiquette tips for POIs |

---

## 📲 Download the App

<p align="center">
  <a href="https://echoframe.sites">
    <img src="https://img.shields.io/badge/📲_Download_Now-echoframe.sites-1a1a1a?style=for-the-badge&labelColor=4A90D9&logoColor=white" alt="Download" />
  </a>
</p>

Visit **[echoframe.sites](https://echoframe.sites)** to download the latest build for Android and iOS.

---

## 🏆 Hackathon Highlights

| Metric | Value |
|--------|-------|
| **Components** | 100+ custom React Native components |
| **Custom Hooks** | 26 feature-specific hooks |
| **Backend Tools** | 13 AI-powered tool modules |
| **Map Themes** | 5 custom Google Maps styles |
| **Lines of Code** | 30,000+ (TypeScript + Python) |
| **Platforms** | iOS + Android (native builds) |

### What Makes Culbi Unique

- 🤖 **Gemini AI at the core** — not a wrapper, but deep integration with Vision, Chat, and Agentic tool-calling
- 🗺️ **Map-first social** — discover and create communities pinned to real-world locations
- 🎮 **Gamified culture** — XP, missions, badges, gacha, and leaderboards make learning fun
- 🌏 **ASEAN-focused** — dedicated to bridging Southeast Asian cultural heritage
- 📸 **Point & Learn** — camera-based instant landmark identification with cultural stories

---

## 👥 Team (Your Answer)

Built with ❤️ for the BorNEO HackWknd.

---

## 📄 License

Private — All rights reserved, .

## ‼ Notes Important

If Google OAuth login fails, please use the standard email login. Sign up first, verify your account via the confirmation email, and then log in to the application.

Please note: The maps might not load correctly because the API costs have become quite expensive to maintain. Thank you for understanding! 😢❤️
