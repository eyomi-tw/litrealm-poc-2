# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LitRealms is an AI-powered interactive LitRPG story generation platform that transforms gameplay sessions into publishable narratives. The system uses Google Agent Development Kit (ADK) with a multi-agent architecture to create, manage, and compile interactive story experiences.

**Tech Stack:**
- **Backend**: Python 3.9+, FastAPI, Google ADK (v1.15.1), SQLite
- **Frontend**: Next.js 15.5.4, React 19, TypeScript, Tailwind CSS 4
- **AI**: Gemini 2.0 Flash (Google AI Studio)

## Development Setup

### Running Locally (3 Services)

```bash
# Terminal 1 - Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py  # Runs on port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev  # Runs on port 3000

# Terminal 3 - ADK Web UI (Optional debugging)
cd backend
source venv/bin/activate
adk web . --port 8002 --session_service_uri sqlite:///adk_sessions.db
```

### Environment Configuration

Backend requires `.env` file:
```
GOOGLE_API_KEY=your_key_here
GOOGLE_GENAI_USE_VERTEXAI=FALSE
PORT=8000
```

Frontend auto-detects backend at `http://localhost:8000` via `NEXT_PUBLIC_API_URL`.

## Architecture

### Multi-Agent System (Google ADK)

The application uses a **hierarchical agent architecture** where specialized agents handle different phases of the user journey:

**Root Agent (`root_agent`)**: Main orchestrator that routes users based on session state
- Located: `backend/assistant/agent.py`
- Routes to sub-agents based on `onboarding_complete` flag

**Onboarding Agent**: Guides new users through 4-step setup
- Located: `backend/assistant/onboarding_agent.py`
- Sets: `world_template`, `story_mode`, `character_class`, `tone`
- Updates `onboarding_complete = True` when finished

**Story Writer Agent**: Creates interactive LitRPG gameplay
- Located: `backend/assistant/story_writer_agent.py`
- Only active when `onboarding_complete = True`
- Parses and emits `CHARACTER_STATE` blocks for stat tracking

**Story Compiler Agent**: Transforms gameplay into publishable narratives
- Located: `backend/assistant/story_compiler_agent.py`
- Invoked separately via `/session/{id}/compile-story` endpoint

### Session State Management

**Critical Concept**: Google ADK automatically persists session state to SQLite (`adk_sessions.db`). Agents read/write state variables, and the system handles persistence.

**Session State Schema** (stored in `adk_sessions.db`):
```python
{
    # Onboarding data
    'onboarding_complete': bool,
    'world_template': str,
    'story_mode': str,
    'character_class': str,
    'tone': str,

    # Game state
    'level': int,
    'xp': int,
    'xp_to_next_level': int,
    'character_stats': {
        'hp': int, 'max_hp': int,
        'mana': int, 'max_mana': int,
        'strength': int, 'intelligence': int,
        'dexterity': int, 'constitution': int, 'charisma': int
    },
    'inventory': list[str],

    # Story compilation
    'story_draft': dict  # Saved compiled story
}
```

### Backend Response Parsing

The FastAPI backend parses agent responses for special blocks:

**`[ACTIONS]` Block** - Quick action buttons:
```python
# Regex: r'\[ACTIONS\](.*?)\[/ACTIONS\]'
# Parsed in: main.py:parse_actions()
```

**`CHARACTER_STATE` Block** - Game stats for display:
```python
# Regex: r'---\s*\*\*CHARACTER_STATE:\*\*\s*\n(.+?)\n---'
# Parsed in: main.py:parse_character_state()
# Updates session state for persistence
```

### Frontend Flow

**Three Main Pages:**

1. **Onboarding** (`/onboarding/step/[id]`)
   - 4-step wizard (1-7 steps total, 5-6 placeholder)
   - Saves draft to localStorage during editing
   - Submits complete config to `/submit-onboarding`
   - Receives `session_id` for gameplay

2. **Gameplay** (`/gameplay?session={id}`)
   - Loads history via `/session/{id}/history`
   - Real-time chat with `/chat` endpoint
   - Displays character stats from `state.character_stats`
   - Inline dice roller and quick actions
   - Export button → `/session/{id}/compile-story`

3. **Authoring** (`/authoring?session={id}`)
   - Edit compiled story (title, narrative, chapters)
   - AI enhancement via `/session/{id}/enhance-narrative`
   - Save drafts to `/session/{id}/save-story-draft`
   - Export to PDF (uses jspdf library)

### Key API Endpoints

```
POST /submit-onboarding        - Initialize game session with config
POST /chat                     - Send gameplay message
GET  /session/{id}/history     - Load chat history
GET  /session/{id}/compile-story    - Compile gameplay → story
POST /session/{id}/save-story-draft - Save edited story
POST /session/{id}/enhance-narrative - AI improve text
```

## Working with Agents

### Modifying Agent Behavior

Agent instructions are in `backend/assistant/*.py` files. The `instruction` field is a detailed prompt that defines agent behavior.

