'use client';

import { useState, useEffect } from 'react';
import {
  CharacterConfig,
  CharacterClass,
  CharacterRole,
  Alignment,
  Background,
  CharacterStats,
  Companion,
  Rival,
  CharacterTemplate
} from '@/lib/types/game';

interface StepThreeProps {
  initialData?: Partial<CharacterConfig>;
  onDataChange: (data: CharacterConfig) => void;
  bookTitle?: string;
  onBookTitleChange?: (bookTitle: string) => void;
}

// Pre-built character templates
const characterTemplates: CharacterTemplate[] = [
  {
    id: 'iron_blade',
    name: 'Kael Ironfist',
    class: 'battle_priest',
    backstory: 'A battle-hardened warrior-priest who survived the Fall of Irongate. Now seeks redemption by protecting the innocent while struggling with the darkness witnessed in war.',
    role: 'hero',
    alignment: 'lawful_good',
    background: 'military_veteran',
    stats: {
      strength: 14,
      intelligence: 10,
      agility: 8,
      charisma: 12,
      reputation: 50,
      hp: 85,
      max_hp: 85,
      mana: 100,
      max_mana: 100
    },
    traits: ['Disciplined', 'Protective', 'Haunted by War'],
    companions: [
      {
        id: 'serra',
        name: 'Serra',
        description: 'A young healer who believes in Kael\'s redemption',
        skills: ['Healing', 'Herbalism'],
        avatarSeed: 'serra_healer',
        enabled: true
      }
    ],
    rivals: [
      {
        id: 'valdris',
        name: 'Commander Valdris',
        description: 'Former commanding officer who views Kael as a deserter',
        conflict: 'Believes Kael abandoned his duty during the Fall of Irongate',
        avatarSeed: 'valdris_commander',
        enabled: true
      }
    ],
    image: '⚔️'
  },
  {
    id: 'shadow_blade',
    name: 'Nyx Shadowstep',
    class: 'shadow_walker',
    backstory: 'A street urchin turned master thief. Quick wit and quicker hands saved them from poverty, but now they seek something more than stolen coin.',
    role: 'antihero',
    alignment: 'chaotic_neutral',
    background: 'street_urchin',
    stats: {
      strength: 9,
      intelligence: 13,
      agility: 16,
      charisma: 11,
      reputation: 30,
      hp: 70,
      max_hp: 70,
      mana: 50,
      max_mana: 50
    },
    traits: ['Cunning', 'Distrustful', 'Resourceful'],
    companions: [
      {
        id: 'whisper',
        name: 'Whisper',
        description: 'A street cat with an uncanny ability to find trouble',
        skills: ['Stealth', 'Scouting'],
        avatarSeed: 'whisper_cat',
        enabled: true
      }
    ],
    rivals: [
      {
        id: 'iron_claw',
        name: 'The Iron Claw',
        description: 'Ruthless crime lord who controls the city\'s underworld',
        conflict: 'Nyx stole something precious from them',
        avatarSeed: 'iron_claw',
        enabled: true
      }
    ],
    image: '🗡️'
  },
  {
    id: 'sage_scholar',
    name: 'Elara Moonwhisper',
    class: 'lorekeeper',
    backstory: 'A scholar\'s ward raised in the Grand Archives. Obsessed with uncovering forbidden knowledge that may save or doom the world.',
    role: 'hero',
    alignment: 'neutral_good',
    background: 'scholars_ward',
    stats: {
      strength: 7,
      intelligence: 16,
      agility: 9,
      charisma: 13,
      reputation: 60,
      hp: 60,
      max_hp: 60,
      mana: 120,
      max_mana: 120
    },
    traits: ['Curious', 'Knowledgeable', 'Reckless with Magic'],
    companions: [
      {
        id: 'codex',
        name: 'Codex',
        description: 'A sentient magical tome with vast but fragmented knowledge',
        skills: ['Ancient Lore', 'Arcane Insight'],
        avatarSeed: 'codex_book',
        enabled: true
      }
    ],
    rivals: [
      {
        id: 'malthus',
        name: 'Archmagus Malthus',
        description: 'Elara\'s former mentor who now hunts forbidden knowledge seekers',
        conflict: 'Believes Elara is dabbling in dangerous magics',
        avatarSeed: 'malthus_mage',
        enabled: true
      }
    ],
    image: '📚'
  },
  {
    id: 'noble_knight',
    name: 'Sir Aldric Thornheart',
    class: 'arcblade',
    backstory: 'Born to nobility, trained in the art of combat and honor. Now questions whether the old codes of chivalry can survive in a changing world.',
    role: 'hero',
    alignment: 'lawful_neutral',
    background: 'noble_born',
    stats: {
      strength: 15,
      intelligence: 11,
      agility: 12,
      charisma: 14,
      reputation: 70,
      hp: 100,
      max_hp: 100,
      mana: 30,
      max_mana: 30
    },
    traits: ['Honorable', 'Proud', 'Conflicted'],
    companions: [
      {
        id: 'marcus',
        name: 'Marcus',
        description: 'Loyal squire who looks up to Aldric',
        skills: ['Combat Training', 'First Aid'],
        avatarSeed: 'marcus_squire',
        enabled: true
      }
    ],
    rivals: [
      {
        id: 'lady_corvus',
        name: 'Lady Corvus',
        description: 'A rival noble who seeks to discredit the Thornheart family',
        conflict: 'Political rivalry over land and influence',
        avatarSeed: 'lady_corvus',
        enabled: true
      }
    ],
    image: '🛡️'
  },
  {
    id: 'wildwood_ranger',
    name: 'Thorn Wildwood',
    class: 'ranger',
    backstory: 'Raised by wolves after being abandoned in the forest. More comfortable with beasts than people, but fiercely protective of nature.',
    role: 'neutral',
    alignment: 'true_neutral',
    background: 'street_urchin',
    stats: {
      strength: 12,
      intelligence: 10,
      agility: 15,
      charisma: 8,
      reputation: 40,
      hp: 75,
      max_hp: 75,
      mana: 40,
      max_mana: 40
    },
    traits: ['Feral', 'Observant', 'Untrusting of Civilization'],
    companions: [
      {
        id: 'greyfang',
        name: 'Greyfang',
        description: 'An ancient wolf who raised Thorn',
        skills: ['Tracking', 'Combat'],
        avatarSeed: 'greyfang_wolf',
        enabled: true
      }
    ],
    rivals: [
      {
        id: 'hunter_vex',
        name: 'Vex the Hunter',
        description: 'A poacher who sees the wilds as something to exploit',
        conflict: 'Threatens the forest and its creatures',
        avatarSeed: 'vex_hunter',
        enabled: true
      }
    ],
    image: '🏹'
  }
];

