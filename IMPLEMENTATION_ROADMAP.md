# LitRealms Multi-Chapter Book System - Implementation Roadmap

## Overview
This document outlines the step-by-step implementation of the multi-chapter book authoring system for LitRealms.

## Architecture Decisions

### 1. Chapter View: Tabbed Interface ✅
- Single page `/book/[bookId]/chapter/[chapterId]`
- Two tabs: Game (gameplay) and Authoring (refined content)
- Instant tab switching without page reload

### 2. Layout: Three-Column with Sidebars ✅
```
┌────────────────────────────────────────────────────────────┐
│  [Character Stats]  │    [Content Area]    │  [World State] │
│    (Left Sidebar)   │   (Game/Authoring)   │ (Right Sidebar)│
│                     │                      │                 │
│  - HP/Mana          │  [Game Tab]          │  - Location     │
│  - Stats            │  - Chat UI           │  - Time of Day  │
│  - Level/XP         │  - Quick Actions     │  - Weather      │
│  - Inventory        │                      │  - Active Quest │
│                     │  [Authoring Tab]     │  - NPCs Present │
│                     │  - Rich Text Editor  │                 │
│                     │  - AI Enhancement    │                 │
│                     │  - Word Count        │                 │
└────────────────────────────────────────────────────────────┘
```

### 3. Navigation: Hybrid (Sidebar + Top Nav) ✅
- Collapsible chapter list sidebar (can hide for focus mode)
- Top navigation with prev/next buttons and breadcrumb
- Both provide quick chapter jumping

### 4. Continuity: State Inheritance + Narrative Summary ✅
- New chapters inherit final state from previous chapter
- AI generates narrative summary for context injection
- Story Writer Agent receives both for seamless continuation

### 5. Chapter Completion: Modal Dialog ✅
- User marks chapter complete → modal appears
- Options: Create Next Chapter, Stay Here, Back to List
- Clear decision point prevents accidental actions

## Implementation Phases

### Phase 1: Backend Foundation (COMPLETED ✓)

**Files Created/Modified:**
- ✅ `backend/models.py` - Added Book, Chapter, GameMessage models
- ✅ `backend/database.py` - SQLite database with CRUD operations

**Models Added:**
```python
class Book:
    id, user_id, title, subtitle
    game_config: GameConfig
    chapters: List[Chapter]
    created_at, updated_at, total_word_count

class Chapter:
    id, book_id, number, title, status
    session_id, game_transcript, initial_state, final_state
    authored_content, word_count
    previous_chapter_id, next_chapter_id, narrative_summary
```

**Database Tables:**
- `books` - Book metadata and configuration
- `chapters` - Chapter data with gameplay and authoring content

---

### Phase 2: Backend API Endpoints (IN PROGRESS)

**Endpoints to Add in `backend/main.py`:**

```python
# Book Management
POST /books
    - Create new book
    - Input: CreateBookRequest (title, subtitle, game_config)
    - Returns: Book

GET /books/{book_id}
    - Get book with all chapters
    - Returns: Book

GET /users/{user_id}/books
    - List all books for a user
    - Returns: List[Book]

# Chapter Management
POST /books/{book_id}/chapters
    - Create new chapter
    - Input: CreateChapterRequest (title, previous_chapter_id)
    - Automatically creates ADK session
    - Inherits state from previous chapter
    - Returns: Chapter

GET /chapters/{chapter_id}
    - Get single chapter
    - Returns: Chapter

PATCH /chapters/{chapter_id}
    - Update chapter (title, status, authored_content)
    - Input: UpdateChapterRequest
    - Returns: Chapter

POST /chapters/{chapter_id}/complete
    - Mark chapter complete
    - Input: CompleteChapterRequest (create_next: bool)
    - Optionally creates next chapter
    - Generates narrative summary
    - Returns: Chapter (or Chapter + next Chapter if create_next=true)

# Chapter Gameplay
POST /chapters/{chapter_id}/chat
    - Send message in chapter gameplay (like current /chat)
    - Updates chapter's game_transcript
    - Updates final_state with latest stats
    - Returns: assistant response + updated state

GET /chapters/{chapter_id}/transcript
    - Get full game transcript
    - Returns: List[GameMessage]
```