**When editing agents:**
1. Restart backend (`python main.py`) to reload agent definitions
2. Test in ADK Web UI (`http://localhost:8002`) to debug sessions
3. Check `adk_sessions.db` with SQLite browser to inspect state

**State variable naming convention:**
- Onboarding: `world_template`, `story_mode`, `character_class`, `tone`
- Game state: `level`, `xp`, `character_stats`, `inventory`
- Use snake_case to match Python backend

### Adding New Agents

1. Create `backend/assistant/my_agent.py`:
```python
from google.adk.agents import Agent

my_agent = Agent(
    name="my_agent",
    model="gemini-2.0-flash",
    description="Brief description for routing",
    instruction="Detailed instructions..."
)
```

2. Import in `backend/assistant/agent.py`:
```python
from .my_agent import my_agent
root_agent = Agent(
    ...
    sub_agents=[onboarding_agent, story_writer_agent, my_agent]
)
```

3. Update orchestrator logic in root_agent instructions

## Frontend Development

**Next.js Configuration:**
- Uses `--turbopack` for faster dev builds
- TypeScript strict mode enabled
- Tailwind CSS 4 (new architecture)

**Type definitions:**
- Game config: `frontend/src/lib/types/game.ts`
- API types: `frontend/src/lib/api.ts` (inline interfaces)
- Pydantic mirrors: `backend/models.py` (must stay in sync)

**Component Structure:**
```
src/
  app/                    # Next.js pages
    page.tsx              # Landing page
    gameplay/page.tsx     # Main gameplay UI
    authoring/page.tsx    # Story editor
    onboarding/step/[id]/ # Wizard
  components/
    shared/               # Header, Button, ProgressBar
    onboarding/           # StepOne-Four components
    layouts/              # OnboardingLayout
  lib/
    api.ts               # API client functions
    types/game.ts        # TypeScript types
```

## Database Schema

**ADK SQLite Schema** (auto-managed by Google ADK):
- `sessions`: Session metadata + state JSON blob
- `events`: Message history (user/assistant turns)

**Direct SQL Access** (used in `/session/{id}/history`):
```python
import sqlite3
conn = sqlite3.connect('adk_sessions.db')
cursor.execute("SELECT content, author, timestamp FROM events WHERE session_id=?", (session_id,))
```

## Common Patterns

### Parsing Agent Responses

```python
# Extract [ACTIONS] and CHARACTER_STATE from agent text
clean_text, quick_actions = parse_actions(response_text)
clean_text, state_updates = parse_character_state(clean_text)

# State updates are merged into session.state automatically
```

### Type Safety Between Frontend/Backend

When changing data structures:
1. Update `backend/models.py` (Pydantic)
2. Update `frontend/src/lib/types/game.ts` (TypeScript)
3. Update `frontend/src/lib/api.ts` response interfaces

**Naming convention difference:**
- Python: `character_class` (reserved word workaround)
- TypeScript: `class` with `Field(alias='class')` in Pydantic

### Session State Updates

Agents update state by referencing variables in their responses. The ADK Runner automatically persists changes. Manual updates via:

```python
await session_service.update_session(
    app_name='litrealms',
    user_id=user_id,
    session_id=session_id,
    state=updated_state_dict
)
```

## Testing & Debugging

**Backend logs:**
- FastAPI auto-prints errors with tracebacks
- Check console for `Error:` lines
- ADK events logged automatically

**Frontend debugging:**
- Browser console for API errors
- Network tab to inspect `/chat` responses
- localStorage for onboarding drafts

**Database inspection:**
```bash
sqlite3 backend/adk_sessions.db
sqlite> SELECT * FROM sessions WHERE app_name='litrealms';
sqlite> SELECT content FROM events WHERE session_id='...' ORDER BY timestamp;
```

## Deployment Notes

**CORS Configuration:**
- Backend allows `localhost:3000` and Railway frontend URL
- Update `main.py` CORSMiddleware for new domains

**Production Checklist:**
- Set `GOOGLE_API_KEY` in production environment
- Backend runs on port from `$PORT` env var (Railway compatible)
- Frontend builds with `npm run build --turbopack`

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI server, endpoints, response parsing |
| `backend/assistant/agent.py` | Root orchestrator agent |
| `backend/assistant/onboarding_agent.py` | 4-step onboarding flow |
| `backend/assistant/story_writer_agent.py` | Interactive gameplay agent |
| `backend/assistant/story_compiler_agent.py` | Gameplay → story compilation |
| `backend/models.py` | Pydantic models (mirror frontend types) |
| `frontend/src/lib/api.ts` | API client and types |
| `frontend/src/lib/types/game.ts` | Game configuration types |
| `frontend/src/app/gameplay/page.tsx` | Main gameplay UI |
| `frontend/src/app/authoring/page.tsx` | Story editor with PDF export |

## Agent Instruction Philosophy

Agents have **extensive, detailed instructions** (~200+ lines each). This is intentional - more context improves consistency. When editing:
- Be verbose with examples
- Define exact state variables to read/write
- Include format examples for special blocks
- Explain edge cases and fallback behavior
