
# Lishogi Bot Coach

An AI-powered Shogi coach that analyzes moves, provides personality-driven commentary, and speaks using Gemini TTS or a custom GPT-SoVITS model.

## Features
- **Personality-driven Coaching**: Choose from presets (Sensei, Buddy, Evil Bot, Anime Girl) or create your own custom coach.
- **Dynamic Text Generation**: Uses Gemini 3 Flash to generate context-aware commentary.
- **Dual TTS Engine**: Switch between Gemini's native high-quality TTS and your own local GPT-SoVITS model.
- **Real-time Engine Analysis**: Uses **YaneuraOu (Material9) WASM** for professional-grade Shogi evaluation.
- **Live Sync**: Connects to an active Lishogi.org game via Chrome Extension.

---

## 🚀 Setup Instructions

### 1. Prerequisites
- **Node.js**: Ensure Node.js is installed.
- **Gemini API Key**: Get a key from [Google AI Studio](https://aistudio.google.com/).

### 2. Installation
1. Download or clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### 3. Engine Files
Ensure the YaneuraOu WASM files are in `public/wasm/lib/`.
- `yaneuraou.material9.js`
- `yaneuraou.material9.wasm`
- `yaneuraou.material9.worker.js`

### 4. API Key Configuration
Create a `.env` file in the project root:
```env
VITE_API_KEY=AIzaSy...YourKeyHere
```

### 5. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🔗 Live Sync Setup (Lishogi.org)

To enable live sync, you must install the helper Chrome Extension included in this project.

1.  **Open Chrome Extensions**: Go to `chrome://extensions/`.
2.  **Enable Developer Mode**: Toggle the switch in the top-right corner.
3.  **Load Unpacked**: Click "Load unpacked" and select the `relay` folder inside this project directory.
4.  **Get Extension ID**: Copy the ID generated for the extension (e.g., `abcdefghijklmnop...`).
5.  **Configure App**:
    *   Open the Lishogi Bot Coach app at `http://localhost:3000`.
    *   Click the **Settings (Gear)** icon.
    *   Under **Extension Sync**, paste your Extension ID.
    *   Switch the mode dropdown in the top-right to **Live Sync**.
6.  **Start Playing**: Open a game on [lishogi.org](https://lishogi.org). The coach should now react to moves automatically!