**Integration with Existing Code:**
- Modify `/submit-onboarding` to create Book + Chapter 1
- Redirect from `/gameplay` to `/book/{id}/chapter/1`
- Keep `/compile-story` for backward compatibility

---

### Phase 3: Frontend Type Definitions

**Add to `frontend/src/lib/types/game.ts`:**

```typescript
export interface GameMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Chapter {
  id: string;
  book_id: string;
  number: number;
  title: string;
  status: 'draft' | 'in_progress' | 'complete' | 'published';

  // Gameplay
  session_id: string;
  game_transcript: GameMessage[];
  initial_state: Record<string, any>;
  final_state: Record<string, any>;

  // Authoring
  authored_content: string;
  last_edited: string;
  word_count: number;

  // Continuity
  previous_chapter_id?: string;
  next_chapter_id?: string;
  narrative_summary?: string;

  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  title: string;
  subtitle?: string;
  game_config: GameConfig;
  chapters: Chapter[];
  created_at: string;
  updated_at: string;
  total_word_count: number;
}
```

**Add to `frontend/src/lib/api.ts`:**

```typescript
// Book APIs
export async function createBook(title: string, subtitle: string | undefined, gameConfig: GameConfig): Promise<Book>
export async function getBook(bookId: string): Promise<Book>
export async function getUserBooks(userId: string): Promise<Book[]>

// Chapter APIs
export async function createChapter(bookId: string, title: string, previousChapterId?: string): Promise<Chapter>
export async function getChapter(chapterId: string): Promise<Chapter>
export async function updateChapter(chapterId: string, updates: UpdateChapterRequest): Promise<Chapter>
export async function completeChapter(chapterId: string, createNext: boolean): Promise<CompleteChapterResponse>

// Chapter Gameplay
export async function sendChapterMessage(chapterId: string, message: string): Promise<ChatResponse>
export async function getChapterTranscript(chapterId: string): Promise<GameMessage[]>
```

---

### Phase 4: Frontend Components

**Component Structure:**

```
frontend/src/
├── app/
│   └── book/
│       └── [bookId]/
│           └── chapter/
│               └── [chapterId]/
│                   ├── page.tsx              # Main chapter page
│                   └── layout.tsx            # Shared layout with nav
├── components/
│   └── chapter/
│       ├── ChapterLayout.tsx         # Three-column layout
│       ├── CharacterStatsSidebar.tsx # Left sidebar
│       ├── WorldStateSidebar.tsx     # Right sidebar
│       ├── ChapterNavigation.tsx     # Top nav + breadcrumb
│       ├── ChapterSidebar.tsx        # Collapsible chapter list
│       ├── GameTab.tsx               # Gameplay interface
│       ├── AuthoringTab.tsx          # Rich text editor
│       ├── CompletionModal.tsx       # Chapter completion dialog
│       └── TabBar.tsx                # Tab switcher
```

**ChapterLayout.tsx** (Three-column with sidebars):
```typescript
interface ChapterLayoutProps {
  chapter: Chapter;
  book: Book;
  activeTab: 'game' | 'authoring';
  children: React.ReactNode;
}

export default function ChapterLayout({ chapter, book, activeTab, children }) {
  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Character Stats */}
      <CharacterStatsSidebar state={chapter.final_state} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <ChapterNavigation chapter={chapter} book={book} />
        <TabBar active={activeTab} onSwitch={setActiveTab} />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>

      {/* Right Sidebar - World State */}
      <WorldStateSidebar state={chapter.final_state} />
    </div>
  );
}
```

---

### Phase 5: State Inheritance Logic

