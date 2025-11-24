"""
Pydantic models for onboarding configuration
Mirrors the TypeScript types from frontend/src/lib/types/game.ts
"""

from pydantic import BaseModel, Field
from typing import List, Literal, Optional

# Enums
StoryMode = Literal['progression', 'dungeon_crawl', 'survival_quest', 'campaign', 'solo', 'legacy']
Tone = Literal['heroic', 'comedic', 'dark', 'slice_of_life', 'glitched_meta']
WorldTone = Literal['heroic', 'gritty', 'comedic']
MagicSystem = Literal['on', 'off']
CharacterClass = Literal['arcblade', 'shadow_walker', 'lorekeeper', 'battle_priest', 'ranger']
CharacterRole = Literal['hero', 'antihero', 'neutral']
Alignment = Literal['lawful_good', 'neutral_good', 'chaotic_good', 'lawful_neutral', 'true_neutral', 'chaotic_neutral', 'lawful_evil', 'neutral_evil', 'chaotic_evil']
Background = Literal['noble_born', 'forge_apprentice', 'scholars_ward', 'street_urchin', 'military_veteran']
QuestType = Literal['discovery', 'rescue', 'revenge', 'conquest', 'mystery']
QuestComplexity = Literal['linear', 'branching', 'modular']
SceneCreationMethod = Literal['custom_with_ai', 'ai_generated']
TimeOfDay = Literal['dawn', 'midday', 'dusk', 'midnight']

# World Config
class Faction(BaseModel):
    id: str
    name: str
    description: str
    influence: Literal['low', 'moderate', 'high']
    hostility: Literal['low', 'moderate', 'high']
    enabled: bool

class WorldConfig(BaseModel):
    template: str
    name: str
    magicSystem: MagicSystem
    worldTone: WorldTone
    factions: List[Faction]

# Character Config
class CharacterStats(BaseModel):
    strength: int
    intelligence: int
    agility: int
    charisma: int
    reputation: int
    hp: int
    max_hp: int
    mana: Optional[int] = None
    max_mana: Optional[int] = None

class Companion(BaseModel):
    id: str
    name: str
    description: str
    skills: List[str]
    avatarSeed: str
    enabled: bool

class Rival(BaseModel):
    id: str
    name: str
    description: str
    conflict: str
    avatarSeed: str
    enabled: bool

class CharacterTemplate(BaseModel):
    id: str
    name: str
    character_class: CharacterClass = Field(alias='class')
    backstory: str
    role: CharacterRole
    alignment: Alignment
    background: Background
    stats: CharacterStats
    traits: List[str]
    companions: List[Companion]
    rivals: List[Rival]
    image: Optional[str] = None  # Avatar image URL or placeholder

    class Config:
        populate_by_name = True

class CharacterConfig(BaseModel):
    character_class: CharacterClass = Field(alias='class')  # 'class' is reserved in Python
    name: str
    role: CharacterRole
    alignment: Alignment
    background: Background
    stats: CharacterStats
    traits: List[str]
    companions: List[Companion]
    rivals: List[Rival]

    class Config:
        populate_by_name = True  # Allow both 'class' and 'character_class'

# Story Config
class DecisionOption(BaseModel):
    id: str
    title: str
    description: str
    statConsequences: List[dict]
    storyImpact: str

class DecisionPoint(BaseModel):
    id: str
    scenario: str
    options: List[DecisionOption]

class QuestPath(BaseModel):
    id: str
    name: str
    description: str
    triggeredBy: List[str]
    leadsTo: List[str]
    requirements: dict

class PrologueConfig(BaseModel):
    questTemplate: QuestType
    generatedPrologue: str
    customPrompt: Optional[str] = None

class StoryConfig(BaseModel):
    questType: QuestType
    complexity: QuestComplexity
    sceneCreationMethod: SceneCreationMethod
    openingScene: str
    sceneLocation: str
    timeOfDay: TimeOfDay
    mood: List[str]
    decisionPoints: List[DecisionPoint]
    questPaths: List[QuestPath]
    prologue: Optional[PrologueConfig] = None  # New: stores generated prologue

# Game Settings
class GameSettings(BaseModel):
    sessionDuration: int  # minutes
    difficultyModifier: int  # -2 to +2
    autoSave: bool
    narratorSpeed: Literal['slow', 'normal', 'fast']

# Complete Game Config
class GameConfig(BaseModel):
    id: str
    createdAt: str
    mode: StoryMode
    tone: Tone  # Narrator tone (removed genre)
    world: WorldConfig
    character: CharacterConfig
    story: StoryConfig
    settings: GameSettings
    bookTitle: Optional[str] = None  # Optional custom book title (if not provided, auto-generates from character name)

