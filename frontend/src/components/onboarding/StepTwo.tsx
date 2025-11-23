'use client';

import { useState, useEffect } from 'react';
import {
  WorldConfig,
  MagicSystem,
  WorldTone,
  Faction
} from '@/lib/types/game';

interface StepTwoProps {
  initialData?: Partial<WorldConfig>;
  onDataChange: (data: WorldConfig) => void;
}

interface WorldTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  tags: string[];
  defaults: Partial<WorldConfig>;
}

const worldTemplates: WorldTemplate[] = [
  {
    id: 'arcane_empire',
    name: 'Arcane Empire',
    icon: '🏰',
    description: 'A high-fantasy realm where magic pulses through every stone. Mages rule from crystalline towers, ancient spells shape the land, and mystical academies train wizards.',
    tags: ['High Magic', 'Political Intrigue', 'Heroic'],
    defaults: {
      template: 'arcane_empire',
      name: 'Arcane Empire',
      magicSystem: 'on',
      worldTone: 'heroic',
      factions: [
        {
          id: 'iron_crown',
          name: 'The Iron Crown',
          description: 'Royal military faction controlling major cities',
          influence: 'high',
          hostility: 'moderate',
          enabled: true
        },
        {
          id: 'mystic_circle',
          name: 'Mystic Circle',
          description: 'Secretive mage guild with hidden agendas',
          influence: 'moderate',
          hostility: 'low',
          enabled: true
        }
      ]
    }
  },
  {
    id: 'mecharena',
    name: 'MechArena',
    icon: '🤖',
    description: 'A dystopian future where pilots compete in massive mech battles. Corporate sponsors, underground tournaments, and cutting-edge tech define this world.',
    tags: ['Sci-Fi', 'Combat-Heavy', 'Gritty'],
    defaults: {
      template: 'mecharena',
      name: 'MechArena',
      magicSystem: 'off',
      worldTone: 'gritty',
      factions: [
        {
          id: 'corporate_league',
          name: 'Corporate League',
          description: 'Mega-corporations funding mech tournaments',
          influence: 'high',
          hostility: 'moderate',
          enabled: true
        }
      ]
    }
  },
  {
    id: 'digital_wastes',
    name: 'Digital Wastes',
    icon: '💾',
    description: 'A cyberpunk wasteland where reality and virtual space blur. Hackers navigate corrupt megacities, AI runs wild, and data is the ultimate currency.',
    tags: ['Cyberpunk', 'Hacking', 'Dark'],
    defaults: {
      template: 'digital_wastes',
      name: 'Digital Wastes',
      magicSystem: 'off',
      worldTone: 'gritty',
      factions: [
        {
          id: 'net_runners',
          name: 'NetRunners Collective',
          description: 'Elite hacker group fighting corporate control',
          influence: 'moderate',
          hostility: 'low',
          enabled: true
        }
      ]
    }
  },
  {
    id: 'skyborn_isles',
    name: 'Skyborn Isles',
    icon: '⛅',
    description: 'Floating islands connected by airship routes, home to sky pirates and wind mages. Treasure hunts, aerial combat, and exploration of ancient sky ruins.',
    tags: ['Adventure', 'Exploration', 'Comedic'],
    defaults: {
      template: 'skyborn_isles',
      name: 'Skyborn Isles',
      magicSystem: 'on',
      worldTone: 'comedic',
      factions: [
        {
          id: 'sky_pirates',
          name: 'Sky Pirates Guild',
          description: 'Daring airship crews seeking treasure and adventure',
          influence: 'moderate',
          hostility: 'moderate',
          enabled: true
        }
      ]
    }
  },
  {
    id: 'rooted_wild',
    name: 'The Rooted Wild',
    icon: '🌿',
    description: 'Primal forests and ancient groves where nature spirits dwell. Druids, beast-kin, and shamans live in harmony with the land, protecting it from those who would exploit it.',
    tags: ['Nature', 'Spirits', 'Mystical'],
    defaults: {
      template: 'rooted_wild',
      name: 'The Rooted Wild',
      magicSystem: 'on',
      worldTone: 'heroic',
      factions: [
        {
          id: 'grove_keepers',
          name: 'Grove Keepers',
          description: 'Ancient druids protecting sacred forests',
          influence: 'high',
          hostility: 'low',
          enabled: true
        },
        {
          id: 'beast_kin',
          name: 'Beast-Kin Tribes',
          description: 'Shapeshifters and animal companions of the wild',
          influence: 'moderate',
          hostility: 'low',
          enabled: true
        }
      ]
    }
  }
];

