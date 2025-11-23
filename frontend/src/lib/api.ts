// API client for LitRealms backend

import { GameConfig, QuestType } from './types/game';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface QuickAction {
  label: string;
  message: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  quick_actions: QuickAction[];
  state: {
    level?: number;
    xp?: number;
    xp_to_next_level?: number;
    character_stats?: {
      hp?: number;
      max_hp?: number;
      mana?: number;
      max_mana?: number;
      strength?: number;
      intelligence?: number;
      dexterity?: number;
      constitution?: number;
      charisma?: number;
    };
    inventory?: string[];
    onboarding_complete?: boolean;
    world_template?: string;
    story_mode?: string;
    character_class?: string;
    character_name?: string;
    tone?: string;
  };
}

export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

export interface OnboardingSubmitResponse {
  session_id: string;
  message: string;
}

export async function submitOnboarding(
  config: GameConfig
): Promise<OnboardingSubmitResponse> {
  const response = await fetch(`${API_BASE_URL}/submit-onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export interface PrologueGenerationResponse {
  prologue: string;
  quest_template: QuestType;
  session_id: string;
}

export interface PrologueGenerationRequest {
  quest_template: QuestType;
  custom_prompt?: string;
  // Onboarding context (optional - used for stateless generation)
  mode?: string;
  tone?: string;
  world_template?: string;
  world_name?: string;
  magic_system?: string;
  world_tone?: string;
  character_name?: string;
  character_class?: string;
  background?: string;
  alignment?: string;
  character_role?: string;
}

export async function generatePrologue(
  request: PrologueGenerationRequest
): Promise<PrologueGenerationResponse> {
  const response = await fetch(`${API_BASE_URL}/generate-prologue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

// Story Compilation types and functions
export interface StoryChapter {
  number: number;
  title: string;
  summary: string;
  word_count: number;
}

export interface StoryMetadata {
  character_name: string;
  character_class: string;
  world: string;
  genre: string;
  tone: string;
  session_date: string;
  total_scenes: number;
  final_level: number;
  playtime_estimate: string;
}

export interface CompiledStory {
  title: string;
  subtitle: string;
  metadata: StoryMetadata;
  narrative: string;
  chapters: StoryChapter[];
  character_arc: string;
  key_moments: string[];
}

export interface CompiledStoryResponse {
  compiled_story: CompiledStory;
  session_id: string;
  compiled_at: string;
}

export async function compileStory(sessionId: string): Promise<CompiledStoryResponse> {
  const response = await fetch(`${API_BASE_URL}/session/${sessionId}/compile-story`);

  if (!response.ok) {
    throw new Error(`Failed to compile story: ${response.statusText}`);
  }

  return response.json();
}

export interface SaveDraftRequest {
  compiled_story: CompiledStory;
}

export interface SaveDraftResponse {
  message: string;
  session_id: string;
}

export async function saveStoryDraft(
  sessionId: string,
  storyDraft: CompiledStory
): Promise<SaveDraftResponse> {
  const response = await fetch(`${API_BASE_URL}/session/${sessionId}/save-story-draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ compiled_story: storyDraft }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save draft: ${response.statusText}`);
  }

  return response.json();
}

export interface EnhanceNarrativeRequest {
  narrative: string;
  context?: string;
}

export interface EnhanceNarrativeResponse {
  enhanced_narrative: string;
}

export async function enhanceNarrative(
  sessionId: string,
  narrative: string,
  context?: string
): Promise<EnhanceNarrativeResponse> {
  const response = await fetch(`${API_BASE_URL}/session/${sessionId}/enhance-narrative`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ narrative, context }),
  });

  if (!response.ok) {
    throw new Error(`Failed to enhance narrative: ${response.statusText}`);
  }

  return response.json();
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SessionHistoryResponse {
  session_id: string;
  messages: SessionMessage[];
  state: ChatResponse['state'];
}

export async function getSessionHistory(sessionId: string): Promise<SessionHistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/session/${sessionId}/history`);

  if (!response.ok) {
    throw new Error(`Failed to get session history: ${response.statusText}`);
  }

  return response.json();
}
