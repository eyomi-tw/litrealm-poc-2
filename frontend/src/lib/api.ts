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
    current_location?: string;
    time_of_day?: string;
    weather?: string;
    current_quest?: string;
    npcs_present?: string[];
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
  book_id: string;
  chapter_id: string;
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

export interface ValidationCategory {
  score: number;  // 0-100
  status: 'PASS' | 'MINOR_ISSUES' | 'FAIL';
  feedback: string;
}

export interface ContentValidationResponse {
  overall_score: number;
  overall_status: 'PASS' | 'MINOR_ISSUES' | 'FAIL';
  world_consistency: ValidationCategory;
  character_consistency: ValidationCategory;
  narrator_tone: ValidationCategory;
  quest_alignment: ValidationCategory;
  story_mode: ValidationCategory;
  quality_notes: string;
  suggested_improvements: string;
}

export interface PrologueGenerationResponse {
  prologue: string;
  quest_template: QuestType;
  session_id: string;
  validation?: ContentValidationResponse;  // Optional validation results
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

// Content Validation
export interface ContentValidationRequest {
  content: string;
  content_type: 'prologue' | 'chapter';
  mode: string;
  tone: string;
  world_template: string;
  world_name: string;
  magic_system: string;
  world_tone: string;
  character_name: string;
  character_class: string;
  background: string;
  alignment: string;
  character_role: string;
  quest_template: string;
}

export async function validateContent(
  request: ContentValidationRequest
): Promise<ContentValidationResponse> {
  const response = await fetch(`${API_BASE_URL}/validate-content`, {
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

// Book API
export interface BookResponse {
  id: string;
  user_id: string;
  title: string;
  subtitle?: string;
  game_config: GameConfig;
  chapters: Array<{
    id: string;
    book_id: string;
    number: number;
    title: string;
    status: 'draft' | 'in_progress' | 'complete' | 'published';
    session_id: string;
    game_transcript: Array<{ role: string; content: string; timestamp: string }>;
    initial_state: any;
    final_state: any;
    authored_content: string;
    last_edited: string;
    word_count: number;
    previous_chapter_id?: string;
    next_chapter_id?: string;
    narrative_summary?: string;
    created_at: string;
    updated_at: string;
  }>;
  created_at: string;
  updated_at: string;
  total_word_count: number;
}

export async function listBooks(): Promise<BookResponse[]> {
  const response = await fetch(`${API_BASE_URL}/books`);

  if (!response.ok) {
    throw new Error(`Failed to list books: ${response.statusText}`);
  }

  return response.json();
}

export async function getBook(bookId: string): Promise<BookResponse> {
  const response = await fetch(`${API_BASE_URL}/books/${bookId}`);

  if (!response.ok) {
    throw new Error(`Failed to get book: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteBook(bookId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete book: ${response.statusText}`);
  }

  return response.json();
}

export interface UpdateBookRequest {
  title?: string;
  subtitle?: string;
  character_name?: string;
}

export async function updateBook(bookId: string, updates: UpdateBookRequest): Promise<BookResponse> {
  const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update book: ${response.statusText}`);
  }

  return response.json();
}

// Chapter API
export async function getChapter(chapterId: string) {
  const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}`);

  if (!response.ok) {
    throw new Error(`Failed to get chapter: ${response.statusText}`);
  }

  return response.json();
}

export interface ChapterCompilationResponse {
  narrative: string;
  chapter_id: string;
  word_count: number;
  compiled_at: string;
}

export async function compileChapter(chapterId: string): Promise<ChapterCompilationResponse> {
  const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/compile`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to compile chapter: ${response.statusText}`);
  }

  return response.json();
}

export async function compileChapterDmNarrative(chapterId: string): Promise<ChapterCompilationResponse> {
  const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/compile-dm-narrative`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to compile chapter DM narrative: ${response.statusText}`);
  }

  return response.json();
}

export interface SimulateGameplayResponse {
  success: boolean;
  message: string;
  turns_added: number;
  final_state: any;
}

export async function simulateGameplay(chapterId: string): Promise<SimulateGameplayResponse> {
  const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/simulate-gameplay`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to simulate gameplay: ${response.statusText}`);
  }

  return response.json();
}

export interface UpdateChapterRequest {
  authored_content?: string;
  title?: string;
  status?: 'draft' | 'in_progress' | 'complete' | 'published';
}

export async function updateChapter(chapterId: string, updates: UpdateChapterRequest) {
  const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update chapter: ${response.statusText}`);
  }

  return response.json();
}

export interface GenerateTitleResponse {
  success: boolean;
  generated_title: string;
}

export async function generateChapterTitle(chapterId: string): Promise<GenerateTitleResponse> {
  const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/generate-title`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to generate title: ${response.statusText}`);
  }

  return response.json();
}

export interface CompleteChapterResponse {
  message: string;
  chapter: any;
  next_chapter: any | null;
  next_chapter_created: boolean;
}

export async function completeChapter(chapterId: string, createNext: boolean = false): Promise<CompleteChapterResponse> {
  const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ create_next: createNext }),
  });

  if (!response.ok) {
    throw new Error(`Failed to complete chapter: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteChapter(chapterId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/chapters/${chapterId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete chapter: ${response.statusText}`);
  }

  return response.json();
}