export default function StepThree({ initialData, onDataChange, bookTitle, onBookTitleChange }: StepThreeProps) {
  const defaultTemplate = characterTemplates[0]; // Kael Ironfist
  const [selectedTemplate, setSelectedTemplate] = useState<CharacterTemplate>(
    initialData ? characterTemplates.find(t => t.name === initialData.name) || defaultTemplate : defaultTemplate
  );

  const [name, setName] = useState(initialData?.name || defaultTemplate.name);
  const [localBookTitle, setLocalBookTitle] = useState(bookTitle || '');
  const [characterClass, setCharacterClass] = useState<CharacterClass>(initialData?.class || defaultTemplate.class);
  const [role, setRole] = useState<CharacterRole>(initialData?.role || defaultTemplate.role);
  const [alignment, setAlignment] = useState<Alignment>(initialData?.alignment || defaultTemplate.alignment);
  const [background, setBackground] = useState<Background>(initialData?.background || defaultTemplate.background);
  const [stats, setStats] = useState<CharacterStats>(initialData?.stats || defaultTemplate.stats);
  const [traits, setTraits] = useState<string[]>(initialData?.traits || defaultTemplate.traits);
  const [companions, setCompanions] = useState<Companion[]>(initialData?.companions || defaultTemplate.companions);
  const [rivals, setRivals] = useState<Rival[]>(initialData?.rivals || defaultTemplate.rivals);

  // Pre-select default template on mount
  useEffect(() => {
    if (!initialData) {
      updateConfig({
        class: defaultTemplate.class,
        name: defaultTemplate.name,
        role: defaultTemplate.role,
        alignment: defaultTemplate.alignment,
        background: defaultTemplate.background,
        stats: defaultTemplate.stats,
        traits: defaultTemplate.traits,
        companions: defaultTemplate.companions,
        rivals: defaultTemplate.rivals
      });
    }
  }, []);

  const updateConfig = (updates: Partial<CharacterConfig>) => {
    const config: CharacterConfig = {
      class: characterClass,
      name,
      role,
      alignment,
      background,
      stats,
      traits,
      companions,
      rivals,
      ...updates
    };
    onDataChange(config);
  };

  const handleTemplateSelect = (template: CharacterTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setCharacterClass(template.class);
    setRole(template.role);
    setAlignment(template.alignment);
    setBackground(template.background);
    setStats(template.stats);
    setTraits(template.traits);
    setCompanions(template.companions);
    setRivals(template.rivals);

    updateConfig({
      class: template.class,
      name: template.name,
      role: template.role,
      alignment: template.alignment,
      background: template.background,
      stats: template.stats,
      traits: template.traits,
      companions: template.companions,
      rivals: template.rivals
    });
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    updateConfig({ name: newName });
  };

  const handleBookTitleChange = (newTitle: string) => {
    setLocalBookTitle(newTitle);
    if (onBookTitleChange) {
      onBookTitleChange(newTitle);
    }
  };

  const handleRoleChange = (newRole: CharacterRole) => {
    setRole(newRole);
    updateConfig({ role: newRole });
  };

  const handleAlignmentChange = (newAlignment: Alignment) => {
    setAlignment(newAlignment);
    updateConfig({ alignment: newAlignment });
  };

  const handleStatChange = (stat: keyof CharacterStats, value: number) => {
    const newStats = { ...stats, [stat]: value };
    setStats(newStats);
    updateConfig({ stats: newStats });
  };

  const handleCompanionToggle = (companionId: string) => {
    const updatedCompanions = companions.map(c =>
      c.id === companionId ? { ...c, enabled: !c.enabled } : c
    );
    setCompanions(updatedCompanions);
    updateConfig({ companions: updatedCompanions });
  };

  const handleRivalToggle = (rivalId: string) => {
    const updatedRivals = rivals.map(r =>
      r.id === rivalId ? { ...r, enabled: !r.enabled } : r
    );
    setRivals(updatedRivals);
    updateConfig({ rivals: updatedRivals });
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold mb-3">Choose Your Character</h1>
        <p className="text-neutral-600 text-sm max-w-2xl mx-auto">
          Select a pre-built character template and customize it to make it your own.
        </p>
      </div>

      {/* Character Template Selection */}
      <div className="mb-6">
        <h3 className="text-base font-semibold mb-3">Character Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {characterTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className={`text-left p-3 md:p-4 rounded-lg transition-all ${
                selectedTemplate?.id === template.id
                  ? 'border-2 border-black bg-neutral-50 shadow-lg'
                  : 'border border-neutral-200 hover:border-neutral-400 hover:shadow-md'
              }`}
            >
              <div className="text-center mb-2">
                <span className="text-2xl md:text-3xl">{template.image}</span>
              </div>
              <h4 className="font-semibold text-sm md:text-base mb-1 text-center">{template.name}</h4>
              <p className="text-xs text-neutral-500 mb-2 text-center capitalize">
                {template.class.replace('_', ' ')} • {template.role}
              </p>
              <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">
                {template.backstory}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Customization Panel - Only show if template selected */}
      {selectedTemplate && (
        <>
          {/* Basic Info */}
          <div className="border-t border-neutral-200 pt-6 mb-6">
            <h3 className="text-base font-semibold mb-4">Customize Character</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Character Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="Enter character name..."
                />
              </div>

              {/* Book Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Book Title</label>
                <input
                  type="text"
                  value={localBookTitle}
                  onChange={(e) => handleBookTitleChange(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder={`${name}'s Adventure`}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Leave blank to auto-generate from character name
                </p>
              </div>

              {/* Class (Read-only, from template) */}
              <div>
                <label className="block text-sm font-medium mb-2">Class</label>
                <div className="w-full px-4 py-3 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-600 capitalize">
                  {characterClass.replace('_', ' ')}
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium mb-3">Role</label>
                <div className="flex gap-3">
                  {(['hero', 'antihero', 'neutral'] as CharacterRole[]).map(r => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`flex-1 px-4 py-3 rounded-lg capitalize transition-all ${
                        role === r
                          ? 'border-2 border-black bg-neutral-50 font-semibold'
                          : 'border border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alignment */}
              <div>
                <label className="block text-sm font-medium mb-3">Alignment</label>
                <select
                  value={alignment}
                  onChange={(e) => handleAlignmentChange(e.target.value as Alignment)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="lawful_good">Lawful Good</option>
                  <option value="neutral_good">Neutral Good</option>
                  <option value="chaotic_good">Chaotic Good</option>
                  <option value="lawful_neutral">Lawful Neutral</option>
                  <option value="true_neutral">True Neutral</option>
                  <option value="chaotic_neutral">Chaotic Neutral</option>
                  <option value="lawful_evil">Lawful Evil</option>
                  <option value="neutral_evil">Neutral Evil</option>
                  <option value="chaotic_evil">Chaotic Evil</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="border-t border-neutral-200 pt-6 mb-6">
            <h3 className="text-base font-semibold mb-4">Character Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(['strength', 'intelligence', 'agility', 'charisma'] as const).map(stat => (
                <div key={stat}>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium capitalize">{stat}</label>
                    <span className="text-sm font-semibold">{stats[stat]}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="18"
                    value={stats[stat]}
                    onChange={(e) => handleStatChange(stat, parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Companions */}
          {companions.length > 0 && (
            <div className="border-t border-neutral-200 pt-6 mb-6">
              <h3 className="text-base font-semibold mb-3">Companions</h3>
              <div className="space-y-4">
                {companions.map(companion => (
                  <div key={companion.id} className={`border rounded-lg p-4 transition-all ${
                    companion.enabled ? 'border-neutral-300 bg-white' : 'border-neutral-200 bg-neutral-50 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{companion.name}</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={companion.enabled}
                          onChange={() => handleCompanionToggle(companion.id)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 rounded-full peer peer-checked:bg-black peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </label>
                    </div>
                    <p className="text-sm text-neutral-600 mb-2">{companion.description}</p>
                    <div className="flex gap-2">
                      {companion.skills.map((skill, idx) => (
                        <span key={idx} className="text-xs bg-neutral-200 px-2 py-1 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rivals */}
          {rivals.length > 0 && (
            <div className="border-t border-neutral-200 pt-6">
              <h3 className="text-base font-semibold mb-3">Rivals</h3>
              <div className="space-y-4">
                {rivals.map(rival => (
                  <div key={rival.id} className={`border rounded-lg p-4 transition-all ${
                    rival.enabled ? 'border-neutral-300 bg-white' : 'border-neutral-200 bg-neutral-50 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{rival.name}</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rival.enabled}
                          onChange={() => handleRivalToggle(rival.id)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 rounded-full peer peer-checked:bg-black peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </label>
                    </div>
                    <p className="text-sm text-neutral-600 mb-1">{rival.description}</p>
                    <p className="text-xs text-neutral-500 italic">"{rival.conflict}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
