'use client';

import { useState, useEffect, useRef } from 'react';
import { QuestType, StoryConfig, Tone } from '@/lib/types/game';
import { ContentValidationResponse } from '@/lib/api';

interface StepFourProps {
  initialData?: Partial<StoryConfig> & { tone?: Tone };
  onDataChange: (data: Partial<StoryConfig> & { tone?: Tone }) => void;
  onGeneratePrologue: (questTemplate: QuestType, tone: Tone, customPrompt?: string) => Promise<void>;
  onValidatePrologue: (prologueText: string, questTemplate: QuestType, tone: Tone) => Promise<void>;
  prologueRef: React.RefObject<HTMLDivElement | null>;
  validationResults?: ContentValidationResponse | null;
}

const toneOptions = [
  {
    id: 'heroic' as Tone,
    icon: '🦸',
    title: 'Heroic',
    description: 'Grand, inspiring, classic fantasy adventure. Clear morality, epic quests, noble heroics.',
  },
  {
    id: 'comedic' as Tone,
    icon: '😄',
    title: 'Comedic',
    description: 'Light-hearted and witty, poking fun at fantasy tropes with humor and self-awareness.',
  },
  {
    id: 'dark' as Tone,
    icon: '🌑',
    title: 'Dark/Grimdark',
    description: 'Brutal, morally gray, gritty realism. Tough choices and harsh consequences.',
  },
  {
    id: 'slice_of_life' as Tone,
    icon: '☕',
    title: 'Slice of Life',
    description: 'Cozy, everyday moments. Low-stakes, relationship-focused, comforting vibes.',
  },
  {
    id: 'glitched_meta' as Tone,
    icon: '🔌',
    title: 'Glitched/Meta',
    description: 'Fourth-wall breaking, reality glitches, playful with game mechanics and systems.',
  }
];

const questTemplates = [
  {
    id: 'discovery' as QuestType,
    icon: '🗺️',
    title: 'Discovery',
    description: 'Uncover ancient secrets, explore forgotten ruins, and reveal hidden truths. Your journey is one of exploration and revelation.',
    examples: ['Find a lost artifact', 'Map uncharted territories', 'Decode ancient prophecies']
  },
  {
    id: 'rescue' as QuestType,
    icon: '🆘',
    title: 'Rescue',
    description: 'Someone needs saving. Race against time to rescue the innocent, recover what was taken, or free the imprisoned.',
    examples: ['Save a kidnapped ally', 'Free a captured town', 'Rescue hostages from bandits']
  },
  {
    id: 'revenge' as QuestType,
    icon: '⚡',
    title: 'Revenge',
    description: 'Right a terrible wrong. Hunt those who hurt you, seek justice for the fallen, and settle old scores.',
    examples: ['Avenge a fallen mentor', 'Hunt the ones who destroyed your village', 'Settle a blood debt']
  },
  {
    id: 'conquest' as QuestType,
    icon: '⚔️',
    title: 'Conquest',
    description: 'Claim power through strength. Conquer territories, defeat rival factions, or overthrow tyrants.',
    examples: ['Siege an enemy fortress', 'Unite warring clans', 'Overthrow a corrupt ruler']
  },
  {
    id: 'mystery' as QuestType,
    icon: '🔍',
    title: 'Mystery',
    description: 'Solve the unsolvable. Investigate strange occurrences, track down criminals, or unravel conspiracies.',
    examples: ['Solve a series of murders', 'Investigate a supernatural phenomenon', 'Uncover a political conspiracy']
  }
];

