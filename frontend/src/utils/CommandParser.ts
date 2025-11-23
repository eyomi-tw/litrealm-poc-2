// Command Parser for text-driven gameplay
// Parses player text input into structured commands

export type CommandType =
  | 'dice_roll'
  | 'movement'
  | 'action'
  | 'character_sheet'
  | 'inventory'
  | 'story';

export interface DiceRoll {
  count: number;
  sides: number;
  modifier?: number;
  label?: string; // e.g., "perception", "attack"
}

export interface ParsedCommand {
  type: CommandType;
  raw: string;
  data?: {
    direction?: string; // north, south, east, west, forward, back
    target?: string; // forest, village, door, npc name
    action?: string; // examine, talk, attack, search
    diceRoll?: DiceRoll;
    [key: string]: any;
  };
}

// Dice roll pattern: /roll 2d20+3 or /r 1d6
const DICE_ROLL_PATTERN = /^\/(roll|r)\s+(\d+)d(\d+)([+-]\d+)?(\s+(.+))?$/i;

// Movement keywords
const MOVEMENT_KEYWORDS = [
  'walk', 'run', 'move', 'go', 'travel', 'head', 'sprint', 'sneak',
  'north', 'south', 'east', 'west', 'forward', 'back', 'backward'
];

// Action keywords
const ACTION_KEYWORDS = [
  'examine', 'look', 'inspect', 'search', 'talk', 'speak', 'attack',
  'use', 'open', 'close', 'take', 'grab', 'pick up', 'interact'
];

// Special commands
const SPECIAL_COMMANDS = {
  sheet: /^\/(sheet|character|stats)$/i,
  inventory: /^\/(inventory|inv|items|bag)$/i,
};

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  // Check for dice rolls
  const diceMatch = trimmed.match(DICE_ROLL_PATTERN);
  if (diceMatch) {
    const count = parseInt(diceMatch[2]);
    const sides = parseInt(diceMatch[3]);
    const modifier = diceMatch[4] ? parseInt(diceMatch[4]) : undefined;
    const label = diceMatch[6]?.trim();

    return {
      type: 'dice_roll',
      raw: trimmed,
      data: {
        diceRoll: { count, sides, modifier, label }
      }
    };
  }

  // Check for special commands
  if (SPECIAL_COMMANDS.sheet.test(trimmed)) {
    return {
      type: 'character_sheet',
      raw: trimmed
    };
  }

  if (SPECIAL_COMMANDS.inventory.test(trimmed)) {
    return {
      type: 'inventory',
      raw: trimmed
    };
  }

  // Check for movement commands
  const lowerInput = trimmed.toLowerCase();
  const hasMovementKeyword = MOVEMENT_KEYWORDS.some(keyword =>
    lowerInput.includes(keyword)
  );

  if (hasMovementKeyword) {
    // Extract direction and target
    const direction = extractDirection(lowerInput);
    const target = extractTarget(lowerInput);

    return {
      type: 'movement',
      raw: trimmed,
      data: { direction, target }
    };
  }

  // Check for action commands
  const hasActionKeyword = ACTION_KEYWORDS.some(keyword =>
    lowerInput.includes(keyword)
  );

  if (hasActionKeyword) {
    const action = ACTION_KEYWORDS.find(keyword => lowerInput.includes(keyword));
    const target = extractActionTarget(lowerInput, action!);

    return {
      type: 'action',
      raw: trimmed,
      data: { action, target }
    };
  }

  // Default: treat as story/roleplay text
  return {
    type: 'story',
    raw: trimmed
  };
}

function extractDirection(input: string): string | undefined {
  const directions = ['north', 'south', 'east', 'west', 'forward', 'back', 'backward'];
  return directions.find(dir => input.includes(dir));
}

function extractTarget(input: string): string | undefined {
  // Common location keywords
  const locations = ['village', 'forest', 'desert', 'dungeon', 'town', 'cave', 'castle'];

  // Check for "to the X" or "to X" pattern
  const toPattern = /(?:to\s+(?:the\s+)?)([\w\s]+)/i;
  const match = input.match(toPattern);

  if (match) {
    return match[1].trim();
  }

  // Check for known locations
  const foundLocation = locations.find(loc => input.includes(loc));
  if (foundLocation) {
    return foundLocation;
  }

  return undefined;
}

function extractActionTarget(input: string, action: string): string | undefined {
  // Remove the action keyword and extract what comes after
  const afterAction = input.split(action)[1]?.trim();

  if (!afterAction) return undefined;

  // Remove common prepositions
  const cleaned = afterAction
    .replace(/^(at|the|a|an)\s+/i, '')
    .trim();

  return cleaned || undefined;
}

// Dice rolling function
export function rollDice(roll: DiceRoll): { rolls: number[]; total: number; modifier: number } {
  const rolls: number[] = [];

  for (let i = 0; i < roll.count; i++) {
    rolls.push(Math.floor(Math.random() * roll.sides) + 1);
  }

  const sum = rolls.reduce((acc, val) => acc + val, 0);
  const modifier = roll.modifier || 0;
  const total = sum + modifier;

  return { rolls, total, modifier };
}

// Format dice roll result for display
export function formatDiceResult(roll: DiceRoll, result: { rolls: number[]; total: number; modifier: number }): string {
  const label = roll.label ? `${roll.label}: ` : '';
  const modifier = result.modifier !== 0 ? ` ${result.modifier > 0 ? '+' : ''}${result.modifier}` : '';
  const breakdown = result.rolls.join(' + ');

  return `${label}Rolling ${roll.count}d${roll.sides}${modifier}\n[${breakdown}]${modifier} = ${result.total}`;
}
