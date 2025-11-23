import os
import asyncio
import uuid
import re
import json
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.adk.sessions import DatabaseSessionService
from google.adk.runners import Runner
from google.genai import types
from assistant.agent import root_agent, chat_agent
from assistant.story_compiler_agent import story_compiler_agent
from assistant.prologue_generator_agent import prologue_generator_agent
from models import GameConfig, CompiledStoryResponse, CompiledStory, StoryMetadata, StoryChapter, PrologueGenerationRequest, PrologueGenerationResponse

load_dotenv()

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
    Create new gameplay session with complete onboarding configuration.
    This is called when user clicks "Launch Adventure" after completing onboarding.
    All agents will have access to this data via session.state
    """
    try:
        user_id = "user"
        session_id = config.id  # Use the session_id from GameConfig.id

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

        # Create new session for gameplay
        await session_service.create_session(
            app_name='litrealms',
            user_id=user_id,
            session_id=session_id,
            state=session_state
        )

        return {
            "session_id": session_id,
            "message": "Onboarding data submitted successfully. Your adventure is ready to begin!"
        }

    except Exception as e:
        import traceback
        print(f"Error in submit_onboarding: {str(e)}\n{traceback.format_exc()}")
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

        return PrologueGenerationResponse(
            prologue=prologue_text,
            quest_template=request.quest_template,
            session_id=prologue_session_id
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)