# Story Compilation Models
class StoryChapter(BaseModel):
    number: int
    title: str
    summary: str
    word_count: int

class StoryMetadata(BaseModel):
    character_name: str
    character_class: str
    world: str
    genre: str
    tone: str
    session_date: str
    total_scenes: int
    final_level: int
    playtime_estimate: str

class CompiledStory(BaseModel):
    title: str
    subtitle: str
    metadata: StoryMetadata
    narrative: str
    chapters: List[StoryChapter]
    character_arc: str
    key_moments: List[str]

class CompiledStoryResponse(BaseModel):
    compiled_story: CompiledStory
    session_id: str
    compiled_at: str

# Prologue Generation Models
class PrologueGenerationRequest(BaseModel):
    quest_template: QuestType
    custom_prompt: Optional[str] = None
    # Onboarding data (required for stateless generation)
    mode: Optional[StoryMode] = None
    tone: Optional[Tone] = None
    world_template: Optional[str] = None
    world_name: Optional[str] = None
    magic_system: Optional[MagicSystem] = None
    world_tone: Optional[WorldTone] = None
    character_name: Optional[str] = None
    character_class: Optional[CharacterClass] = None
    background: Optional[Background] = None
    alignment: Optional[Alignment] = None
    character_role: Optional[CharacterRole] = None

class PrologueGenerationResponse(BaseModel):
    prologue: str
    quest_template: QuestType
    session_id: str
    validation: Optional['ContentValidationResponse'] = None  # Optional validation results

# Content Validation Models
class ValidationCategory(BaseModel):
    score: int  # 0-100
    status: Literal['PASS', 'MINOR_ISSUES', 'FAIL']
    feedback: str

class ContentValidationRequest(BaseModel):
    content: str  # The prologue or chapter text to validate
    content_type: Literal['prologue', 'chapter']  # Type of content being validated
    # Story configuration context - using str instead of Literal to allow flexible values
    mode: str  # StoryMode
    tone: str  # Tone
    world_template: str
    world_name: str
    magic_system: str  # MagicSystem
    world_tone: str  # WorldTone
    character_name: str
    character_class: str  # CharacterClass
    background: str  # Background
    alignment: str  # Alignment
    character_role: str  # CharacterRole
    quest_template: str  # QuestType

class ContentValidationResponse(BaseModel):
    overall_score: int  # 0-100
    overall_status: Literal['PASS', 'MINOR_ISSUES', 'FAIL']
    world_consistency: ValidationCategory
    character_consistency: ValidationCategory
    narrator_tone: ValidationCategory
    quest_alignment: ValidationCategory
    story_mode: ValidationCategory
    quality_notes: str
    suggested_improvements: str

# Book and Chapter Models
class GameMessage(BaseModel):
    role: Literal['user', 'assistant']
    content: str
    timestamp: str

class ChapterStatus(BaseModel):
    status: Literal['draft', 'in_progress', 'complete', 'published']

class Chapter(BaseModel):
    id: str
    book_id: str
    number: int
    title: str
    status: Literal['draft', 'in_progress', 'complete', 'published']

    # Gameplay data
    session_id: str  # ADK session for dungeon master chat
    game_transcript: List[GameMessage]  # Raw DM conversation
    initial_state: dict  # Character/world state at chapter start
    final_state: dict  # Character/world state at chapter end

    # Authoring data
    authored_content: str  # Refined chapter text for publication
    last_edited: str
    word_count: int

    # Continuity
    previous_chapter_id: Optional[str] = None
    next_chapter_id: Optional[str] = None
    narrative_summary: Optional[str] = None  # AI-generated summary for next chapter

    # Metadata
    created_at: str
    updated_at: str

class Book(BaseModel):
    id: str
    user_id: str
    title: str
    subtitle: Optional[str] = None
    game_config: GameConfig  # Initial onboarding configuration
    chapters: List[Chapter]
    created_at: str
    updated_at: str
    total_word_count: int = 0

class CreateBookRequest(BaseModel):
    title: str
    subtitle: Optional[str] = None
    game_config: GameConfig

class CreateChapterRequest(BaseModel):
    book_id: str
    title: str
    previous_chapter_id: Optional[str] = None

class UpdateChapterRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[Literal['draft', 'in_progress', 'complete', 'published']] = None
    authored_content: Optional[str] = None

class CompleteChapterRequest(BaseModel):
    create_next: bool = False  # Whether to auto-create next chapter

class ChapterCompilationResponse(BaseModel):
    """Response from compiling a chapter's gameplay into authored content"""
    narrative: str  # Compiled prose narrative
    chapter_id: str
    word_count: int
    compiled_at: str
