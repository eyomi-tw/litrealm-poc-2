import os
import asyncio
import uuid
import re
import json
from datetime import datetime
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.adk.sessions import DatabaseSessionService
from google.adk.runners import Runner
from google.genai import types
from assistant.agent import root_agent, chat_agent
from assistant.story_compiler_agent import story_compiler_agent
from assistant.prologue_generator_agent import prologue_generator_agent
from assistant.content_validation_agent import content_validation_agent
from assistant.gameplay_simulator_agent import gameplay_simulator_agent
from models import (
    GameConfig, CompiledStoryResponse, CompiledStory, StoryMetadata, StoryChapter,
    PrologueGenerationRequest, PrologueGenerationResponse,
    ContentValidationRequest, ContentValidationResponse, ValidationCategory,
    Book, Chapter, GameMessage, CreateBookRequest, CreateChapterRequest,
    UpdateChapterRequest, CompleteChapterRequest, ChapterCompilationResponse
)
import database as db

load_dotenv()

def normalize_inventory(inventory):
    """
    Ensure inventory is a clean list of strings, unwrapping any nested JSON encoding.
    This handles cases where inventory might be double or triple JSON encoded.
    """
    if inventory is None:
        return []

    # Keep unwrapping until we have a proper list
    max_iterations = 5  # Prevent infinite loops
    for _ in range(max_iterations):
        if isinstance(inventory, list):
            # Check if the list contains a single JSON string that needs parsing
            if len(inventory) == 1 and isinstance(inventory[0], str):
                try:
                    parsed = json.loads(inventory[0])
                    if isinstance(parsed, list):
                        inventory = parsed
                        continue
                except (json.JSONDecodeError, TypeError):
                    pass
            # Clean up individual items - remove extra quotes and brackets
            cleaned = []
            for item in inventory:
                if isinstance(item, str):
                    # Strip leading/trailing brackets and quotes that shouldn't be there
                    item = item.strip()
                    while item.startswith('[') or item.startswith('"') or item.startswith("'"):
                        item = item[1:]
                    while item.endswith(']') or item.endswith('"') or item.endswith("'"):
                        item = item[:-1]
                    item = item.strip()
                    if item:  # Only add non-empty items
                        cleaned.append(item)
                else:
                    cleaned.append(str(item))
            return cleaned
        elif isinstance(inventory, str):
            # Try to parse as JSON
            try:
                inventory = json.loads(inventory)
            except (json.JSONDecodeError, TypeError):
                # If it's not valid JSON, treat it as a comma-separated list
                return [item.strip() for item in inventory.split(',') if item.strip()]
        else:
            return []

    return inventory if isinstance(inventory, list) else []

session_service = DatabaseSessionService(db_url="sqlite:///adk_sessions.db")
runner = Runner(
    app_name='litrealms',
    agent=root_agent,
    session_service=session_service
)

