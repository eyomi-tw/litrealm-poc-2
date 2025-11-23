export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  quick_actions?: QuickAction[];
}

export interface QuickAction {
  label: string;
  message: string;
}

export interface CharacterStats {
  strength?: number;
  intelligence?: number;
  dexterity?: number;
  constitution?: number;
  charisma?: number;
  hp?: number;
  max_hp?: number;
  mana?: number;
  max_mana?: number;
}

export interface SessionState {
  // Onboarding
  current_step?: number;
  world_template?: string;
  story_mode?: string;
  character_class?: string;
  tone?: string;
  onboarding_complete?: boolean;
  
  // Character Stats
  character_stats?: CharacterStats;
  
  // Progression
  xp?: number;
  level?: number;
  xp_to_next_level?: number;
  
  // Story
  current_scene?: string;
  inventory?: string[];
}