export default function StepFour({ initialData, onDataChange, onGeneratePrologue, onValidatePrologue, prologueRef, validationResults }: StepFourProps) {
  const defaultTone: Tone = 'heroic';
  const defaultQuest: QuestType = 'discovery';

  const [selectedQuest, setSelectedQuest] = useState<QuestType>(initialData?.questType || defaultQuest);
  const [selectedTone, setSelectedTone] = useState<Tone>(initialData?.tone || defaultTone);
  const [generatedPrologue, setGeneratedPrologue] = useState<string>(
    initialData?.prologue?.generatedPrologue || ''
  );
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Pre-select defaults on mount
  useEffect(() => {
    console.log('[StepFour] Mount useEffect', {
      hasQuestType: !!initialData?.questType,
      hasTone: !!initialData?.tone,
      defaultQuest,
      defaultTone
    });

    if (!initialData?.questType || !initialData?.tone) {
      console.log('[StepFour] Pre-selecting defaults');
      onDataChange({
        questType: defaultQuest,
        tone: defaultTone
      });
    }
  }, []);

  const handleQuestSelect = (questType: QuestType) => {
    setSelectedQuest(questType);
    onDataChange({ questType, tone: selectedTone });
  };

  const handleToneSelect = (tone: Tone) => {
    setSelectedTone(tone);
    onDataChange({ questType: selectedQuest, tone });
  };

  const handleGeneratePrologue = async () => {
    if (!selectedQuest || !selectedTone) return;

    setIsGenerating(true);
    try {
      await onGeneratePrologue(selectedQuest, selectedTone, customPrompt || undefined);
      // Note: The parent component should update initialData.prologue, which will update generatedPrologue
      setCustomPrompt(''); // Clear custom prompt after generation
      setIsEditing(false);

      // Scroll to prologue after generation
      setTimeout(() => {
        prologueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error('Failed to generate prologue:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrologueEdit = (newPrologue: string) => {
    setGeneratedPrologue(newPrologue);
    onDataChange({
      questType: selectedQuest,
      tone: selectedTone,
      prologue: {
        questTemplate: selectedQuest!,
        generatedPrologue: newPrologue,
        customPrompt
      }
    });
  };

  const handleValidate = async () => {
    if (!selectedQuest || !selectedTone || !generatedPrologue) return;

    setIsValidating(true);
    try {
      await onValidatePrologue(generatedPrologue, selectedQuest, selectedTone);
    } catch (error) {
      console.error('Failed to validate prologue:', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Update local state when initialData changes (from parent)
  useEffect(() => {
    if (initialData?.prologue?.generatedPrologue) {
      setGeneratedPrologue(initialData.prologue.generatedPrologue);
    }
  }, [initialData?.prologue?.generatedPrologue]);

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-3">Quest & Narrator Tone</h1>
        <p className="text-neutral-600 text-sm max-w-2xl mx-auto">
          Choose your quest type and narrator tone, then generate your opening prologue.
        </p>
      </div>

      {/* AI Narrator Tone Selection */}
      <div className="mb-6">
        <h3 className="text-base font-semibold mb-3">AI Narrator Tone</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {toneOptions.map((tone) => (
            <button
              key={tone.id}
              onClick={() => handleToneSelect(tone.id)}
              className={`text-left p-3 rounded-lg transition-all ${
                selectedTone === tone.id
                  ? 'border-2 border-black bg-neutral-50 shadow-lg'
                  : 'border border-neutral-200 hover:border-neutral-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xl">{tone.icon}</span>
                <h3 className="text-xs font-semibold">{tone.title}</h3>
              </div>
              <p className="text-xs text-neutral-600 leading-snug line-clamp-2">
                {tone.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Quest Template Selection */}
      <div className="mb-6">
        <h3 className="text-base font-semibold mb-3">Quest Template</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {questTemplates.map(quest => (
            <button
              key={quest.id}
              onClick={() => handleQuestSelect(quest.id)}
              className={`p-3 md:p-4 rounded-lg text-left transition-all ${
                selectedQuest === quest.id
                  ? 'border-2 border-black bg-neutral-50 shadow-lg'
                  : 'border border-neutral-200 hover:border-neutral-400 hover:shadow-md'
              }`}
            >
              <div className="text-center mb-2">
                <span className="text-2xl md:text-3xl">{quest.icon}</span>
              </div>
              <h4 className="font-semibold text-center mb-1 text-xs md:text-sm">{quest.title}</h4>
              <p className="text-xs text-neutral-600 mb-2 leading-snug line-clamp-2">
                {quest.description}
              </p>
            </button>
          ))}
        </div>
      </div>


      {/* Prologue Generation Area */}
      {generatedPrologue && (
        <div ref={prologueRef} className="border-t border-neutral-200 pt-6">
          <h3 className="text-base font-semibold mb-3">Your Opening Prologue</h3>

          {/* Loading State */}
          {isGenerating && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
              <p className="text-neutral-600">Generating your prologue...</p>
              <p className="text-sm text-neutral-500 mt-2">This may take a few moments</p>
            </div>
          )}

          {/* Generated Prologue */}
          {!isGenerating && generatedPrologue && (
            <div className="space-y-4">
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-sm font-semibold text-neutral-700">
                    {isEditing ? 'Editing Prologue' : 'Generated Prologue'}
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleValidate}
                      disabled={isValidating}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors border border-neutral-300 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isValidating ? '⏳ Validating...' : '🔍 Validate'}
                    </button>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors border border-neutral-300 hover:bg-neutral-100"
                    >
                      {isEditing ? '✓ Done Editing' : '✏️ Edit'}
                    </button>
                  </div>
                </div>
                {isEditing ? (
                  <textarea
                    value={generatedPrologue}
                    onChange={(e) => handlePrologueEdit(e.target.value)}
                    className="w-full h-64 px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500 font-serif leading-relaxed resize-none"
                    placeholder="Edit your prologue..."
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap font-serif">
                      {generatedPrologue}
                    </p>
                  </div>
                )}
              </div>

              {/* Validation Results */}
              {validationResults && (
                <div className="border border-neutral-200 rounded-lg p-5 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-neutral-800">AI Quality Validation</h4>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      validationResults.overall_status === 'PASS' ? 'bg-green-100 text-green-800' :
                      validationResults.overall_status === 'MINOR_ISSUES' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {validationResults.overall_status === 'PASS' ? '✓ Excellent' :
                       validationResults.overall_status === 'MINOR_ISSUES' ? '⚠ Good' : '✗ Needs Work'}
                      {' '}({validationResults.overall_score}/100)
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    {[
                      { label: 'World', data: validationResults.world_consistency },
                      { label: 'Character', data: validationResults.character_consistency },
                      { label: 'Tone', data: validationResults.narrator_tone },
                      { label: 'Quest', data: validationResults.quest_alignment },
                      { label: 'Mode', data: validationResults.story_mode }
                    ].map(({ label, data }) => (
                      <div key={label} className="text-center p-2 bg-neutral-50 rounded border border-neutral-200">
                        <div className="text-xs font-medium text-neutral-600 mb-1">{label}</div>
                        <div className={`text-lg font-bold ${
                          data.status === 'PASS' ? 'text-green-600' :
                          data.status === 'MINOR_ISSUES' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {data.score}
                        </div>
                      </div>
                    ))}
                  </div>

                  {(validationResults.overall_status !== 'PASS' && validationResults.suggested_improvements !== 'None - content is excellent') && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-yellow-900 mb-1">Suggestions:</p>
                      <p className="text-xs text-yellow-800">{validationResults.suggested_improvements}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Regeneration Options */}
              <div className="border-t border-neutral-200 pt-6 mt-6">
                <h4 className="font-semibold mb-3 text-sm">Want to regenerate?</h4>
                <p className="text-sm text-neutral-600 mb-4">
                  Provide optional instructions to customize the prologue (e.g., "Make it more mysterious", "Start in a tavern", "Add more action")
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Optional: How would you like to modify it?"
                    className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500 text-sm"
                  />
                  <button
                    onClick={handleGeneratePrologue}
                    disabled={isGenerating}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? 'Generating...' : '🔄 Regenerate'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
