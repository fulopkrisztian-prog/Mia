# Mia AI Assistant - Teljes Technikai Dokumentáció

## Tartalomjegyzék

1. [Projekt Áttekintés](#projekt-áttekintés)
2. [Architektúra](#architektúra)
3. [Rust Backend Struktúra](#rust-backend-struktúra)
4. [Tauri Commands](#tauri-commands)
5. [React Frontend Struktúra](#react-frontend-struktúra)
6. [Frontend-Backend Kommunikáció](#frontend-backend-kommunikáció)
7. [Fájlstruktúra](#fájlstruktúra)
8. [Függőségek](#függőségek)
9. [Kulcs Funkciók](#kulcs-funkciók)

---

## Projekt Áttekintés

**Mia AI Assistant** egy Tauri-alapú asztali alkalmazás, amely egy lokális LLM-et (Large Language Model) használ chat-asszisztensként. Az alkalmazás egy Rust backend-et és egy React frontend-et kombinál, hogy egy modern, teljesítményes AI asszisztens élményt nyújtson.

### Főbb Jellemzők

- **Lokális AI Modell**: Llama CPP v2 használata Vulkan GPU gyorsítással
- **Több Mód**: Auto, Basic, Philosophy, Search módok
- **VRM Karakter**: 3D VRM modell megjelenítés Three.js-sel
- **Több Beszélgetés Kezelése**: Chat history kezelés JSON fájlokban
- **Fájl Feltöltés**: PDF, DOCX, TXT és egyéb fájlformátumok támogatása
- **Web Keresés**: DuckDuckGo integráció Search módban
- **Játék Detektálás**: Automatikus elrejtés amikor bizonyos játékok futnak
- **Két Ablak**: Fő dashboard ablak és floating ikon ablak

---

## Architektúra

### Általános Architektúra

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Dashboard   │  │ ChatWindow   │  │ FloatingIcon  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │         │
│         └──────────────────┼──────────────────┘         │
│                            │                            │
│                    @tauri-apps/api                      │
└────────────────────────────┼────────────────────────────┘
                             │
                    Tauri IPC Layer
                             │
┌────────────────────────────┼────────────────────────────┐
│                    Rust Backend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Commands   │  │    State     │  │   Plugins    │ │
│  │              │  │              │  │              │ │
│  │  - chat      │  │  - AppState  │  │  - dialog    │ │
│  │  - window    │  │  - MiaModel  │  │  - opener    │ │
│  │  - system    │  │  - Settings  │  │  - shortcut  │ │
│  │  - settings  │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                            │                            │
│                    llama-cpp-2                          │
│                    sysinfo                              │
│                    reqwest                              │
└─────────────────────────────────────────────────────────┘
```

### Adatfolyam

1. **Felhasználói Interakció** → React komponens
2. **Tauri Invoke** → `invoke('command_name', { params })`
3. **Rust Command Handler** → Feldolgozza a kérést
4. **State Módosítás** → AppState frissítése
5. **Válasz Visszaadása** → JSON válasz a frontend-nek
6. **UI Frissítés** → React state és komponens frissítés

---

## Rust Backend Struktúra

### Modul Struktúra

```
src-tauri/src/
├── main.rs          # Entry point (Windows subsystem)
├── lib.rs           # Fő inicializációs logika
├── state.rs         # State struktúrák és típusok
├── commands/
│   ├── mod.rs       # Modul exportok
│   ├── chat.rs      # Chat kapcsolatos commandok
│   ├── window.rs    # Ablak kezelési commandok
│   ├── system.rs    # Rendszer információ commandok
│   └── settings.rs  # Beállítások commandok
└── build.rs         # Build script
```

### State Management (`state.rs`)

#### AppState Struktúra

```rust
pub struct AppState {
    pub games_list: Arc<Mutex<Vec<String>>>,      // Figyelt játékok listája
    pub sys: Arc<Mutex<System>>,                 // Sysinfo rendszer objektum
    pub mia_brain: Arc<Mutex<Option<MiaModel>>>, // Betöltött LLM modell
    pub backend: Arc<LlamaBackend>,              // Llama backend instance
    pub history: Mutex<Vec<ChatMessage>>,        // Chat history (deprecated)
    pub chats: Mutex<HashMap<String, Vec<ChatMessage>>>, // Aktív beszélgetések
    pub active_chat_id: Mutex<String>,           // Aktív beszélgetés ID
    pub current_mode: Mutex<MiaMode>             // Aktuális mód (Auto/Basic/Philosophy/Search)
}
```

#### Adatstruktúrák

**MiaMode Enum:**
```rust
pub enum MiaMode {
    Auto,        // Automatikus mód választás
    Basic,       // Alapvető chat mód
    Philosophy,  // Filozófiai mód
    Search       // Web keresés mód
}
```

**ChatMessage Struct:**
```rust
pub struct ChatMessage {
    pub role: String,                    // "user" vagy "assistant"
    pub content: String,                  // Üzenet tartalma
    pub timestamp: u64,                   // Unix timestamp milliszekundumban
    pub sources: Option<Vec<WebSource>>   // Web források (Search módban)
}
```

**WebSource Struct:**
```rust
pub struct WebSource {
    pub title: String,  // Forrás címe
    pub url: String     // Forrás URL-je
}
```

**AppSettings Struct:**
```rust
pub struct AppSettings {
    pub games: Vec<String>,                    // Figyelt játékok
    pub searxng_url: String,                  // SearXNG URL (jelenleg nem használt)
    pub launch_on_startup: bool               // Indítás Windows indításakor
}
```

**MiaModel Struct:**
```rust
pub struct MiaModel {
    pub model: LlamaModel  // Llama CPP modell instance
}
```

### Fő Inicializáció (`lib.rs`)

A `lib.rs` fájl tartalmazza a Tauri alkalmazás fő inicializációs logikáját:

#### Főbb Komponensek:

1. **Backend Inicializálás:**
   ```rust
   let backend = LlamaBackend::init()?;
   ```
   - Vulkan backend inicializálása a GPU gyorsításhoz

2. **AppState Létrehozása:**
   ```rust
   .manage(AppState { ... })
   ```
   - Shared state létrehozása az alkalmazás élettartama alatt

3. **Plugin Regisztráció:**
   ```rust
   .plugin(tauri_plugin_global_shortcut::Builder::new().build())
   .plugin(tauri_plugin_opener::init())
   .plugin(tauri_plugin_dialog::init())
   ```

4. **Command Handler Regisztráció:**
   ```rust
   .invoke_handler(tauri::generate_handler![
       commands::chat::ask_mia,
       commands::chat::load_mia,
       // ... további commandok
   ])
   ```

5. **Window Event Handlers:**
   - Fő ablak bezárásakor VRAM felszabadítás
   - Chat history betöltése indításkor
   - Beállítások betöltése

6. **Background Thread:**
   - Játék detektálás 3 másodpercenként
   - Floating ablak automatikus elrejtés/megjelenítés

---

## Tauri Commands

### Chat Commands (`commands/chat.rs`)

#### `ask_mia`

**Leírás:** Fő chat command, amely feldolgozza a felhasználói üzenetet és generál választ.

**Paraméterek:**
- `message: String` - Felhasználói üzenet

**Visszatérési érték:**
```rust
pub struct MiaResponse {
    pub content: String,      // Generált válasz
    pub tokens: i32,         // Generált tokenek száma
    pub speed: f32,          // Tokenek másodpercenként
    pub sources: Vec<WebSource> // Web források (ha Search mód)
}
```

**Működés:**
1. Aktív chat ID lekérése
2. Mód ellenőrzése (ha Search, akkor web keresés)
3. System prompt generálása a mód alapján
4. Chat history hozzáadása a prompt-hoz
5. LLM inference futtatása
6. Válasz generálása token streameléssel
7. Válasz mentése a chat history-ba
8. JSON fájlba mentés

**Prompt Formátum:**
```
<|im_start|>system
{system_message}{search_context}<|im_end|>
<|im_start|>user
{user_message}<|im_end|>
<|im_start|>assistant
{assistant_response}<|im_end|>
```

#### `load_mia`

**Leírás:** Betölti a LLM modellt a memóriába.

**Paraméterek:** Nincs

**Működés:**
1. Ellenőrzi, hogy már betöltve van-e
2. Event küldése: `mia-loading-status: true`
3. Modell betöltése: `models/mia-brain-q4.gguf`
4. GPU rétegek: 25 réteg GPU-n
5. Event küldése: `mia-loading-status: false`

**Fájl elérési út:** `models/mia-brain-q4.gguf` (relatív az alkalmazás mappájához)

#### `unload_mia`

**Leírás:** Eltávolítja a modellt a memóriából, felszabadítva a VRAM-ot.

**Paraméterek:** Nincs

**Működés:**
- `mia_brain` beállítása `None`-ra
- Rust automatikus memóriakezelés felszabadítja a modellt

#### `create_new_chat`

**Leírás:** Új beszélgetés létrehozása.

**Visszatérési érték:** `String` - Új chat ID (UUID v4)

**Működés:**
1. Új UUID generálása
2. Üdvözlő üzenet hozzáadása
3. Aktív chat ID beállítása
4. Mentés JSON fájlba

#### `get_all_chats`

**Leírás:** Összes beszélgetés listázása.

**Visszatérési érték:**
```rust
pub struct ChatEntry {
    pub id: String,
    pub name: String,        // Első user üzenet (max 25 karakter)
    pub last_active: u64     // Utolsó aktivitás timestamp
}
```

**Működés:**
- Összes chat bejárása
- Chat név generálása az első user üzenetből
- Utolsó aktivitás szerint rendezés

#### `switch_chat`

**Leírás:** Aktív beszélgetés váltása.

**Paraméterek:**
- `chat_id: String` - Váltandó chat ID

**Működés:**
- Aktív chat ID frissítése
- Frontend majd lekéri a history-t

#### `get_chat_history`

**Leírás:** Egy beszélgetés teljes history-jának lekérése.

**Paraméterek:**
- `chat_id: String`

**Visszatérési érték:** `Vec<ChatMessage>`

#### `delete_chat`

**Leírás:** Beszélgetés törlése.

**Paraméterek:**
- `chat_id: String`

**Működés:**
- Chat eltávolítása a HashMap-ból
- Ha aktív chat volt, első elérhető chat-re váltás
- JSON fájl frissítése

#### `set_mia_mode`

**Leírás:** Mia módjának beállítása.

**Paraméterek:**
- `mode: MiaMode`

**Működés:**
- `current_mode` frissítése az AppState-ban

#### `upload_file`

**Leírás:** Fájl tartalmának kinyerése és formázása.

**Paraméterek:**
- `path: String` - Fájl elérési útja

**Visszatérési érték:** `String` - Formázott fájltartalom

**Támogatott formátumok:**
- **Szöveges:** `.txt`, `.md`, `.rs`, `.js`, `.py`, `.json`, `.html`, `.css`, `.cpp`, `.h`
- **PDF:** `.pdf` (pdf-extract crate)
- **Word:** `.docx` (dotext crate)

**Kimenet formátum:**
```
[DOKUMENTUM: filename.ext]
{file_content}
[DOKUMENTUM VÉGE]
```

### Window Commands (`commands/window.rs`)

#### `toggle_main_window`

**Leírás:** Fő ablak megjelenítése/elrejtése.

**Működés:**
- Ha látható → elrejtés + VRAM felszabadítás + floater megjelenítés
- Ha rejtett → modell betöltés + fő ablak megjelenítés + floater elrejtés

#### `hide_main_window`

**Leírás:** Fő ablak kényszerített elrejtése.

**Működés:**
- Fő ablak elrejtése
- VRAM felszabadítás
- Floater megjelenítése

#### `maximize_main_window`

**Leírás:** Fő ablak maximalizálása/visszaállítása.

**Működés:**
- Maximized állapot ellenőrzése
- Toggle maximalizálás

### System Commands (`commands/system.rs`)

#### `get_system_stats`

**Leírás:** Rendszer információ lekérése.

**Visszatérési érték:**
```json
{
  "cpu": {
    "percentage": 45.2,
    "cores": [12.3, 15.6, ...]
  },
  "memory": {
    "percentage": 62.5,
    "display": "8.2 / 16.0 GB"
  }
}
```

**Működés:**
- CPU használat frissítése
- Memória információ lekérése
- JSON válasz generálása

### Settings Commands (`commands/settings.rs`)

#### `get_settings`

**Leírás:** Beállítások lekérése.

**Visszatérési érték:** `AppSettings`

**Működés:**
- `app_config_dir/settings.json` olvasása
- Ha nem létezik, default értékek visszaadása

#### `save_settings`

**Leírás:** Beállítások mentése.

**Paraméterek:**
- `settings: AppSettings`

**Működés:**
- `games_list` frissítése az AppState-ban
- JSON fájlba mentés: `app_config_dir/settings.json`

---

## React Frontend Struktúra

### Komponens Hierarchia

```
App
├── Dashboard (main window)
│   ├── TitleBar (drag region)
│   ├── ChatWindow
│   │   ├── ChatSidebar (desktop)
│   │   │   ├── New Chat Button
│   │   │   ├── Chat List
│   │   │   └── Settings Button
│   │   ├── MessageArea
│   │   │   └── MessageItem[]
│   │   ├── ChatInput
│   │   │   ├── Mode Selector
│   │   │   ├── File Attachment
│   │   │   └── Input Field
│   │   └── VRMViewer (desktop sidebar)
│   └── SettingsPage
│       ├── Game Detection
│       ├── Search Integration
│       └── System Settings
└── FloatingIcon (floater window)
    └── Sparkles Icon
```

### Fő Komponensek

#### `App.tsx`

**Felelősség:** Routing és oldal renderelés.

**Működés:**
- `window.location.pathname` alapján routing
- `/` vagy `/main` vagy `/dashboard` → Dashboard
- `/floater` → FloatingIcon

**State:**
- `currentPath: string` - Aktuális útvonal

#### `Dashboard.tsx`

**Felelősség:** Fő ablak layout és navigáció.

**State:**
- `activeTab: 'chat' | 'monitor' | 'settings'`
- `isMaximized: boolean`

**Funkciók:**
- Ablak bezárás kezelés (`hide_main_window`)
- Maximize toggle (`maximize_main_window`)
- Tab navigáció

**UI Struktúra:**
- Title bar (drag region)
- Content area (ChatWindow vagy SettingsPage)
- Status bar

#### `ChatWindow.tsx`

**Felelősség:** Chat felület és üzenetkezelés.

**State:**
- `messages: Message[]` - Üzenetek listája
- `chats: ChatEntry[]` - Beszélgetések listája
- `activeChatId: string` - Aktív beszélgetés ID
- `inputText: string` - Input mező tartalma
- `isLoading: boolean` - Válasz generálás állapota
- `miaMode: MiaMode` - Aktuális mód
- `attachedFile: {name, content} | null` - Csatolt fájl
- `isSidebarOpen: boolean` - Mobile sidebar állapot
- `showSettings: boolean` - Beállítások megjelenítés
- `mood: 'idle' | 'thinking' | 'speaking' | 'scared'` - VRM hangulat

**Főbb Funkciók:**

1. **fetchChats:**
   ```typescript
   const allChats = await invoke('get_all_chats');
   ```

2. **handleNewChat:**
   ```typescript
   const newId = await invoke('create_new_chat');
   ```

3. **handleSwitchChat:**
   ```typescript
   await invoke('switch_chat', { chatId: id });
   const history = await invoke('get_chat_history', { chatId: id });
   ```

4. **handleSend:**
   ```typescript
   const response = await invoke('ask_mia', { message: fullPrompt });
   ```

5. **handleAttachFile:**
   ```typescript
   const selected = await open({ filters: [...] });
   const content = await invoke('upload_file', { path: selected });
   ```

**Mood Logic:**
- `thinking` - Válasz generálás közben
- `speaking` - Válasz megjelenítése után
- `scared` - Ha a válasz tartalmaz ijesztő kulcsszavakat
- `idle` - Alapállapot, véletlenszerű animációk

#### `ChatSidebar.tsx`

**Felelősség:** Beszélgetések listája és navigáció.

**Props:**
- `chats: ChatEntry[]`
- `activeChatId: string`
- `onNewChat: () => void`
- `onSwitchChat: (id: string) => void`
- `onDeleteChat: (e, id) => void`
- `onOpenSettings: () => void`

**UI:**
- Új beszélgetés gomb
- Beszélgetések listája (scrollable)
- Aktív beszélgetés kiemelése
- Törlés gomb hover-en
- Beállítások gomb

#### `ChatInput.tsx`

**Felelősség:** Üzenet bevitel és mód választás.

**Props:**
- `inputText: string`
- `setInputText: (val: string) => void`
- `isLoading: boolean`
- `miaMode: MiaMode`
- `onModeChange: (mode: MiaMode) => void`
- `attachedFile: {name, content} | null`
- `setAttachedFile: (file) => void`
- `onAttach: () => void`
- `onSend: () => void`

**Funkciók:**
- Mód választó gombok (Auto, Basic, Philosophy, Search)
- Fájl csatolás gomb
- Textarea automatikus magasság állítás
- Enter küldés (Shift+Enter új sor)

#### `MessageItem.tsx`

**Felelősség:** Egy üzenet megjelenítése.

**Props:**
- `message: Message`

**UI Funkciók:**
- Felhasználó/Mia megkülönböztetés
- Timestamp megjelenítés
- Markdown renderelés (Mia üzeneteknél)
- Web források gombok (ha Search mód)
- Token/speed információ (Mia üzeneteknél)

#### `VRMViewer.tsx`

**Felelősség:** 3D VRM karakter megjelenítése.

**Props:**
- `mood: 'idle' | 'thinking' | 'speaking' | 'scared'`

**Technológia:**
- **Three.js** - 3D renderelés
- **@react-three/fiber** - React Three.js integráció
- **@pixiv/three-vrm** - VRM formátum támogatás
- **@react-three/drei** - Segédeszközök

**VRM Modellek:**
- `/Mia_Neutral.vrm` - Alapértelmezett
- `/Mia_Scared.vrm` - Ijesztett állapot

**Animációk:**
- **Head tracking** - Egér pozíció alapján
- **Arm swing** - Szinusz alapú mozgás
- **Body float** - Finom fel-le mozgás
- **Expression changes** - Hangulat alapján
- **Mouth animation** - Beszéd szimuláció (typing közben)
- **Blink** - Véletlenszerű pislogás

**Speech Bubbles:**
- Hangulat alapján véletlenszerű szövegek
- Typing animáció
- Fade in/out effektek

#### `Settings.tsx`

**Felelősség:** Alkalmazás beállítások kezelése.

**State:**
- `settings: AppSettings & { monitorRefreshRate, chatHistoryLimit, theme }`
- `newGame: string`
- `isSaving: boolean`
- `isFullscreen: boolean`

**Funkciók:**
- Játék hozzáadása/eltávolítása
- SearXNG URL beállítása
- Launch on startup toggle
- Téma választás (fullscreen módban)
- Monitor refresh rate beállítása
- Chat history limit beállítása

**Mentés:**
```typescript
await invoke('save_settings', { settings });
```

#### `FloatingIcon.tsx`

**Felelősség:** Floating ablak ikon és interakció.

**State:**
- `isHovered: boolean`
- `isPressed: boolean`
- `isPulsing: boolean`
- `isLoading: boolean` (Zustand store-ból)

**Event Listeners:**
- `mia-loading-status` esemény figyelése
- Zustand store frissítése

**Interakció:**
- Kattintás → `toggle_main_window` meghívása
- Hover effektek
- Loading állapot megjelenítése

#### `MarkdownResponse.tsx`

**Felelősség:** Markdown tartalom renderelése.

**Technológia:**
- **react-markdown** - Markdown parsing
- **react-syntax-highlighter** - Kód szintaxis kiemelés
- **Prism** - Kód formázás

**Funkciók:**
- Inline code formázás
- Code block renderelés nyelvvel
- Copy to clipboard gomb
- Linkek automatikus megnyitása
- Listák formázása

### State Management

#### Zustand Store (`store/modelStore.ts`)

```typescript
interface ModelStore {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}
```

**Használat:**
- Model loading állapot globális kezelése
- FloatingIcon és más komponensek közötti kommunikáció

#### TypeScript Típusok (`types/chat.ts`)

```typescript
export type MiaMode = 'Auto' | 'Basic' | 'Philosophy' | 'Search';

export interface WebSource {
  title: string;
  url: string;
}

export interface MiaResponse {
  content: string;
  tokens: number;
  speed: number;
  sources: WebSource[];
}

export interface Message {
  id: string | number;
  content: string;
  sender: 'user' | 'mia';
  timestamp: Date;
  tokens?: number;
  speed?: number;
  sources?: WebSource[];
}

export interface ChatEntry {
  id: string;
  name: string;
  last_active: number;
}
```

---

## Frontend-Backend Kommunikáció

### Tauri IPC Mechanizmus

#### Command Hívások

**Frontend → Backend:**
```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('command_name', {
  param1: value1,
  param2: value2
});
```

**Példa:**
```typescript
const response: MiaResponse = await invoke('ask_mia', { 
  message: 'Hello Mia!' 
});
```

#### Event System

**Backend → Frontend:**

**Rust oldal:**
```rust
handle.emit("mia-loading-status", true)?;
```

**Frontend oldal:**
```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('mia-loading-status', (event) => {
  console.log('Loading:', event.payload);
  useModelStore.getState().setLoading(!!event.payload);
});
```

### Adat Serializáció

**Rust → TypeScript:**
- `serde` és `serde_json` használata
- Automatikus JSON serializáció
- TypeScript típusok egyeznek a Rust struktúrákkal

**Példa:**
```rust
#[derive(Serialize)]
pub struct MiaResponse {
    pub content: String,
    pub tokens: i32,
    pub speed: f32,
    pub sources: Vec<WebSource>,
}
```

```typescript
export interface MiaResponse {
  content: string;
  tokens: number;
  speed: number;
  sources: WebSource[];
}
```

### Fájl Kommunikáció

**Fájl kiválasztás:**
```typescript
import { open } from '@tauri-apps/plugin-dialog';

const selected = await open({
  multiple: false,
  filters: [{ 
    name: 'Dokumentumok', 
    extensions: ['pdf', 'docx', 'txt'] 
  }]
});
```

**Fájl feltöltés:**
```typescript
const content = await invoke('upload_file', { 
  path: selected 
});
```

### URL Megnyitás

```typescript
import { openUrl } from '@tauri-apps/plugin-opener';

await openUrl(source.url);
```

---

## Fájlstruktúra

### Teljes Projekt Struktúra

```
Mia/
├── src/                          # React Frontend
│   ├── App.tsx                   # Fő routing komponens
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Globális stílusok
│   ├── vite-env.d.ts             # Vite típus definíciók
│   ├── pages/
│   │   ├── Dashboard.tsx          # Fő dashboard
│   │   ├── ChatWindow.tsx         # Chat felület
│   │   ├── FloatingIcon.tsx       # Floating ablak
│   │   └── components/
│   │       ├── Chat/
│   │       │   ├── ChatSidebar.tsx
│   │       │   ├── ChatInput.tsx
│   │       │   └── MessageItem.tsx
│   │       └── UI/
│   │           ├── VRMViewer.tsx
│   │           ├── Settings.tsx
│   │           └── MarkdownResponse.tsx
│   ├── types/
│   │   └── chat.ts                # TypeScript típusok
│   ├── store/
│   │   └── modelStore.ts         # Zustand store
│   └── utils/
│       └── cn.ts                  # ClassName utility
├── src-tauri/                    # Rust Backend
│   ├── src/
│   │   ├── main.rs                # Entry point
│   │   ├── lib.rs                 # Fő inicializáció
│   │   ├── state.rs               # State struktúrák
│   │   ├── build.rs               # Build script
│   │   └── commands/
│   │       ├── mod.rs             # Modul exportok
│   │       ├── chat.rs            # Chat commandok
│   │       ├── window.rs           # Ablak commandok
│   │       ├── system.rs           # Rendszer commandok
│   │       └── settings.rs         # Beállítások commandok
│   ├── Cargo.toml                 # Rust függőségek
│   ├── tauri.conf.json            # Tauri konfiguráció
│   ├── capabilities/
│   │   └── default.json           # Tauri capabilities
│   └── icons/                     # Alkalmazás ikonok
├── public/                        # Statikus fájlok
│   ├── Mia_Neutral.vrm            # VRM modell
│   └── Mia_Scared.vrm              # VRM modell (ijesztett)
├── models/                        # LLM modellek
│   └── mia-brain-q4.gguf          # Llama modell fájl
├── package.json                   # Node.js függőségek
├── tsconfig.json                  # TypeScript konfiguráció
├── vite.config.ts                 # Vite konfiguráció
├── tailwind.config.js             # Tailwind CSS konfiguráció
└── .gitignore                     # Git ignore szabályok
```

### Adatfájlok (Runtime)

**Windows App Data:**
```
%APPDATA%/com.mia.app/
├── chats_history.json             # Chat history
└── settings.json                  # Beállítások
```

---

## Függőségek

### Rust Dependencies (`Cargo.toml`)

**Core:**
- `tauri = "2.9.3"` - Tauri framework
- `serde = "1"` - Serializáció
- `serde_json = "1"` - JSON kezelés

**AI/ML:**
- `llama-cpp-2 = "0.1"` (features: ["vulkan"]) - LLM inference
- `encoding_rs = "0.8"` - Karakterkódolás

**System:**
- `sysinfo = "0.38.1"` - Rendszer információk

**Network:**
- `reqwest = "0.13.2"` - HTTP kliens
- `scraper = "0.25.0"` - HTML parsing

**File Processing:**
- `pdf-extract = "0.10.0"` - PDF olvasás
- `dotext = "0.1.1"` - DOCX olvasás

**Utilities:**
- `rand = "0.10.0"` - Véletlenszám generálás
- `uuid = "1.21.0"` - UUID generálás

**Plugins:**
- `tauri-plugin-opener = "2.5.3"` - URL/fájl megnyitás
- `tauri-plugin-dialog = "2.6.0"` - Dialógus ablakok
- `tauri-plugin-global-shortcut = "2"` - Globális billentyűk

### Frontend Dependencies (`package.json`)

**Core:**
- `react = "^19.1.0"` - React framework
- `react-dom = "^19.1.0"` - React DOM
- `typescript = "~5.8.3"` - TypeScript

**Build Tools:**
- `vite = "^7.0.4"` - Build tool
- `@vitejs/plugin-react = "^4.6.0"` - React plugin

**Tauri:**
- `@tauri-apps/api = "^2"` - Tauri API
- `@tauri-apps/cli = "^2"` - Tauri CLI
- `@tauri-apps/plugin-dialog = "^2.6.0"` - Dialógus plugin
- `@tauri-apps/plugin-global-shortcut = "^2.3.1"` - Shortcut plugin
- `@tauri-apps/plugin-opener = "^2"` - Opener plugin

**3D Graphics:**
- `three = "^0.183.0"` - Three.js
- `@react-three/fiber = "^9.5.0"` - React Three.js
- `@react-three/drei = "^10.7.7"` - Three.js segédeszközök
- `@pixiv/three-vrm = "^3.4.5"` - VRM támogatás

**UI:**
- `tailwindcss = "^4.1.18"` - Tailwind CSS
- `@tailwindcss/postcss = "^4.1.18"` - PostCSS plugin
- `lucide-react = "^0.563.0"` - Ikonok
- `clsx = "^2.1.1"` - ClassName utility
- `tailwind-merge = "^3.4.0"` - Tailwind merge

**Content:**
- `react-markdown = "^10.1.0"` - Markdown renderelés
- `react-syntax-highlighter = "^16.1.0"` - Kód szintaxis kiemelés

**State:**
- `zustand = "^5.0.11"` - State management

---

## Kulcs Funkciók

### 1. LLM Inference Pipeline

**Folyamat:**
1. Modell betöltése (`load_mia`)
2. Prompt összeállítása (system + history + user message)
3. Tokenizálás (`str_to_token`)
4. Batch létrehozása és decode
5. Token generálás loop (max 512 token)
6. Detokenizálás és válasz összeállítása
7. Válasz mentése

**Sampling Paraméterek:**
- Temperature: Mód alapján (0.3-1.25)
- Top-k: 40
- Top-p: 0.95
- Random distribution

### 2. Mód Választás Logika

**Auto Mód:**
- Filozófiai kulcsszavak keresése
- Ha talál → Philosophy mód
- Különben → Basic mód

**Mód Specifikus Beállítások:**
- **Philosophy:** Temperature 1.25, mély gondolatok
- **Search:** Temperature 0.3, web kontextus használat
- **Basic:** Temperature 0.75, barátságos hangvétel

### 3. Web Keresés Integráció

**Folyamat:**
1. DuckDuckGo HTML keresés
2. HTML parsing (scraper crate)
3. Top 5 eredmény kinyerése
4. Kontextus formázás
5. Források listázása
6. Válaszban források megjelenítése

**Keresési URL:**
```
https://html.duckduckgo.com/html/?q={query}
```

### 4. Chat History Kezelés

**Tárolás:**
- JSON fájl: `app_data_dir/chats_history.json`
- Struktúra: `HashMap<String, Vec<ChatMessage>>`
- Kulcs: Chat ID (UUID)
- Érték: Üzenetek listája

**Betöltés:**
- Alkalmazás indításakor
- Első chat aktívvá tétele

**Mentés:**
- Új üzenet után
- Chat törlés után
- Chat váltás után

**History Limit:**
- Max 15 üzenet per chat (backend)
- Frontend korlátlan megjelenítés

### 5. Játék Detektálás

**Folyamat:**
1. Background thread 3 másodpercenként
2. Process lista frissítése
3. Játék név keresés (case-insensitive)
4. Ha fut → floater elrejtése
5. Ha nem fut → floater megjelenítése

**Konfiguráció:**
- Játékok listája: `settings.json`
- Alapértelmezett: `cs2.exe`, `valorant.exe`

### 6. VRAM Kezelés

**Optimalizáció:**
- Modell csak akkor betöltve, amikor szükséges
- Ablak bezárásakor automatikus felszabadítás
- Explicit `unload_mia` hívás lehetősége

**GPU Rétegek:**
- 25 réteg GPU-n (konfigurálható)
- Többi CPU-n fut

### 7. Fájl Feldolgozás

**Támogatott Formátumok:**

**Szöveges:**
- Közvetlen fájl olvasás
- UTF-8 kódolás

**PDF:**
- `pdf-extract` crate
- Szöveg kinyerése

**DOCX:**
- `dotext` crate
- Word dokumentum olvasás

**Kimenet:**
- Formázott szöveg
- Fájlnév és tartalom jelölés

### 8. UI/UX Funkciók

**Responsive Design:**
- Desktop: 3 oszlopos layout
- Mobile: Sidebar overlay

**Animációk:**
- Smooth transitions
- Loading states
- Hover effects
- VRM karakter animációk

**Dark Theme:**
- Slate színpaletta
- Gradient effektek
- Glassmorphism

**Accessibility:**
- Keyboard navigation
- Drag regions
- Focus management

---

## Konfiguráció

### Tauri Konfiguráció (`tauri.conf.json`)

**Ablakok:**
- **Main:** 900x700, transzparens, dekoráció nélkül
- **Floater:** 120x120, always on top, skip taskbar

**Build:**
- Dev URL: `http://localhost:1420`
- Frontend dist: `../dist`

**Security:**
- CSP: null (fejlesztéshez)

### Vite Konfiguráció

**Port:** 1420 (Tauri dev server)

**Plugins:**
- React plugin
- Tauri plugin

### Tailwind Konfiguráció

**Theme:**
- Dark slate színek
- Custom scrollbar
- Gradient utilities

---

## Fejlesztési Útmutató

### Futtatás Fejlesztési Módban

```bash
# Frontend függőségek telepítése
npm install

# Rust függőségek telepítése
cd src-tauri
cargo build

# Alkalmazás futtatása
npm run tauri dev
```

### Build Production Verzióhoz

```bash
npm run tauri build
```

### Modell Hozzáadása

1. Modell fájl elhelyezése: `models/mia-brain-q4.gguf`
2. `load_mia` command-ban elérési út módosítása

### Új Command Hozzáadása

1. **Rust oldal:**
   ```rust
   #[tauri::command]
   pub async fn my_command(param: String) -> Result<String, String> {
       Ok(format!("Hello {}", param))
   }
   ```

2. **Regisztráció `lib.rs`-ben:**
   ```rust
   .invoke_handler(tauri::generate_handler![
       // ... existing commands
       commands::my_module::my_command,
   ])
   ```

3. **Frontend hívás:**
   ```typescript
   const result = await invoke('my_command', { param: 'World' });
   ```

### Új Komponens Hozzáadása

1. Komponens létrehozása `src/pages/components/` mappában
2. Import és használat a szülő komponensben
3. TypeScript típusok definiálása

---

## Hibakeresés

### Gyakori Problémák

**1. Modell nem töltődik be:**
- Ellenőrizd a fájl elérési útját
- Vulkan driver telepítve van-e
- VRAM elég-e

**2. Chat history nem mentődik:**
- App data directory írható-e
- JSON formátum helyes-e

**3. VRM modell nem jelenik meg:**
- Fájlok a `public/` mappában vannak-e
- Three.js inicializálás sikerült-e

**4. Tauri command nem működik:**
- Command regisztrálva van-e
- Paraméterek típusa helyes-e
- Error handling megfelelő-e

### Logolás

**Rust:**
```rust
println!("Debug: {:?}", value);
eprintln!("Error: {}", error);
```

**TypeScript:**
```typescript
console.log('Debug:', value);
console.error('Error:', error);
```

---

## Biztonsági Megfontolások

### Jelenlegi Implementáció

- **CSP:** Null (fejlesztéshez)
- **File Access:** Dialog plugin használata
- **Network:** Csak DuckDuckGo (hardcoded)
- **Local Storage:** JSON fájlok app data directory-ban

### Javasolt Fejlesztések

- CSP policy beállítása production-ben
- Network request validáció
- File path sanitization
- Error message sanitization

---

## Teljesítmény Optimalizálás

### Jelenlegi Optimalizációk

1. **VRAM Kezelés:**
   - Modell csak szükség esetén betöltve
   - Ablak bezárásakor felszabadítás

2. **Chat History:**
   - Max 15 üzenet per chat
   - JSON fájl cache

3. **UI Rendering:**
   - React memo használata
   - Lazy loading lehetőségek

4. **GPU Használat:**
   - 25 réteg GPU-n
   - Batch processing

### További Optimalizálási Lehetőségek

- Model quantization (Q4 → Q3)
- Streaming responses
- Virtual scrolling (nagy chat history esetén)
- WebWorker használata nehéz számításokhoz

---

## Következő Lépések / Roadmap

### Lehetséges Fejlesztések

1. **Több Modell Támogatás:**
   - Modell választó UI
   - Dinamikus modell betöltés

2. **Advanced Search:**
   - SearXNG integráció
   - Több keresőmotor támogatás

3. **Export Funkciók:**
   - Chat exportálás (Markdown, PDF)
   - Beállítások export/import

4. **Többnyelvűség:**
   - i18n támogatás
   - UI fordítások

5. **Plugins:**
   - Bővíthető architektúra
   - Harmadik fél pluginok

---

## Összefoglalás

A **Mia AI Assistant** egy komplex, modern asztali alkalmazás, amely kombinálja a Rust backend teljesítményét a React frontend rugalmasságával. A Tauri framework lehetővé teszi a zökkenőmentes integrációt a két réteg között, miközben natív teljesítményt biztosít.

A projekt főbb erősségei:
- ✅ Lokális AI futtatás GPU gyorsítással
- ✅ Modern, reszponzív UI
- ✅ 3D karakter animációk
- ✅ Több beszélgetés kezelése
- ✅ Fájl feldolgozás támogatás
- ✅ Web keresés integráció
- ✅ Optimalizált memóriakezelés

Ez a dokumentáció átfogó áttekintést nyújt az alkalmazás működéséről, architektúrájáról és fejlesztési lehetőségeiről.
