// Game Configuration Types (from Onboarding)

export type StoryMode = 'progression' | 'dungeon_crawl' | 'survival_quest' | 'campaign' | 'solo' | 'legacy';
export type Tone = 'heroic' | 'comedic' | 'dark' | 'slice_of_life' | 'glitched_meta';
export type WorldTone = 'heroic' | 'gritty' | 'comedic';
export type MagicSystem = 'on' | 'off';

export interface Faction {
  id: string;
  name: string;
  description: string;
  influence: 'low' | 'moderate' | 'high';
  hostility: 'low' | 'moderate' | 'high';
  enabled: boolean;
}

export interface WorldConfig {
  template: string;
  name: string;
  magicSystem: MagicSystem;
  worldTone: WorldTone;
  factions: Faction[];
}

export type CharacterClass = 'arcblade' | 'shadow_walker' | 'lorekeeper' | 'battle_priest' | 'ranger';
export type CharacterRole = 'hero' | 'antihero' | 'neutral';
export type Alignment =
  | 'lawful_good' | 'neutral_good' | 'chaotic_good'
  | 'lawful_neutral' | 'true_neutral' | 'chaotic_neutral'
  | 'lawful_evil' | 'neutral_evil' | 'chaotic_evil';

export type Background = 'noble_born' | 'forge_apprentice' | 'scholars_ward' | 'street_urchin' | 'military_veteran';

export interface CharacterStats {
  strength: number;
  intelligence: number;
  agility: number;
  charisma: number;
  reputation: number;
  hp: number;
  max_hp: number;
  mana?: number;
  max_mana?: number;
}

export interface Companion {
  id: string;
  name: string;
  description: string;
  skills: string[];
  avatarSeed: string;
  enabled: boolean;
}

export interface Rival {
  id: string;
  name: string;
  description: string;
  conflict: string;
  avatarSeed: string;
  enabled: boolean;
}

export interface CharacterTemplate {
  id: string;
  name: string;
  class: CharacterClass;
  backstory: string;
  role: CharacterRole;
  alignment: Alignment;
  background: Background;
  stats: CharacterStats;
  traits: string[];
  companions: Companion[];
  rivals: Rival[];
  image?: string; // Avatar image URL or placeholder
}

export interface CharacterConfig {
  class: CharacterClass;
  name: string;
  role: CharacterRole;
  alignment: Alignment;
  background: Background;
  stats: CharacterStats;
  traits: string[];
  companions: Companion[];
  rivals: Rival[];
}

export type QuestType = 'discovery' | 'rescue' | 'revenge' | 'conquest' | 'mystery';
export type QuestComplexity = 'linear' | 'branching' | 'modular';
export type SceneCreationMethod = 'custom_with_ai' | 'ai_generated';
export type SceneLocation = string;
export type TimeOfDay = 'dawn' | 'midday' | 'dusk' | 'midnight';

export interface DecisionOption {
  id: string;
  title: string;
  description: string;
  statConsequences: Array<{ stat: string; change: number; reason: string }>;
  storyImpact: string;
}

export interface DecisionPoint {
  id: string;
  scenario: string;
  options: DecisionOption[];
}

export interface QuestPath {
  id: string;
  name: string;
  description: string;
  triggeredBy: string[];
  leadsTo: string[];
  requirements: Record<string, number>;
}

export interface PrologueConfig {
  questTemplate: QuestType;
  generatedPrologue: string;
  customPrompt?: string;
}

export interface StoryConfig {
  questType: QuestType;
  complexity: QuestComplexity;
  sceneCreationMethod: SceneCreationMethod;
  openingScene: string;
  sceneLocation: SceneLocation;
  timeOfDay: TimeOfDay;
  mood: string[];
  decisionPoints: DecisionPoint[];
  questPaths: QuestPath[];
  prologue?: PrologueConfig; // New: stores generated prologue
}

export interface GameSettings {
  sessionDuration: number; // minutes
  difficultyModifier: number; // -2 to +2
  autoSave: boolean;
  narratorSpeed: 'slow' | 'normal' | 'fast';
}

export interface GameConfig {
  id: string;
  createdAt: string;
  mode: StoryMode;
  tone: Tone; // Narrator tone (removed genre)
  world: WorldConfig;
  character: CharacterConfig;
  story: StoryConfig;
  settings: GameSettings;
  bookTitle?: string; // Optional custom book title (if not provided, auto-generates from character name)
}

// Onboarding progress
export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  draftConfig: Partial<GameConfig>;
}

// Book and Chapter Types
export interface GameMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type ChapterStatus = 'draft' | 'in_progress' | 'complete' | 'published';

export interface Chapter {
  id: string;
  book_id: string;
  number: number;
  title: string;
  status: ChapterStatus;

  // Gameplay data
  session_id: string;
  game_transcript: GameMessage[];
  initial_state: Record<string, any>;
  final_state: Record<string, any>;

  // Authoring data
  authored_content: string;
  last_edited: string;
  word_count: number;

  // Continuity
  previous_chapter_id?: string;
  next_chapter_id?: string;
  narrative_summary?: string;

  // Metadata
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