app = FastAPI(title="LitRealms Chat API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://192.168.2.197:3000",
        "https://litrealmspoc-frontend-production.up.railway.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

class QuickAction(BaseModel):
    label: str
    message: str

class ChatResponse(BaseModel):
    response: str
    session_id: str
    quick_actions: list[QuickAction] = []
    state: dict | None = None

def parse_actions(text: str) -> tuple[str, list[QuickAction]]:
    """Extract [ACTIONS] block"""
    pattern = r'\[ACTIONS\](.*?)\[/ACTIONS\]'
    match = re.search(pattern, text, re.DOTALL)
    
    if not match:
        return text, []
    
    clean_text = re.sub(pattern, '', text, flags=re.DOTALL).strip()
    actions_text = match.group(1).strip()
    action_lines = [
        line.strip('- ').strip() 
        for line in actions_text.split('\n') 
        if line.strip() and line.strip().startswith('-')
    ]
    
    return clean_text, [QuickAction(label=a, message=a) for a in action_lines]

def parse_character_state(text: str) -> tuple[str, dict]:
    """Parse CHARACTER_STATE block and return state updates"""
    pattern = r'---\s*\*\*CHARACTER_STATE:\*\*\s*\n(.+?)\n---'
    match = re.search(pattern, text, re.DOTALL)
    
    state_updates = {}
    
    if match:
        state_text = match.group(1).strip()
        
        # Parse: Level: 1 | XP: 20/100 | HP: 60/60 | Mana: 105/120
        level_match = re.search(r'Level:\s*(\d+)', state_text)
        xp_match = re.search(r'XP:\s*(\d+)/(\d+)', state_text)
        hp_match = re.search(r'HP:\s*(\d+)/(\d+)', state_text)
        mana_match = re.search(r'Mana:\s*(\d+)/(\d+)', state_text)
        inventory_match = re.search(r'Inventory:\s*(.+?)(?:\n|$)', state_text)
        stats_match = re.search(r'Stats:\s*STR\s*(\d+)\s*INT\s*(\d+)\s*DEX\s*(\d+)\s*CON\s*(\d+)\s*CHA\s*(\d+)', state_text)
        
        if level_match:
            state_updates['level'] = int(level_match.group(1))
        
        if xp_match:
            state_updates['xp'] = int(xp_match.group(1))
            state_updates['xp_to_next_level'] = int(xp_match.group(2))
        
        character_stats = {}
        if hp_match:
            character_stats['hp'] = int(hp_match.group(1))
            character_stats['max_hp'] = int(hp_match.group(2))
        
        if mana_match:
            character_stats['mana'] = int(mana_match.group(1))
            character_stats['max_mana'] = int(mana_match.group(2))
        
        if stats_match:
            character_stats['strength'] = int(stats_match.group(1))
            character_stats['intelligence'] = int(stats_match.group(2))
            character_stats['dexterity'] = int(stats_match.group(3))
            character_stats['constitution'] = int(stats_match.group(4))
            character_stats['charisma'] = int(stats_match.group(5))
        
        if character_stats:
            state_updates['character_stats'] = character_stats
        
        if inventory_match:
            items = [item.strip() for item in inventory_match.group(1).split(',') if item.strip()]
            state_updates['inventory'] = items
        
        # Remove CHARACTER_STATE block from display text
        text = re.sub(r'---\s*\*\*CHARACTER_STATE:\*\*.*?---', '', text, flags=re.DOTALL).strip()
    
    return text, state_updates

@app.get("/")
async def root():
    return {"message": "LitRealms API", "agent": root_agent.name}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/submit-onboarding")
async def submit_onboarding(config: GameConfig):
    """
    Create new Book and Chapter 1 with complete onboarding configuration.
    This is called when user clicks "Launch Adventure" after completing onboarding.
    Returns book_id and chapter_id for navigation to chapter page.
    """
    try:
        user_id = "user"

        # Create Book with custom title or auto-generated title
        if config.bookTitle and config.bookTitle.strip():
            book_title = config.bookTitle.strip()
        else:
            book_title = f"{config.character.name}'s Adventure"

        book = db.create_book(
            user_id=user_id,
            title=book_title,
            game_config=config
        )

        # Create ADK session for Chapter 1
        chapter_session_id = f"chapter_{uuid.uuid4()}"

        # Map GameConfig to session state format that agents expect
        session_state = {
            'onboarding_complete': True,

            # Basic game settings
            'mode': config.mode,
            'tone': config.tone,

            # World data
            'world_template': config.world.template,
            'world_name': config.world.name,
            'magic_system': config.world.magicSystem,
            'world_tone': config.world.worldTone,
            'factions': [faction.dict() for faction in config.world.factions],

            # Character data
            'character_class': config.character.character_class,
            'character_name': config.character.name,
            'character_role': config.character.role,
            'alignment': config.character.alignment,
            'background': config.character.background,
            'traits': config.character.traits,
            'companions': [c.dict() for c in config.character.companions],
            'rivals': [r.dict() for r in config.character.rivals],

            # Story data
            'quest_type': config.story.questType,
            'complexity': config.story.complexity,
            'scene_creation_method': config.story.sceneCreationMethod,
            'opening_scene': config.story.openingScene,
            'scene_location': config.story.sceneLocation,
            'time_of_day': config.story.timeOfDay,
            'mood': config.story.mood,
            'decision_points': [dp.dict() for dp in config.story.decisionPoints],
            'quest_paths': [qp.dict() for qp in config.story.questPaths],
            'prologue': config.story.prologue.generatedPrologue if config.story.prologue else None,

            # Game state (initialized)
            'level': 1,
            'xp': 0,
            'xp_to_next_level': 100,
            'character_stats': config.character.stats.dict(),
            'inventory': [],

            # Story state tracking
            'story_started': False,  # Flag to indicate if the first message has been sent
        }

        # Create ADK session for Chapter 1 gameplay
        await session_service.create_session(
            app_name='litrealms',
            user_id=user_id,
            session_id=chapter_session_id,
            state=session_state
        )

        # Send initial message to trigger DM's opening narration
        initial_message = types.Content(
            role='user',
            parts=[types.Part(text="I'm ready to begin my adventure!")]
        )

        opening_response_parts = []
        async for event in runner.run_async(
            user_id=user_id,
            session_id=chapter_session_id,
            new_message=initial_message
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        opening_response_parts.append(part.text)

        opening_response = ''.join(opening_response_parts)

        # Parse [ACTIONS] block from opening response to extract clean content
        # The actions will be parsed again by the frontend when loading the chapter
        clean_opening_response, _ = parse_actions(opening_response)

        # Create Chapter 1 with the opening exchange in the transcript
        chapter_1 = db.create_chapter(
            book_id=book.id,
            title="Chapter 1: The Journey Begins",
            session_id=chapter_session_id,
            initial_state=session_state
        )

        # Add the initial exchange to the chapter's game transcript
        # Store the FULL response (with [ACTIONS]) so frontend can parse it
        initial_transcript = [
            {
                'role': 'user',
                'content': "I'm ready to begin my adventure!",
                'timestamp': datetime.utcnow().isoformat()
            },
            {
                'role': 'assistant',
                'content': opening_response,  # Keep full response with [ACTIONS] block
                'timestamp': datetime.utcnow().isoformat()
            }
        ]
        db.update_chapter(
            chapter_id=chapter_1.id,
            game_transcript=json.dumps(initial_transcript),
            status='in_progress'
        )

        return {
            "book_id": book.id,
            "chapter_id": chapter_1.id,
            "session_id": chapter_session_id,
            "message": "Book and Chapter 1 created successfully!"
        }

    except Exception as e:
        import traceback
        print(f"Error in submit_onboarding: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.get("/books", response_model=List[Book])
async def list_books_endpoint():
    """
    List all books for the default user.
    In a production system, this would use authentication to get the user_id.
    """
    try:
        # For now, using a default user_id since there's no auth system
        user_id = "user"
        books = db.list_books_by_user(user_id)
        return books
    except Exception as e:
        print(f"Error listing books: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.get("/books/{book_id}", response_model=Book)
async def get_book_endpoint(book_id: str):
    """
    Get a book by ID with all its chapters.
    Returns book metadata, game config, and list of all chapters.
    """
    try:
        book = db.get_book(book_id)

        if not book:
            raise HTTPException(status_code=404, detail=f"Book {book_id} not found")

        return book
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving book {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.delete("/books/{book_id}")
async def delete_book_endpoint(book_id: str):
    """
    Delete a book and all its associated chapters.
    This operation cannot be undone.
    """
    try:
        # First check if book exists
        book = db.get_book(book_id)
        if not book:
            raise HTTPException(status_code=404, detail=f"Book {book_id} not found")

        # Delete the book and all its chapters
        success = db.delete_book(book_id)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete book")

        return {"message": f"Book {book_id} and all its chapters deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting book {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.patch("/books/{book_id}", response_model=Book)
async def update_book_endpoint(book_id: str, request: Request):
    """
    Update book metadata (title, subtitle, character name).
    Only provided fields will be updated.
    """
    try:
        # First check if book exists
        book = db.get_book(book_id)
        if not book:
            raise HTTPException(status_code=404, detail=f"Book {book_id} not found")

        # Parse request body
        body = await request.json()

        title = body.get('title')
        subtitle = body.get('subtitle')
        character_name = body.get('character_name')

        # If character_name is provided, update it in the game_config
        game_config = None
        if character_name is not None:
            game_config = book.game_config
            game_config.character.name = character_name

        # Update the book
        updated_book = db.update_book(
            book_id=book_id,
            title=title,
            subtitle=subtitle,
            game_config=game_config
        )

        if not updated_book:
            raise HTTPException(status_code=500, detail="Failed to update book")

        return updated_book
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating book {book_id}: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.get("/chapters/{chapter_id}")
async def get_chapter_endpoint(chapter_id: str):
    """
    Get a single chapter by ID.
    Returns chapter data including game transcript, state, and authored content.
    Parses [ACTIONS] blocks from assistant messages and includes them in response.
    """
    try:
        chapter = db.get_chapter(chapter_id)

        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter {chapter_id} not found")

        # Parse [ACTIONS] blocks from game transcript messages
        # and create enriched transcript with clean content and extracted actions
        enriched_transcript = []
        for msg in chapter.game_transcript:
            msg_dict = msg if isinstance(msg, dict) else {'role': msg.role, 'content': msg.content}

            if msg_dict['role'] == 'assistant':
                # Parse actions from assistant messages
                clean_content, actions = parse_actions(msg_dict['content'])
                enriched_transcript.append({
                    **msg_dict,
                    'content': clean_content,
                    'quick_actions': [action.dict() for action in actions] if actions else []
                })
            else:
                enriched_transcript.append(msg_dict)

        # Return chapter with enriched transcript
        chapter_dict = chapter.model_dump() if hasattr(chapter, 'model_dump') else chapter
        chapter_dict['game_transcript'] = enriched_transcript

        return chapter_dict
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving chapter {chapter_id}: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.post("/chapters/{chapter_id}/compile", response_model=ChapterCompilationResponse)
async def compile_chapter(chapter_id: str):
    """
    Compile a chapter's gameplay transcript into polished authored content.
    Uses the Story Compiler Agent with creative enrichments (reflections, doubts, dialogue).
    Returns the compiled narrative text ready to be saved as authored_content.
    """
    try:
        # Get chapter with game transcript
        chapter = db.get_chapter(chapter_id)
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter {chapter_id} not found")

        # Get book to access game_config (for tone, mode, etc.)
        book = db.get_book(chapter.book_id)
        if not book:
            raise HTTPException(status_code=404, detail=f"Book {chapter.book_id} not found")

        # Format chapter data for the Story Compiler Agent
        chapter_data = {
            "session_history": [
                {
                    "role": msg.role if hasattr(msg, 'role') else msg['role'],
                    "content": msg.content if hasattr(msg, 'content') else msg['content']
                }
                for msg in chapter.game_transcript
            ],
            "initial_state": chapter.initial_state,
            "final_state": chapter.final_state,
            "story_mode": book.game_config.mode,
            "narrator_tone": book.game_config.tone,
            "world_name": book.game_config.world.name,
            "character_name": book.game_config.character.name,
            "character_class": book.game_config.character.character_class,
            "chapter_number": chapter.number,
            "chapter_title": chapter.title
        }

        # Create prompt for Story Compiler Agent
        compilation_prompt = f"""Compile this chapter's gameplay into polished LitRPG prose.

CHAPTER INFO:
- Book Title: {book.title}
- Chapter: {chapter.number} - {chapter.title}
- Story Mode: {book.game_config.mode}
- Narrator Tone: {book.game_config.tone}
- World: {book.game_config.world.name}
- Character: {book.game_config.character.name} (Class: {book.game_config.character.character_class})

GAMEPLAY DATA:
{json.dumps(chapter_data, indent=2)}

INSTRUCTIONS:
Transform the raw gameplay into a beautiful, publishable narrative following your instructions.
- Add creative enrichments: internal reflections, doubts, dialogue, sensory details
- Match the {book.game_config.tone} tone
- Stay true to the {book.game_config.mode} story mode
- Return ONLY the narrative text (not JSON) - the compiled prose ready for the authored_content field.
- Do NOT include chapter headers or formatting - just the story prose."""

        # Create temporary session for compilation
        compile_session_id = f"compile_chapter_{chapter_id}"
        user_id = "user"

        # Check if compile session already exists
        existing_compile_session = await session_service.get_session(
            app_name='litrealms_compiler',
            user_id=user_id,
            session_id=compile_session_id
        )

        # Only create the compile session if it doesn't exist
        if not existing_compile_session:
            await session_service.create_session(
                app_name='litrealms_compiler',
                user_id=user_id,
                session_id=compile_session_id,
                state={}
            )

        # Run Story Compiler Agent
        compiler_runner = Runner(
            app_name='litrealms_compiler',
            agent=story_compiler_agent,
            session_service=session_service
        )

        message = types.Content(
            role='user',
            parts=[types.Part(text=compilation_prompt)]
        )

        response_parts = []
        async for event in compiler_runner.run_async(
            user_id=user_id,
            session_id=compile_session_id,
            new_message=message
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_parts.append(part.text)

        raw_response = ''.join(response_parts).strip()

        # Try to parse as JSON and extract narrative field
        # The story compiler agent returns JSON despite instructions to return plain text
        try:
            compiled_data = json.loads(raw_response)
            narrative = compiled_data.get('narrative', raw_response)
        except json.JSONDecodeError:
            # If not JSON, use the raw response as narrative
            narrative = raw_response

        # Calculate word count
        word_count = len(narrative.split())

        return ChapterCompilationResponse(
            narrative=narrative,
            chapter_id=chapter_id,
            word_count=word_count,
            compiled_at=datetime.utcnow().isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error compiling chapter: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

def generate_chapter_summary(chapter_transcript: list) -> str:
    """
    Generate a brief summary of what happened in a chapter for continuity.
    Uses the last few messages to create a 2-3 sentence summary.
    """
    try:
        # Get the last 3-4 assistant messages (narrative beats)
        # Handle both Pydantic GameMessage objects and dicts
        assistant_messages = []
        for msg in chapter_transcript:
            # Handle both Pydantic objects and dicts
            if hasattr(msg, 'role'):  # Pydantic object
                if msg.role == 'assistant':
                    assistant_messages.append(msg)
            elif isinstance(msg, dict):  # Dictionary
                if msg.get('role') == 'assistant':
                    assistant_messages.append(msg)

        recent_messages = assistant_messages[-3:] if len(assistant_messages) >= 3 else assistant_messages

        if not recent_messages:
            return "The adventure continues..."

        # Create a simple summary from the last narrative beats
        # Extract just the narrative portion (remove stat blocks and action blocks)
        narrative_parts = []
        for msg in recent_messages:
            # Get content from either Pydantic object or dict
            if hasattr(msg, 'content'):  # Pydantic object
                content = msg.content
            else:  # Dictionary
                content = msg.get('content', '')

            # Remove [ACTIONS] blocks
            content = re.sub(r'\[ACTIONS\].*?\[/ACTIONS\]', '', content, flags=re.DOTALL)
            # Remove CHARACTER_STATE blocks
            content = re.sub(r'---\s*\*\*CHARACTER_STATE:\*\*.*?---', '', content, flags=re.DOTALL)
            # Remove status displays
            content = re.sub(r'═+.*?═+', '', content, flags=re.DOTALL)
            # Clean up extra whitespace
            content = ' '.join(content.split())
            if content.strip():
                narrative_parts.append(content.strip()[:200])  # Limit to 200 chars per beat

        summary = ' '.join(narrative_parts[-2:]) if narrative_parts else "The adventure continues..."
        return summary[:500]  # Limit total summary to 500 chars
    except Exception as e:
        print(f"Error generating chapter summary: {e}")
        import traceback
        traceback.print_exc()
        return "The adventure continues..."

@app.post("/chapters/{chapter_id}/compile-dm-narrative", response_model=ChapterCompilationResponse)
async def compile_chapter_dm_narrative(chapter_id: str):
    """
    Compile a chapter using ONLY DM (assistant) messages from the gameplay transcript.
    Only includes stat progression when there are ACTUAL changes (level-ups, new skills, stat increases).

    This creates a cleaner narrative focused on the DM's story without player actions,
    and filters out redundant stat blocks.
    """
    try:
        # Get chapter with game transcript
        chapter = db.get_chapter(chapter_id)
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter {chapter_id} not found")

        # Get book to access game_config
        book = db.get_book(chapter.book_id)
        if not book:
            raise HTTPException(status_code=404, detail=f"Book {chapter.book_id} not found")

        # Extract ONLY assistant (DM) messages
        dm_messages = []
        for msg in chapter.game_transcript:
            role = msg.role if hasattr(msg, 'role') else msg.get('role')
            if role == 'assistant':
                dm_messages.append({
                    "role": role,
                    "content": msg.content if hasattr(msg, 'content') else msg.get('content')
                })

        # Parse CHARACTER_STATE blocks to detect actual stat changes
        stat_changes = []
        previous_stats = None

        for msg in dm_messages:
            # Look for CHARACTER_STATE blocks
            state_match = re.search(
                r'---\s*\*\*CHARACTER_STATE:\*\*\s*\n(.+?)\n---',
                msg['content'],
                re.DOTALL
            )

            if state_match:
                state_text = state_match.group(1)

                # Parse stats from the state text
                current_stats = {}
                level_match = re.search(r'Level:\s*(\d+)', state_text)
                xp_match = re.search(r'XP:\s*(\d+)/(\d+)', state_text)
                hp_match = re.search(r'HP:\s*(\d+)/(\d+)', state_text)
                mana_match = re.search(r'Mana:\s*(\d+)/(\d+)', state_text)
                stats_match = re.search(r'Stats:\s*STR\s*(\d+)\s*INT\s*(\d+)\s*DEX\s*(\d+)\s*CON\s*(\d+)\s*CHA\s*(\d+)', state_text)

                if level_match:
                    current_stats['level'] = int(level_match.group(1))
                if xp_match:
                    current_stats['xp'] = int(xp_match.group(1))
                    current_stats['xp_to_next_level'] = int(xp_match.group(2))
                if hp_match:
                    current_stats['hp'] = int(hp_match.group(1))
                    current_stats['max_hp'] = int(hp_match.group(2))
                if mana_match:
                    current_stats['mana'] = int(mana_match.group(1))
                    current_stats['max_mana'] = int(mana_match.group(2))
                if stats_match:
                    current_stats['str'] = int(stats_match.group(1))
                    current_stats['int'] = int(stats_match.group(2))
                    current_stats['dex'] = int(stats_match.group(3))
                    current_stats['con'] = int(stats_match.group(4))
                    current_stats['cha'] = int(stats_match.group(5))

                # Detect actual changes
                if previous_stats:
                    changes = {}

                    # Level up detection
                    if current_stats.get('level', 0) > previous_stats.get('level', 0):
                        changes['level_up'] = True
                        changes['old_level'] = previous_stats.get('level')
                        changes['new_level'] = current_stats.get('level')

                    # Stat increases
                    for stat in ['str', 'int', 'dex', 'con', 'cha']:
                        if current_stats.get(stat, 0) > previous_stats.get(stat, 0):
                            if 'stat_increases' not in changes:
                                changes['stat_increases'] = {}
                            changes['stat_increases'][stat] = {
                                'old': previous_stats.get(stat),
                                'new': current_stats.get(stat)
                            }

                    # Max HP/Mana increases
                    if current_stats.get('max_hp', 0) > previous_stats.get('max_hp', 0):
                        changes['max_hp_increase'] = {
                            'old': previous_stats.get('max_hp'),
                            'new': current_stats.get('max_hp')
                        }

                    if current_stats.get('max_mana', 0) > previous_stats.get('max_mana', 0):
                        changes['max_mana_increase'] = {
                            'old': previous_stats.get('max_mana'),
                            'new': current_stats.get('max_mana')
                        }

                    if changes:
                        stat_changes.append({
                            'message_index': len(stat_changes),
                            'changes': changes,
                            'full_state': current_stats
                        })

                previous_stats = current_stats

        # Format chapter data with DM messages only
        chapter_data = {
            "session_history": dm_messages,
            "initial_state": chapter.initial_state,
            "final_state": chapter.final_state,
            "story_mode": book.game_config.mode,
            "narrator_tone": book.game_config.tone,
            "world_name": book.game_config.world.name,
            "character_name": book.game_config.character.name,
            "character_class": book.game_config.character.character_class,
            "chapter_number": chapter.number,
            "chapter_title": chapter.title,
            "stat_changes": stat_changes  # Only include actual changes
        }

        # Create prompt for Story Compiler Agent
        compilation_prompt = f"""Compile this chapter's gameplay into polished LitRPG prose using ONLY DM narration.

CHAPTER INFO:
- Book Title: {book.title}
- Chapter: {chapter.number} - {chapter.title}
- Story Mode: {book.game_config.mode}
- Narrator Tone: {book.game_config.tone}
- World: {book.game_config.world.name}
- Character: {book.game_config.character.name} (Class: {book.game_config.character.character_class})

GAMEPLAY DATA:
{json.dumps(chapter_data, indent=2)}

SPECIAL INSTRUCTIONS FOR THIS COMPILATION:
1. **Use ONLY the DM (assistant) messages** - Player actions have been removed
2. **Preserve ALL Game Mechanics** - This is LitRPG fiction, so keep ALL game elements:
   - **Dice Rolls**: Keep all dice roll requests and results (d20 rolls, damage rolls, skill checks)
   - **Combat Mechanics**: Preserve attack rolls, damage calculations, AC checks, saving throws
   - **Skill Checks**: Keep lockpicking attempts, persuasion checks, perception rolls, stealth rolls with DCs
   - **XP Gains**: Show experience point awards (e.g., "+15 XP (85/100)")
   - **Item Acquisitions**: Track loot, treasure, and new equipment gained
   - **HP/Mana Changes**: Show damage taken, healing received, mana spent
   - **Status Effects**: Include buffs, debuffs, conditions applied
3. **Stat Progression Filtering**: The stat_changes array contains ONLY moments where stats actually changed (level-ups, stat increases, max HP/Mana increases)
   - Display formatted stat blocks ONLY at these significant moments (level-ups, stat increases)
   - Use elegant LitRPG formatting for stat displays (see Story Compiler Agent instructions for templates)
   - Do NOT show redundant stat blocks where nothing changed
   - If stat_changes is empty or a message has no associated change, skip the stat block (but keep other game mechanics!)
4. **Game Mechanics Formatting**: Format game mechanics elegantly using LitRPG style:
   - Use inline notation: "▸ +15 XP (85/100)"
   - Use inline notation: "▸ Damage dealt: 8 HP"
   - Use inline notation: "▸ Acquired: Iron Sword"
   - Level-ups should use the formatted template with borders and stat increases
   - Combat should blend narrative action with formatted results
5. **Narrative Flow**: Since player actions are removed, bridge the narrative smoothly between DM messages
   - Where dice rolls occur, integrate them naturally (e.g., "Rolling for attack... the blade connects with a satisfying impact")
   - Where player choices are implied, narrate the character's decision and action
6. **Creative Enrichments**: Add internal reflections, doubts, dialogue, and sensory details
7. **Tone Matching**: Match the {book.game_config.tone} tone
8. **Story Mode**: Stay true to the {book.game_config.mode} story mode
9. **Format**: Return ONLY the narrative text (not JSON) - clean prose ready for authored_content
10. **No Headers**: Do NOT include chapter headers or extra formatting - just the story prose with inline game mechanics

Transform this DM-only transcript into beautiful, flowing LitRPG narrative that preserves all game mechanics (dice rolls, XP, items, damage) while showing stat blocks ONLY when they meaningfully change."""

        # Create temporary session for compilation
        compile_session_id = f"compile_dm_{chapter_id}"
        user_id = "user"

        # Check if compile session already exists
        existing_compile_session = await session_service.get_session(
            app_name='litrealms_compiler',
            user_id=user_id,
            session_id=compile_session_id
        )

        # Only create the compile session if it doesn't exist
        if not existing_compile_session:
            await session_service.create_session(
                app_name='litrealms_compiler',
                user_id=user_id,
                session_id=compile_session_id,
                state={}
            )

        # Run Story Compiler Agent
        compiler_runner = Runner(
            app_name='litrealms_compiler',
            agent=story_compiler_agent,
            session_service=session_service
        )

        message = types.Content(
            role='user',
            parts=[types.Part(text=compilation_prompt)]
        )

        response_parts = []
        async for event in compiler_runner.run_async(
            user_id=user_id,
            session_id=compile_session_id,
            new_message=message
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_parts.append(part.text)

        raw_response = ''.join(response_parts).strip()

        # Try to parse as JSON and extract narrative field
        try:
            compiled_data = json.loads(raw_response)
            narrative = compiled_data.get('narrative', raw_response)
        except json.JSONDecodeError:
            # If not JSON, use the raw response as narrative
            narrative = raw_response

        # Calculate word count
        word_count = len(narrative.split())

        return ChapterCompilationResponse(
            narrative=narrative,
            chapter_id=chapter_id,
            word_count=word_count,
            compiled_at=datetime.utcnow().isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error compiling chapter DM narrative: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.post("/chapters/{chapter_id}/simulate-gameplay")
async def simulate_gameplay(chapter_id: str):
    """
    Generate a simulated gameplay session (25-30 turns) with realistic player/DM interactions.
    The simulation continues from the current chapter state and adds messages to the game transcript.
    """
    try:
        # Get chapter and book
        chapter = db.get_chapter(chapter_id)
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter {chapter_id} not found")

        book = db.get_book(chapter.book_id)
        if not book:
            raise HTTPException(status_code=404, detail=f"Book {chapter.book_id} not found")

        # Get ADK session to read current game state
        user_id = "user"
        session = await session_service.get_session(
            app_name='litrealms',
            user_id=user_id,
            session_id=chapter.session_id
        )

        if not session:
            raise HTTPException(status_code=404, detail=f"Game session {chapter.session_id} not found")

        # Build context for the simulator
        game_state = session.state

        # Get previous chapter summary from session state (set when previous chapter was completed)
        previous_chapter_summary = game_state.get('previous_chapter_summary', '')

        # Normalize inventory to ensure clean format
        normalized_inventory = normalize_inventory(game_state.get('inventory', []))

        # Create simulation prompt
        simulation_prompt = f"""Generate a simulated gameplay session based on this game state:

**CHARACTER INFO:**
- Name: {game_state.get('character_name', 'Unknown')}
- Class: {game_state.get('character_class', 'Unknown')}
- Level: {game_state.get('level', 1)}
- XP: {game_state.get('xp', 0)}/{game_state.get('xp_to_next_level', 100)}
- Stats: {json.dumps(game_state.get('character_stats', {}))}
- Inventory: {', '.join(normalized_inventory) if normalized_inventory else 'Empty'}

**WORLD INFO:**
- World: {game_state.get('world_name', 'Unknown')}
- Template: {game_state.get('world_template', 'Unknown')}
- Tone: {game_state.get('world_tone', 'Unknown')}

**STORY INFO:**
- Mode: {game_state.get('mode', 'Progression')}
- Narrator Tone: {game_state.get('tone', 'Heroic')}
- Quest Type: {game_state.get('quest_type', 'Discovery')}
- Chapter Number: {chapter.number}
{'- Previous Chapter: ' + previous_chapter_summary if previous_chapter_summary else '- First Chapter'}

Generate a complete, engaging gameplay session with 25-30 player/DM exchange turns."""

        # Create temporary session for simulation
        sim_session_id = f"sim_{chapter_id}_{uuid.uuid4()}"

        await session_service.create_session(
            app_name='litrealms_simulator',
            user_id=user_id,
            session_id=sim_session_id,
            state={}
        )

        # Run Gameplay Simulator Agent
        simulator_runner = Runner(
            app_name='litrealms_simulator',
            agent=gameplay_simulator_agent,
            session_service=session_service
        )

        message = types.Content(
            role='user',
            parts=[types.Part(text=simulation_prompt)]
        )

        response_parts = []
        async for event in simulator_runner.run_async(user_id=user_id, session_id=sim_session_id, new_message=message):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_parts.append(part.text)

        simulation_text = ''.join(response_parts)

        # Post-process to replace any placeholder text the model might have outputted
        character_name = game_state.get('character_name', 'Hero')
        world_name = game_state.get('world_name', 'the realm')
        # Replace various placeholder patterns
        placeholder_replacements = [
            (r'\[character_name\]', character_name),
            (r'\[Character_Name\]', character_name),
            (r'\[CHARACTER_NAME\]', character_name),
            (r'\[world_name\]', world_name),
            (r'\[World_Name\]', world_name),
            (r'\[WORLD_NAME\]', world_name),
            (r'character_name\]', character_name),  # Partial placeholder
            (r'\[character_name', character_name),  # Partial placeholder
        ]
        for pattern, replacement in placeholder_replacements:
            simulation_text = re.sub(pattern, replacement, simulation_text, flags=re.IGNORECASE)

        # Parse the simulation to extract individual turns
        # Expected format: Turn N: **PLAYER:** ... **DM:** ... ---CHARACTER_STATE:---
        turns = []
        turn_pattern = r'Turn \d+:\s*\*\*PLAYER:\*\*\s*(.+?)\s*\*\*DM:\*\*\s*(.+?)(?=Turn \d+:|SESSION SUMMARY:|$)'

        for match in re.finditer(turn_pattern, simulation_text, re.DOTALL):
            player_message = match.group(1).strip()
            dm_response = match.group(2).strip()

            # Clean up DM response to extract CHARACTER_STATE if present
            state_pattern = r'---\s*\*\*CHARACTER_STATE:\*\*.*?---'
            state_match = re.search(state_pattern, dm_response, re.DOTALL)

            if state_match:
                state_block = state_match.group(0)
                dm_response_clean = re.sub(state_pattern, '', dm_response, flags=re.DOTALL).strip()

                # Parse CHARACTER_STATE
                _, state_updates = parse_character_state(state_block)

                # Add player turn
                turns.append({
                    'role': 'user',
                    'content': player_message
                })

                # Add DM turn with state
                turns.append({
                    'role': 'assistant',
                    'content': dm_response_clean,
                    'state': state_updates if state_updates else None
                })
            else:
                # No state change in this turn
                turns.append({
                    'role': 'user',
                    'content': player_message
                })
                turns.append({
                    'role': 'assistant',
                    'content': dm_response.strip()
                })

        if not turns:
            raise HTTPException(status_code=500, detail="Failed to parse simulated gameplay")

        # Add all simulated turns to the chapter's game transcript
        # Track cumulative state changes
        accumulated_state = session.state.copy()

        # Convert existing transcript to dicts if they're GameMessage objects
        transcript_as_dicts = []
        for msg in chapter.game_transcript:
            if hasattr(msg, 'model_dump'):
                transcript_as_dicts.append(msg.model_dump())
            elif hasattr(msg, 'dict'):
                transcript_as_dicts.append(msg.dict())
            else:
                transcript_as_dicts.append(msg)

        for turn in turns:
            message_dict = {
                'role': turn['role'],
                'content': turn['content'],
                'timestamp': datetime.utcnow().isoformat()
            }
            transcript_as_dicts.append(message_dict)

            # Accumulate game state changes
            if 'state' in turn and turn['state']:
                state_updates = turn['state']
                # Normalize inventory if present to prevent nested JSON encoding
                if 'inventory' in state_updates:
                    state_updates['inventory'] = normalize_inventory(state_updates['inventory'])
                # Deep merge character_stats instead of replacing
                if 'character_stats' in state_updates and 'character_stats' in accumulated_state:
                    accumulated_state['character_stats'].update(state_updates['character_stats'])
                    del state_updates['character_stats']  # Don't overwrite with partial dict
                accumulated_state.update(state_updates)

        # Normalize inventory one more time before saving to ensure clean state
        if 'inventory' in accumulated_state:
            accumulated_state['inventory'] = normalize_inventory(accumulated_state['inventory'])

        # Update chapter's final_state with all accumulated changes
        chapter.final_state = accumulated_state

        # Save updated chapter with new transcript and final state
        db.update_chapter_transcript(chapter_id, transcript_as_dicts)
        db.update_chapter_state(chapter_id, chapter.final_state)

        return {
            "success": True,
            "message": f"Generated {len(turns)} simulated messages",
            "turns_added": len(turns),
            "final_state": accumulated_state
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error simulating gameplay: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.post("/chapters/{chapter_id}/complete")
async def complete_chapter(chapter_id: str, request: CompleteChapterRequest):
    """
    Mark a chapter as complete and optionally create the next chapter.

    - Marks the current chapter status as 'complete'
    - Generates a narrative summary for continuity
    - If create_next=True, creates a new chapter with:
      - Incremented chapter number
      - Character stats from current chapter's final_state
      - Previous chapter summary for story continuity
      - Links previous/next chapter IDs
    """
    try:
        # Get the current chapter
        chapter = db.get_chapter(chapter_id)
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter {chapter_id} not found")

        # Get the book
        book = db.get_book(chapter.book_id)
        if not book:
            raise HTTPException(status_code=404, detail=f"Book {chapter.book_id} not found")

        # Generate a summary of what happened in this chapter
        chapter_summary = generate_chapter_summary(chapter.game_transcript)
        print(f"Generated chapter summary: {chapter_summary}")

        # Update the chapter with the summary and mark as complete
        updated_chapter = db.update_chapter(
            chapter_id,
            status='complete',
            narrative_summary=chapter_summary
        )

        # Optionally create next chapter
        next_chapter = None
        if request.create_next:
            # Create new chapter with incremented number
            next_chapter_number = chapter.number + 1
            next_chapter_title = f"Chapter {next_chapter_number}"

            # Copy character stats from current chapter's final state
            initial_state = chapter.final_state.copy() if chapter.final_state else chapter.initial_state.copy()

            # DEBUG: Log what we're copying
            print(f"DEBUG: Copying state from chapter {chapter.number} to chapter {next_chapter_number}")
            print(f"  - chapter.final_state exists: {chapter.final_state is not None}")
            print(f"  - Using final_state: {chapter.final_state is not None and bool(chapter.final_state)}")
            print(f"  - level in initial_state: {initial_state.get('level')}")
            print(f"  - xp in initial_state: {initial_state.get('xp')}")
            print(f"  - character_stats in initial_state: {initial_state.get('character_stats')}")
            print(f"  - inventory in initial_state: {initial_state.get('inventory')}")

            # Create a new ADK session for the next chapter
            # First, clean up initial_state to remove chapter-1-specific fields
            # that would confuse the story_writer_agent
            cleaned_state = initial_state.copy()
            # Remove prologue/opening scene - these are for chapter 1 only
            # The agent should use previous_chapter_summary for continuations
            fields_to_remove = ['opening_scene', 'prologue', 'story_started']
            for field in fields_to_remove:
                cleaned_state.pop(field, None)

            # Normalize inventory to prevent nested JSON encoding issues
            if 'inventory' in cleaned_state:
                cleaned_state['inventory'] = normalize_inventory(cleaned_state['inventory'])

            new_session_state = {
                # Copy game configuration from book
                'onboarding_complete': True,
                'world_template': book.game_config.world.template,
                'world_name': book.game_config.world.name,
                'story_mode': book.game_config.mode,
                'character_class': book.game_config.character.character_class,
                'character_name': book.game_config.character.name,
                'tone': book.game_config.tone,
                # Use cleaned stats from previous chapter's final state
                **cleaned_state,
                # CRITICAL: Add previous chapter summary for story continuity
                'previous_chapter_summary': chapter_summary,
                'chapter_number': next_chapter_number,
                # Explicitly mark that this is NOT a fresh start
                'story_started': True
            }

            print(f"DEBUG: Creating new session for chapter {next_chapter_number}:")
            print(f"  - chapter_number: {next_chapter_number}")
            print(f"  - previous_chapter_summary: {chapter_summary[:100]}...")
            print(f"  - character_name: {new_session_state.get('character_name')}")
            print(f"  - world_name: {new_session_state.get('world_name')}")
            print(f"  - story_started: {new_session_state.get('story_started')}")
            print(f"  - prologue: {new_session_state.get('prologue', 'NOT SET (correct for chapter 2+)')}")
            print(f"  - opening_scene: {new_session_state.get('opening_scene', 'NOT SET (correct for chapter 2+)')}")

            new_session = await session_service.create_session(
                app_name='litrealms',
                user_id=book.user_id,
                state=new_session_state
            )

            print(f"DEBUG: New session created with ID: {new_session.id}")
            print(f"DEBUG: Session state after creation: {new_session.state}")

            # Create new chapter
            next_chapter = db.create_chapter(
                book_id=chapter.book_id,
                title=next_chapter_title,
                session_id=new_session.id,
                initial_state=initial_state,
                previous_chapter_id=chapter_id
            )

        return {
            "message": "Chapter marked as complete",
            "chapter": updated_chapter,
            "next_chapter": next_chapter,
            "next_chapter_created": request.create_next
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error completing chapter: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.post("/chapters/{chapter_id}/generate-title")
async def generate_chapter_title(chapter_id: str):
    """
    Generate an AI-suggested title for a chapter based on its content.
    Uses the game transcript and/or authored content to create a fitting title.
    """
    try:
        chapter = db.get_chapter(chapter_id)
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter {chapter_id} not found")

        # Build context from chapter content
        content_context = ""

        # Use authored content if available
        if chapter.authored_content and chapter.authored_content.strip():
            content_context = chapter.authored_content[:2000]  # Limit to first 2000 chars
        # Fall back to game transcript
        elif chapter.game_transcript:
            # Extract key narrative moments from transcript
            narrative_parts = []
            for msg in chapter.game_transcript:
                if msg.role == 'assistant':
                    # Clean content for title generation
                    content = msg.content
                    # Remove CHARACTER_STATE blocks
                    content = re.sub(r'---\s*\*\*CHARACTER_STATE:\*\*.*?---', '', content, flags=re.DOTALL)
                    # Remove action blocks
                    content = re.sub(r'\[ACTIONS\].*?\[/ACTIONS\]', '', content, flags=re.DOTALL)
                    if content.strip():
                        narrative_parts.append(content.strip()[:300])
            content_context = ' '.join(narrative_parts[:5])  # Use first 5 DM messages

        if not content_context:
            raise HTTPException(status_code=400, detail="Chapter has no content to generate a title from")

        # Create a simple prompt for title generation
        title_prompt = f"""Based on the following chapter content, generate a compelling and evocative chapter title.
The title should be:
- Short (2-6 words)
- Capture the main theme, action, or mood of the chapter
- Be intriguing and fit a fantasy/LitRPG style
- NOT include "Chapter" or chapter numbers

Content:
{content_context}

Respond with ONLY the title, nothing else."""

        # Use Gemini directly for simple title generation
        from google import genai
        import os

        client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=title_prompt
        )

        generated_title = response.text.strip().strip('"').strip("'")

        # Limit title length
        if len(generated_title) > 100:
            generated_title = generated_title[:100]

        return {
            "success": True,
            "generated_title": generated_title
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error generating chapter title: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.patch("/chapters/{chapter_id}", response_model=Chapter)
async def update_chapter_content(
    chapter_id: str,
    request: UpdateChapterRequest
):
    """
    Update chapter authored content, title, or status.
    Used when saving edited chapter content from the Authoring tab.
    """
    try:
        chapter = db.get_chapter(chapter_id)
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter {chapter_id} not found")

        # Build updates dict with only provided fields
        updates = {}

        if request.authored_content is not None:
            updates['authored_content'] = request.authored_content
            # Recalculate word count
            updates['word_count'] = len(request.authored_content.split())
            updates['last_edited'] = datetime.utcnow().isoformat()

        if request.title is not None:
            updates['title'] = request.title

        if request.status is not None:
            updates['status'] = request.status

        # Update chapter in database
        updated_chapter = db.update_chapter(chapter_id, **updates)

        if not updated_chapter:
            raise HTTPException(status_code=500, detail="Failed to update chapter")

        # Update book's total word count if chapter word count changed
        if 'word_count' in updates:
            db.update_book_total_word_count(chapter.book_id)

        return updated_chapter

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error updating chapter: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.delete("/chapters/{chapter_id}")
async def delete_chapter_endpoint(chapter_id: str):
    """
    Delete a chapter and update chapter links.
    When deleting a middle chapter, links the previous and next chapters together.
    """
    try:
        # Check if chapter exists
        chapter = db.get_chapter(chapter_id)
        if not chapter:
            raise HTTPException(status_code=404, detail=f"Chapter {chapter_id} not found")

        # Store book_id before deleting
        book_id = chapter.book_id

        # Delete the chapter
        success = db.delete_chapter(chapter_id)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete chapter")

        # Update book's total word count after chapter deletion
        db.update_book_total_word_count(book_id)

        return {"message": f"Chapter {chapter_id} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error deleting chapter: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        user_id = "user"
        message = types.Content(role='user', parts=[types.Part(text=request.message)])
        session_id = request.session_id or str(uuid.uuid4())
        
        # Get or create session with initialized state
        session = await session_service.get_session(app_name='litrealms', user_id=user_id, session_id=session_id)

        if not session:
            session = await session_service.create_session(
                app_name='litrealms',
                user_id=user_id,
                session_id=session_id,
                state={
                    'current_step': 1,
                    'onboarding_complete': False,
                    'world_template': '',
                    'story_mode': '',
                    'character_class': '',
                    'tone': '',
                    'level': 1,
                    'xp': 0,
                    'xp_to_next_level': 100,
                    'character_stats': {},
                    'inventory': [],
                }
            )

        # DEBUG: Log session state before running agent
        print(f"\nDEBUG CHAT ENDPOINT - Session {session_id}:")
        print(f"  - chapter_number: {session.state.get('chapter_number')}")
        print(f"  - previous_chapter_summary: {session.state.get('previous_chapter_summary', 'NOT SET')[:100] if session.state.get('previous_chapter_summary') else 'NOT SET'}")
        print(f"  - character_name: {session.state.get('character_name')}")
        print(f"  - onboarding_complete: {session.state.get('onboarding_complete')}")
        print(f"  - story_started: {session.state.get('story_started')}")

        message = types.Content(role='user', parts=[types.Part(text=request.message)])

        # Run agent - ADK handles all state persistence automatically!
        # The agent will use get_prologue tool to fetch prologue on first message
        response_parts = []
        async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=message):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_parts.append(part.text)

        response_text = ''.join(response_parts)
        
        # Parse CHARACTER_STATE for display purposes only
        clean_text, character_state = parse_character_state(response_text)
        
        # Parse actions
        clean_text, quick_actions = parse_actions(clean_text)
        
        # Get final state (ADK has already persisted everything)
        final_session = await session_service.get_session(app_name='litrealms', user_id=user_id, session_id=session_id)

        # Merge character state into the session state for frontend display
        if final_session and character_state:
            display_state = {**final_session.state, **character_state}
        else:
            display_state = final_session.state if final_session else {}

        # Update chapter's final_state in database if this is a chapter session
        chapter = db.get_chapter_by_session_id(session_id)
        if chapter:
            # Append new messages to game transcript
            new_messages = [
                {
                    'role': 'user',
                    'content': request.message,
                    'timestamp': datetime.utcnow().isoformat()
                },
                {
                    'role': 'assistant',
                    'content': response_text,
                    'timestamp': datetime.utcnow().isoformat()
                }
            ]

            # Convert existing GameMessage objects to dicts
            existing_transcript = [
                msg.model_dump() if hasattr(msg, 'model_dump') else msg
                for msg in chapter.game_transcript
            ]
            updated_transcript = existing_transcript + new_messages

            # Update chapter with new state and transcript
            db.update_chapter(
                chapter.id,
                final_state=json.dumps(display_state),
                game_transcript=json.dumps(updated_transcript)
            )

        return ChatResponse(
            response=clean_text,
            session_id=session_id,
            quick_actions=quick_actions,
            state=display_state
        )
        
    except Exception as e:
        import traceback
        print(f"Error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.post("/session/{session_id}/save-story-draft")
async def save_story_draft(session_id: str, request: dict):
    """
    Save an edited story draft to the session state.
    This allows users to edit the compiled story before publishing.
    """
    try:
        user_id = "user"

        session = await session_service.get_session(
            app_name='litrealms',
            user_id=user_id,
            session_id=session_id
        )

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Store the draft in session state
        compiled_story = request.get('compiled_story')
        if not compiled_story:
            raise HTTPException(status_code=400, detail="No compiled_story in request")

        # Update session state with the draft
        session.state['story_draft'] = compiled_story
        session.state['draft_saved_at'] = datetime.utcnow().isoformat()

        # State auto-persists in ADK 1.15.1 when session.state is modified

        return {
            "message": "Draft saved successfully",
            "session_id": session_id
        }

    except Exception as e:
        import traceback
        print(f"Error saving draft: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.get("/session/{session_id}/history")
async def get_session_history(session_id: str):
    """
    Get the full chat history for a session.
    Returns messages in chronological order (oldest first).
    """
    try:
        user_id = "user"

        # Get session to verify it exists
        session = await session_service.get_session(
            app_name='litrealms',
            user_id=user_id,
            session_id=session_id
        )

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get conversation history from events table
        import sqlite3
        conn = sqlite3.connect('adk_sessions.db')
        cursor = conn.cursor()
        cursor.execute("""
            SELECT content, author, timestamp FROM events
            WHERE app_name=? AND user_id=? AND session_id=?
            ORDER BY timestamp ASC
        """, ('litrealms', user_id, session_id))

        history_rows = cursor.fetchall()
        conn.close()

        # Parse and format history
        def extract_text_from_content(content_str, author):
            """Extract text from Gemini API format stored in events table"""
            try:
                # Parse JSON content
                content = json.loads(content_str) if isinstance(content_str, str) else content_str

                # Skip if no parts
                if not isinstance(content, dict) or 'parts' not in content:
                    return None

                # Extract text from parts
                text_parts = []
                for part in content.get('parts', []):
                    if isinstance(part, dict):
                        # Get text part
                        if 'text' in part:
                            text_parts.append(part['text'])
                        # Skip function_call and function_response parts

                # Join all text parts
                if text_parts:
                    return ' '.join(text_parts).strip()

                return None

            except (json.JSONDecodeError, TypeError, KeyError):
                # If it's already plain text, return it
                return content_str if content_str else None

        # Format history, filtering out function calls and empty messages
        messages = []
        for row in history_rows:
            content_str = row[0]
            author = row[1]
            timestamp = row[2]

            if not content_str:
                continue

            # Extract clean text content
            text = extract_text_from_content(content_str, author)

            # Only include messages with actual text content
            if text:
                messages.append({
                    "role": "user" if author == "user" else "assistant",
                    "content": text,
                    "timestamp": timestamp
                })

        return {
            "session_id": session_id,
            "messages": messages,
            "state": session.state
        }

    except Exception as e:
        import traceback
        print(f"Error getting session history: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.post("/generate-prologue", response_model=PrologueGenerationResponse)
async def generate_prologue(request: PrologueGenerationRequest):
    """
    Generate an opening prologue based on onboarding choices and quest template.
    Uses the Prologue Generator Agent to create immersive opening narrative.
    Stateless - accepts all context as request parameters.
    """
    try:
        user_id = "user"

        # Build context data from request parameters
        context_data = {
            "mode": request.mode or 'progression',
            "tone": request.tone or 'heroic',
            "world_template": request.world_template or 'Unknown',
            "world_name": request.world_name or 'The Realm',
            "magic_system": request.magic_system or 'on',
            "world_tone": request.world_tone or 'heroic',
            "character_name": request.character_name or 'Adventurer',
            "character_class": request.character_class or 'warrior',
            "background": request.background or 'unknown',
            "alignment": request.alignment or 'neutral_good',
            "character_role": request.character_role or 'hero',
            "quest_template": request.quest_template
        }

        # Build prompt for prologue generator
        generation_prompt = f"""Generate a prologue with the following context:

STORY MODE: {context_data['mode']}
NARRATOR TONE: {context_data['tone']}

WORLD:
- Template: {context_data['world_template']}
- Name: {context_data['world_name']}
- Magic System: {context_data['magic_system']}
- World Tone: {context_data['world_tone']}

CHARACTER:
- Name: {context_data['character_name']}
- Class: {context_data['character_class']}
- Background: {context_data['background']}
- Alignment: {context_data['alignment']}
- Role: {context_data['character_role']}

QUEST TEMPLATE: {context_data['quest_template']}
"""

        # Add custom prompt if provided
        if request.custom_prompt:
            generation_prompt += f"\n\nUSER REQUEST: {request.custom_prompt}"

        # Create temporary session for prologue generation (unique per request)
        prologue_session_id = f"prologue_{str(uuid.uuid4())}"
        await session_service.create_session(
            app_name='litrealms_prologue',
            user_id=user_id,
            session_id=prologue_session_id,
            state={}
        )

        # Run Prologue Generator Agent
        prologue_runner = Runner(
            app_name='litrealms_prologue',
            agent=prologue_generator_agent,
            session_service=session_service
        )

        message = types.Content(
            role='user',
            parts=[types.Part(text=generation_prompt)]
        )

        response_parts = []
        async for event in prologue_runner.run_async(
            user_id=user_id,
            session_id=prologue_session_id,
            new_message=message
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_parts.append(part.text)

        prologue_text = ''.join(response_parts).strip()

        # Automatically validate the generated prologue
        validation_result = None
        try:
            validation_request = ContentValidationRequest(
                content=prologue_text,
                content_type='prologue',
                mode=context_data['mode'],
                tone=context_data['tone'],
                world_template=context_data['world_template'],
                world_name=context_data['world_name'],
                magic_system=context_data['magic_system'],
                world_tone=context_data['world_tone'],
                character_name=context_data['character_name'],
                character_class=context_data['character_class'],
                background=context_data['background'],
                alignment=context_data['alignment'],
                character_role=context_data['character_role'],
                quest_template=request.quest_template
            )

            # Run validation
            validation_result = await validate_content(validation_request)
            print(f"Prologue validation completed - Score: {validation_result.overall_score}, Status: {validation_result.overall_status}")
        except Exception as validation_error:
            print(f"Warning: Prologue validation failed: {str(validation_error)}")
            # Continue even if validation fails - validation is optional

        return PrologueGenerationResponse(
            prologue=prologue_text,
            quest_template=request.quest_template,
            session_id=prologue_session_id,
            validation=validation_result
        )

    except Exception as e:
        import traceback
        print(f"Error generating prologue: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.post("/session/{session_id}/enhance-narrative")
async def enhance_narrative(session_id: str, request: dict):
    """
    Use AI to enhance and improve narrative text.
    Takes raw narrative and returns polished, improved version.
    """
    try:
        user_id = "user"
        narrative = request.get('narrative', '')
        context = request.get('context', '')

        if not narrative:
            raise HTTPException(status_code=400, detail="No narrative provided")

        # Create enhancement prompt
        enhancement_prompt = f"""You are a professional fiction editor and writer. Your task is to enhance the following narrative text while preserving its core story and meaning.

Improve:
- Prose quality and flow
- Descriptive language and imagery
- Character voice and dialogue
- Pacing and tension
- Grammar and style

Context: {context if context else 'Fantasy/LitRPG narrative'}

Original Narrative:
{narrative}

Return ONLY the enhanced narrative text, with no preamble or explanation."""

        # Use Gemini directly for enhancement
        import google.generativeai as genai
        import os

        genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
        model = genai.GenerativeModel('gemini-2.0-flash-exp')

        response = model.generate_content(enhancement_prompt)
        enhanced_text = response.text.strip()

        return {
            "enhanced_narrative": enhanced_text
        }

    except Exception as e:
        import traceback
        print(f"Error enhancing narrative: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.get("/session/{session_id}/compile-story", response_model=CompiledStoryResponse)
async def compile_story(session_id: str):
    """
    Compile a gameplay session into a polished, publishable story.
    The Story Compiler Agent transforms raw chat history into readable narrative.
    If a saved draft exists, return that instead of re-compiling.
    """
    try:
        user_id = "user"

        # Get session with full history
        session = await session_service.get_session(
            app_name='litrealms',
            user_id=user_id,
            session_id=session_id
        )

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Check if a saved draft exists
        if 'story_draft' in session.state and session.state['story_draft']:
            # Return the saved draft instead of re-compiling
            compiled_story = CompiledStory(**session.state['story_draft'])
            return CompiledStoryResponse(
                compiled_story=compiled_story,
                session_id=session_id,
                compiled_at=session.state.get('draft_saved_at', datetime.utcnow().isoformat())
            )

        # Get conversation history from events table
        import sqlite3
        conn = sqlite3.connect('adk_sessions.db')
        cursor = conn.cursor()
        cursor.execute("""
            SELECT content, author FROM events
            WHERE app_name=? AND user_id=? AND session_id=?
            ORDER BY timestamp ASC
        """, ('litrealms', user_id, session_id))

        history_rows = cursor.fetchall()
        conn.close()

        # Format session data for the Story Compiler Agent
        session_data = {
            "session_history": [
                {
                    "role": "user" if row[1] == "user" else "assistant",
                    "content": row[0] if row[0] else ""
                }
                for row in history_rows if row[0]
            ],
            "session_state": session.state,
            "session_id": session_id
        }

        # Create prompt for Story Compiler Agent
        compilation_prompt = f"""Compile this gameplay session into a polished story.

SESSION DATA:
{json.dumps(session_data, indent=2)}

Transform the raw gameplay into a beautiful narrative following your instructions. Return valid JSON with the compiled story structure."""

        # Create temporary session for compilation
        compile_session_id = f"compile_{session_id}"

        # Check if compile session already exists
        existing_compile_session = await session_service.get_session(
            app_name='litrealms_compiler',
            user_id=user_id,
            session_id=compile_session_id
        )

        # Only create the compile session if it doesn't exist
        if not existing_compile_session:
            await session_service.create_session(
                app_name='litrealms_compiler',
                user_id=user_id,
                session_id=compile_session_id,
                state={}
            )

        # Run Story Compiler Agent
        compiler_runner = Runner(
            app_name='litrealms_compiler',
            agent=story_compiler_agent,
            session_service=session_service
        )

        message = types.Content(
            role='user',
            parts=[types.Part(text=compilation_prompt)]
        )

        response_parts = []
        async for event in compiler_runner.run_async(
            user_id=user_id,
            session_id=compile_session_id,
            new_message=message
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_parts.append(part.text)

        response_text = ''.join(response_parts)

        # Parse JSON response from agent
        # Robust JSON extraction - handle text before/after JSON and markdown fences
        clean_response = response_text.strip()

        # Remove markdown code fences (anywhere in text)
        clean_response = re.sub(r'```json\s*', '', clean_response)
        clean_response = re.sub(r'```\s*', '', clean_response)
        clean_response = clean_response.strip()

        # If response doesn't start with {, extract JSON object
        if not clean_response.startswith('{'):
            # Find first { and last } to extract JSON object
            start_idx = clean_response.find('{')
            end_idx = clean_response.rfind('}')
            if start_idx != -1 and end_idx != -1:
                clean_response = clean_response[start_idx:end_idx+1]
            else:
                # No JSON found in response
                raise ValueError(f"No JSON object found in response. Response preview: {clean_response[:200]}")

        compiled_data = json.loads(clean_response)

        # Convert to Pydantic models
        compiled_story = CompiledStory(**compiled_data)

        return CompiledStoryResponse(
            compiled_story=compiled_story,
            session_id=session_id,
            compiled_at=datetime.utcnow().isoformat()
        )

    except json.JSONDecodeError as e:
        import traceback
        print(f"JSON Parse Error: {str(e)}\n{traceback.format_exc()}")
        print(f"Response text: {response_text}")
        # Return better error details to frontend
        error_detail = {
            "error": "Failed to parse story compilation JSON",
            "parse_error": str(e),
            "response_preview": clean_response[:300] if len(clean_response) > 300 else clean_response
        }
        raise HTTPException(status_code=500, detail=error_detail)
    except ValueError as e:
        import traceback
        print(f"Value Error: {str(e)}\n{traceback.format_exc()}")
        print(f"Response text: {response_text}")
        # No JSON found in response
        error_detail = {
            "error": "No valid JSON found in story compilation response",
            "details": str(e)
        }
        raise HTTPException(status_code=500, detail=error_detail)
    except Exception as e:
        import traceback
        print(f"Error compiling story: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@app.post("/validate-content", response_model=ContentValidationResponse)
async def validate_content(request: ContentValidationRequest):
    """
    Validate narrative content (prologue or chapter) for consistency with story configuration.
    Uses the Content Validation Agent to check world, character, tone, quest, and mode alignment.
    """
    try:
        user_id = "validator"
        validation_session_id = f"validation_{uuid.uuid4()}"

        # Build validation prompt with content and configuration
        validation_prompt = f"""CONTENT_TO_VALIDATE:
{request.content}

STORY_CONFIGURATION:
- mode: {request.mode}
- tone: {request.tone}
- world_template: {request.world_template}
- world_name: {request.world_name}
- magic_system: {request.magic_system}
- world_tone: {request.world_tone}
- character_name: {request.character_name}
- character_class: {request.character_class}
- background: {request.background}
- alignment: {request.alignment}
- character_role: {request.character_role}
- quest_template: {request.quest_template}

Please validate this {request.content_type} and provide your assessment."""

        # Run validation using standalone runner
        validation_runner = Runner(
            app_name='litrealms_validation',
            agent=content_validation_agent,
            session_service=session_service
        )

        # Create session for validation
        await session_service.create_session(
            app_name='litrealms_validation',
            user_id=user_id,
            session_id=validation_session_id,
            state={}
        )

        # Use Content for the message
        message = types.Content(
            role='user',
            parts=[types.Part(text=validation_prompt)]
        )

        response_text = ""
        async for event in validation_runner.run_async(
            user_id=user_id,
            session_id=validation_session_id,
            new_message=message
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_text += part.text

        # Parse validation response
        validation_result = parse_validation_response(response_text)

        return validation_result

    except Exception as e:
        import traceback
        print(f"Error validating content: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

def parse_validation_response(response_text: str) -> ContentValidationResponse:
    """
    Parse the validation agent's structured response into ContentValidationResponse model.
    """
    try:
        # Extract sections using regex
        overall_score = int(re.search(r'OVERALL_SCORE:\s*(\d+)', response_text).group(1))
        overall_status = re.search(r'OVERALL_STATUS:\s*(PASS|MINOR_ISSUES|FAIL)', response_text).group(1)

        # Parse each validation category
        def parse_category(category_name: str) -> ValidationCategory:
            pattern = rf'{category_name}:\s*-\s*Score:\s*(\d+)\s*-\s*Status:\s*(PASS|MINOR_ISSUES|FAIL)\s*-\s*Feedback:\s*([^\n]+(?:\n(?![\w_]+:)[^\n]+)*)'
            match = re.search(pattern, response_text, re.IGNORECASE | re.MULTILINE)
            if match:
                return ValidationCategory(
                    score=int(match.group(1)),
                    status=match.group(2),
                    feedback=match.group(3).strip()
                )
            else:
                # Fallback if parsing fails
                return ValidationCategory(score=0, status='FAIL', feedback=f'Failed to parse {category_name}')

        world_consistency = parse_category('WORLD_CONSISTENCY')
        character_consistency = parse_category('CHARACTER_CONSISTENCY')
        narrator_tone = parse_category('NARRATOR_TONE')
        quest_alignment = parse_category('QUEST_ALIGNMENT')
        story_mode = parse_category('STORY_MODE')

        # Extract quality notes and suggestions
        quality_match = re.search(r'QUALITY_NOTES:\s*([^\n]+(?:\n(?![\w_]+:)[^\n]+)*)', response_text, re.MULTILINE)
        quality_notes = quality_match.group(1).strip() if quality_match else "No quality notes provided"

        suggestions_match = re.search(r'SUGGESTED_IMPROVEMENTS:\s*([^\n]+(?:\n(?![\w_]+:)[^\n]+)*)', response_text, re.MULTILINE)
        suggested_improvements = suggestions_match.group(1).strip() if suggestions_match else "None"

        return ContentValidationResponse(
            overall_score=overall_score,
            overall_status=overall_status,
            world_consistency=world_consistency,
            character_consistency=character_consistency,
            narrator_tone=narrator_tone,
            quest_alignment=quest_alignment,
            story_mode=story_mode,
            quality_notes=quality_notes,
            suggested_improvements=suggested_improvements
        )

    except Exception as e:
        print(f"Error parsing validation response: {str(e)}")
        print(f"Response text: {response_text}")
        # Return a fallback response
        return ContentValidationResponse(
            overall_score=0,
            overall_status='FAIL',
            world_consistency=ValidationCategory(score=0, status='FAIL', feedback='Parsing error'),
            character_consistency=ValidationCategory(score=0, status='FAIL', feedback='Parsing error'),
            narrator_tone=ValidationCategory(score=0, status='FAIL', feedback='Parsing error'),
            quest_alignment=ValidationCategory(score=0, status='FAIL', feedback='Parsing error'),
            story_mode=ValidationCategory(score=0, status='FAIL', feedback='Parsing error'),
            quality_notes='Failed to parse validation response',
            suggested_improvements='Please regenerate content'
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)