**Backend: Creating Next Chapter with Continuity**

```python
@app.post("/chapters/{chapter_id}/complete")
async def complete_chapter(chapter_id: str, request: CompleteChapterRequest):
    chapter = get_chapter(chapter_id)

    # Mark complete
    update_chapter(chapter_id, status='complete')

    # Generate narrative summary using AI
    summary = await generate_chapter_summary(chapter)
    update_chapter(chapter_id, narrative_summary=summary)

    # Create next chapter if requested
    if request.create_next:
        next_chapter = create_next_chapter(chapter)
        return {"current": chapter, "next": next_chapter}

    return {"current": chapter}

async def create_next_chapter(prev_chapter: Chapter):
    # Create new ADK session
    new_session_id = f"chapter_{uuid.uuid4()}"

    # Inherit state
    initial_state = prev_chapter.final_state.copy()

    # Create chapter
    next_chapter = create_chapter(
        book_id=prev_chapter.book_id,
        title=f"Chapter {prev_chapter.number + 1}",
        session_id=new_session_id,
        initial_state=initial_state,
        previous_chapter_id=prev_chapter.id
    )

    # Create ADK session with inherited state + narrative summary
    await session_service.create_session(
        app_name='litrealms',
        user_id='default',
        session_id=new_session_id,
        state=initial_state
    )

    # Inject narrative context as first message
    context_message = f"""
    STORY CONTEXT (from Chapter {prev_chapter.number}):

    {prev_chapter.narrative_summary}

    Character State:
    - Level: {initial_state.get('level', 1)}
    - HP: {initial_state.get('character_stats', {}).get('hp')}/{initial_state.get('character_stats', {}).get('max_hp')}
    - Current Quest: {initial_state.get('current_quest', 'Continue the adventure')}

    Continue the story from here.
    """

    # Add to session (implementation depends on ADK API)

    return next_chapter
```

---

### Phase 6: Chapter Summary Agent

**Create `backend/assistant/chapter_summary_agent.py`:**

```python
from google.adk.agents import Agent

chapter_summary_agent = Agent(
    name="chapter_summarizer",
    model="gemini-2.0-flash",
    description="Generates concise narrative summaries of gameplay chapters for continuity",
    instruction="""You are the LitRealms Chapter Summary Agent.

YOUR ROLE: Analyze a chapter's gameplay transcript and create a concise narrative summary (150-250 words) that captures:
1. Key events that occurred
2. Character development/changes
3. NPCs introduced or developed
4. Plot progression
5. Unresolved conflicts/cliffhangers

This summary will be injected into the next chapter's context to ensure story continuity.

FORMAT:
Return a single paragraph in past tense, written in the narrator's voice matching the story tone.

EXAMPLE INPUT:
[Transcript of Chapter 1 gameplay]

EXAMPLE OUTPUT:
"Aldric ventured into the Whispering Woods, seeking the Crystal of Aethermoor as prophesied by his mentor. Along the way, he encountered a mysterious ranger named Kaela who warned of bandits ahead. Despite her warnings, Aldric pressed forward and was ambushed. Using his Arcblade skills, he defeated the bandits but sustained injuries. Kaela reappeared to tend his wounds, and she reluctantly agreed to guide him to the Crystal's supposed location. As they made camp, Aldric noticed Kaela's pendant bore the same rune as the map he carried—a connection she refused to explain. The chapter ended with distant howls echoing through the forest, growing closer."

Now summarize the provided chapter transcript."""
)
```

---

### Phase 7: Migration Path

**Update Onboarding to Create Book:**

Modify `backend/main.py` `/submit-onboarding`:

```python
@app.post("/submit-onboarding")
async def submit_onboarding(config: GameConfig):
    user_id = "default"  # TODO: Get from auth

    # Create book
    book = create_book(
        user_id=user_id,
        title=f"{config.character.name}'s Adventure",
        game_config=config
    )

    # Create Chapter 1
    session_id = f"chapter_{uuid.uuid4()}"

    # Create ADK session
    await session_service.create_session(
        app_name='litrealms',
        user_id=user_id,
        session_id=session_id,
        state={
            'onboarding_complete': True,
            'world_template': config.world.template,
            'story_mode': config.mode,
            'character_class': config.character.character_class,
            'tone': config.tone,
            'level': 1,
            'xp': 0,
            'character_stats': config.character.stats.model_dump(),
            'inventory': []
        }
    )

    # Create first chapter
    chapter_1 = create_chapter(
        book_id=book.id,
        title="Chapter 1: The Journey Begins",
        session_id=session_id,
        initial_state=session_service.get_session(session_id).state
    )

    return {
        "book_id": book.id,
        "chapter_id": chapter_1.id,
        "session_id": session_id
    }
```

**Frontend: Redirect After Onboarding:**

```typescript
// In onboarding/step/[id]/page.tsx
const response = await submitOnboarding(completeConfig);
router.push(`/book/${response.book_id}/chapter/${response.chapter_id}`);
```

---

## Next Steps

1. ✅ **Phase 1 Complete**: Backend models and database
2. **Phase 2 (Current)**: Implement backend API endpoints
3. **Phase 3**: Add frontend TypeScript types
4. **Phase 4**: Build React components
5. **Phase 5**: Implement state inheritance
6. **Phase 6**: Create chapter summary agent
7. **Phase 7**: Update onboarding flow

## Testing Checklist

- [ ] Create book via API
- [ ] Create Chapter 1 via onboarding
- [ ] Play through Chapter 1 (gameplay tab)
- [ ] Switch to Authoring tab, edit content
- [ ] Mark Chapter 1 complete
- [ ] Create Chapter 2 via modal
- [ ] Verify Chapter 2 inherits state from Chapter 1
- [ ] Verify narrative summary injected
- [ ] Navigate between chapters using sidebar
- [ ] Use prev/next buttons in top nav
- [ ] Hide/show chapter sidebar
- [ ] View character stats updating in real-time
- [ ] View world state changes

## Files to Update/Create

### Backend
- ✅ `backend/models.py`
- ✅ `backend/database.py`
- [ ] `backend/main.py` (add endpoints)
- [ ] `backend/assistant/chapter_summary_agent.py`
- [ ] `.gitignore` (add `litrealms_books.db`)

### Frontend
- [ ] `frontend/src/lib/types/game.ts`
- [ ] `frontend/src/lib/api.ts`
- [ ] `frontend/src/app/book/[bookId]/chapter/[chapterId]/page.tsx`
- [ ] `frontend/src/app/book/[bookId]/chapter/[chapterId]/layout.tsx`
- [ ] `frontend/src/components/chapter/` (all components)

---

## Questions & Decisions

1. **Book Title**: Auto-generate from character name or ask user?
   - Decision: Auto-generate, allow edit later

2. **Chapter Titles**: Auto-generate or require user input?
   - Decision: Auto-generate "Chapter N: [AI-generated subtitle]", allow edit

3. **Sidebar Visibility**: Remember user preference?
   - Decision: Yes, store in localStorage

4. **Rich Text Editor**: Which library?
   - Options: TipTap, Quill, Lexical
   - Decision: TipTap (best React integration, extensible)

5. **World State Tracking**: What fields to display?
   - Location, Time of Day, Weather, Active Quest, NPCs Present
   - Source: Extract from chapter.final_state

6. **Multiple Books**: Allow users to create multiple books?
   - Decision: Yes, add "My Books" page later

---

## Performance Considerations

- Chapter list sidebar: Virtualize for books with 100+ chapters
- Game transcript: Paginate or infinite scroll for long transcripts
- Autosave: Debounce authored_content updates (save every 5 seconds)
- State updates: Use WebSocket for real-time character stat updates (future enhancement)
