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
