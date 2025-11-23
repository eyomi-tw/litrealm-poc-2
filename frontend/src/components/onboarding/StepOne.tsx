'use client';

import { useState, useEffect } from 'react';
import { StoryMode } from '@/lib/types/game';

interface StepOneProps {
  initialData?: {
    mode?: StoryMode;
  };
  onDataChange: (data: { mode: StoryMode }) => void;
}

export default function StepOne({ initialData, onDataChange }: StepOneProps) {
  const defaultMode: StoryMode = 'dungeon_crawl';
  const [mode, setMode] = useState<StoryMode>(initialData?.mode || defaultMode);

  // Pre-select default mode on mount
  useEffect(() => {
    if (!initialData?.mode) {
      onDataChange({ mode: defaultMode });
    }
  }, []);

  const handleModeSelect = (selectedMode: StoryMode) => {
    setMode(selectedMode);
    onDataChange({ mode: selectedMode });
  };

  const modes = [
    {
      id: 'progression' as StoryMode,
      icon: '⚔️',
      title: 'Progression Mode',
      description: 'Classic leveling system with skill trees and character growth. Perfect for traditional RPG fans who love seeing their character evolve through combat, exploration, and story.',
      tags: ['Leveling', 'Skill Trees', 'Character Growth']
    },
    {
      id: 'dungeon_crawl' as StoryMode,
      icon: '🏰',
      title: 'Dungeon Crawl',
      description: 'Hardcore dungeon exploration with lots of loot, traps, and monster encounters. Combat-heavy gameplay with tactical decisions and treasure hunting.',
      tags: ['Combat-Heavy', 'Loot', 'Tactical'],
      recommended: true
    },
    {
      id: 'survival_quest' as StoryMode,
      icon: '🔥',
      title: 'Survival Quest',
      description: 'Resource management is key - track health, mana, and supplies carefully. Every decision matters for survival in this tension-filled adventure.',
      tags: ['Resource Management', 'High Stakes', 'Challenging']
    },
    {
      id: 'campaign' as StoryMode,
      icon: '📖',
      title: 'Campaign Mode',
      description: 'Epic, multi-arc storylines with major plot developments and memorable story beats. For players who want an immersive, story-driven experience with sweeping narrative scope.',
      tags: ['Story-Driven', 'Epic Scale', 'Multiple Arcs']
    },
    {
      id: 'solo' as StoryMode,
      icon: '✍️',
      title: 'Solo Mode',
      description: 'Personal journal-style adventures focused on character introspection and everyday moments. Lower stakes, relationship-building, and slice-of-life storytelling.',
      tags: ['Personal', 'Introspective', 'Cozy']
    },
    {
      id: 'legacy' as StoryMode,
      icon: '🌳',
      title: 'Legacy Mode',
      description: 'Multi-generational world-building where your choices create lasting impact. Build a dynasty, shape civilizations, and watch your legacy unfold across time.',
      tags: ['Multi-Generational', 'World-Building', 'Long-Term']
    }
  ];

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold mb-3">Choose Your Story Mode</h1>
        <p className="text-neutral-600 text-sm max-w-2xl mx-auto">
          Select the gameplay structure that matches your playstyle and how you want your adventure to unfold.
        </p>
      </div>

      {/* Story Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {modes.map((modeOption) => (
          <button
            key={modeOption.id}
            onClick={() => handleModeSelect(modeOption.id)}
            className={`text-left p-3 md:p-4 rounded-lg transition-all relative ${
              mode === modeOption.id
                ? 'border-2 border-black bg-neutral-50 shadow-lg'
                : 'border border-neutral-200 hover:border-neutral-400 hover:shadow-md'
            }`}
          >
            {modeOption.recommended && (
              <div className="absolute top-2 right-2">
                <span className="text-xs bg-black text-white px-2 py-1 rounded">
                  Popular
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl md:text-2xl">{modeOption.icon}</span>
              <h3 className="text-sm md:text-base font-semibold">{modeOption.title}</h3>
            </div>
            <p className="text-neutral-600 mb-3 text-xs leading-relaxed">
              {modeOption.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {modeOption.tags.map((tag, idx) => (
                <span key={idx} className="text-xs bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