export default function StepTwo({ initialData, onDataChange }: StepTwoProps) {
  const defaultTemplate = worldTemplates[0]; // Arcane Empire
  const [selectedTemplate, setSelectedTemplate] = useState<WorldTemplate>(
    worldTemplates.find(t => t.id === initialData?.template) || defaultTemplate
  );

  const [worldName, setWorldName] = useState(initialData?.name || selectedTemplate.defaults.name || '');
  const [magicSystem, setMagicSystem] = useState<MagicSystem>(initialData?.magicSystem || selectedTemplate.defaults.magicSystem || 'on');
  const [worldTone, setWorldTone] = useState<WorldTone>(initialData?.worldTone || selectedTemplate.defaults.worldTone || 'heroic');
  const [factions, setFactions] = useState<Faction[]>(initialData?.factions || selectedTemplate.defaults.factions || []);

  const updateConfig = (updates: Partial<WorldConfig>) => {
    const config: WorldConfig = {
      template: selectedTemplate.id,
      name: worldName,
      magicSystem,
      worldTone,
      factions,
      ...updates
    };
    onDataChange(config);
  };

  // Pre-select default template on mount
  useEffect(() => {
    if (!initialData) {
      updateConfig({
        template: defaultTemplate.id,
        name: defaultTemplate.defaults.name,
        magicSystem: defaultTemplate.defaults.magicSystem,
        worldTone: defaultTemplate.defaults.worldTone,
        factions: defaultTemplate.defaults.factions
      });
    }
  }, []);

  const handleTemplateSelect = (template: WorldTemplate) => {
    setSelectedTemplate(template);
    setWorldName(template.defaults.name || '');
    setMagicSystem(template.defaults.magicSystem || 'on');
    setWorldTone(template.defaults.worldTone || 'heroic');
    setFactions(template.defaults.factions || []);

    updateConfig({
      template: template.id,
      name: template.defaults.name,
      magicSystem: template.defaults.magicSystem,
      worldTone: template.defaults.worldTone,
      factions: template.defaults.factions
    });
  };

  const handleWorldNameChange = (name: string) => {
    setWorldName(name);
    updateConfig({ name });
  };

  const handleMagicSystemToggle = () => {
    const newSystem: MagicSystem = magicSystem === 'on' ? 'off' : 'on';
    setMagicSystem(newSystem);
    updateConfig({ magicSystem: newSystem });
  };

  const handleWorldToneChange = (tone: WorldTone) => {
    setWorldTone(tone);
    updateConfig({ worldTone: tone });
  };

  const handleFactionToggle = (factionId: string) => {
    const updatedFactions = factions.map(f =>
      f.id === factionId ? { ...f, enabled: !f.enabled } : f
    );
    setFactions(updatedFactions);
    updateConfig({ factions: updatedFactions });
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold mb-3">Choose Your World</h1>
        <p className="text-neutral-600 text-sm max-w-2xl mx-auto">
          Select a pre-built world template and customize it to create your perfect setting.
        </p>
      </div>

      {/* World Template Selection */}
      <div className="mb-6">
        <h3 className="text-base font-semibold mb-3">World Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {worldTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className={`text-left p-3 md:p-4 rounded-lg transition-all ${
                selectedTemplate.id === template.id
                  ? 'border-2 border-black bg-neutral-50 shadow-lg'
                  : 'border border-neutral-200 hover:border-neutral-400 hover:shadow-md'
              }`}
            >
              <div className="text-center mb-2">
                <span className="text-2xl md:text-3xl">{template.icon}</span>
              </div>
              <h4 className="font-semibold text-sm md:text-base mb-1 text-center">{template.name}</h4>
              <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2 mb-2">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-1 justify-center">
                {template.tags.map((tag, idx) => (
                  <span key={idx} className="text-xs bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Customize World */}
      <div className="border-t border-neutral-200 pt-6 mb-6">
        <h3 className="text-base font-semibold mb-4">Customize World</h3>
        <div className="space-y-6">
          {/* World Name */}
          <div>
            <label className="block text-sm font-medium mb-2">World Name</label>
            <input
              type="text"
              value={worldName}
              onChange={(e) => handleWorldNameChange(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
              placeholder="Enter a custom world name..."
            />
          </div>

          {/* Magic System Toggle */}
          <div>
            <label className="block text-sm font-medium mb-3">Magic System</label>
            <button
              onClick={handleMagicSystemToggle}
              className={`flex items-center justify-between w-full md:w-auto px-6 py-4 rounded-lg border-2 transition-all ${
                magicSystem === 'on'
                  ? 'border-black bg-neutral-50'
                  : 'border-neutral-300 bg-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{magicSystem === 'on' ? '✨' : '🚫'}</span>
                <div className="text-left">
                  <div className="font-semibold">
                    {magicSystem === 'on' ? 'Magic Enabled' : 'No Magic'}
                  </div>
                  <div className="text-sm text-neutral-600">
                    {magicSystem === 'on' ? 'Magic is present in this world' : 'Purely mundane world'}
                  </div>
                </div>
              </div>
              <div className={`ml-4 w-12 h-6 rounded-full transition-colors ${
                magicSystem === 'on' ? 'bg-black' : 'bg-neutral-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                  magicSystem === 'on' ? 'translate-x-6 mt-0.5 ml-0.5' : 'translate-x-0.5 mt-0.5'
                }`}></div>
              </div>
            </button>
          </div>

          {/* World Tone */}
          <div>
            <label className="block text-sm font-medium mb-3">World Tone</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['heroic', 'gritty', 'comedic'] as WorldTone[]).map((tone) => (
                <button
                  key={tone}
                  onClick={() => handleWorldToneChange(tone)}
                  className={`p-4 rounded-lg text-left transition-all ${
                    worldTone === tone
                      ? 'border-2 border-black bg-neutral-50'
                      : 'border border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <h4 className="font-semibold capitalize mb-1">{tone}</h4>
                  <p className="text-xs text-neutral-600">
                    {tone === 'heroic' && 'Triumphant adventures and noble quests'}
                    {tone === 'gritty' && 'Dark realism with moral complexity'}
                    {tone === 'comedic' && 'Lighthearted and humorous setting'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Factions */}
      {factions.length > 0 && (
        <div className="border-t border-neutral-200 pt-8">
          <h3 className="text-lg font-semibold mb-4">Factions & Powers</h3>
          <p className="text-sm text-neutral-600 mb-4">Toggle factions on/off to customize the political landscape.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {factions.map(faction => (
              <div key={faction.id} className={`border rounded-lg p-4 transition-all ${
                faction.enabled ? 'border-neutral-300 bg-white' : 'border-neutral-200 bg-neutral-50 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{faction.name}</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={faction.enabled}
                      onChange={() => handleFactionToggle(faction.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                <p className="text-sm text-neutral-600 mb-2">{faction.description}</p>
                <div className="text-xs text-neutral-500">
                  Influence: {faction.influence} | Hostility: {faction.hostility}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
