'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingLayout from '@/components/layouts/OnboardingLayout';
import StepOne from '@/components/onboarding/StepOne';
import StepTwo from '@/components/onboarding/StepTwo';
import StepThree from '@/components/onboarding/StepThree';
import StepFour from '@/components/onboarding/StepFour';
import { GameConfig, QuestType, QuestComplexity, SceneCreationMethod, TimeOfDay } from '@/lib/types/game';
import { submitOnboarding, generatePrologue, validateContent } from '@/lib/api';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OnboardingStepPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const stepNumber = parseInt(id);
  const totalSteps = 4;

  const [draftConfig, setDraftConfig] = useState<Partial<GameConfig>>({});
  const [bookTitle, setBookTitle] = useState<string>('');
  const [canContinue, setCanContinue] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isGeneratingPrologue, setIsGeneratingPrologue] = useState(false);
  const [lastError, setLastError] = useState<string>('');
  const [validationResults, setValidationResults] = useState<any>(null);
  const prologueRef = useRef<HTMLDivElement>(null);

  // Load draft config from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('onboarding_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDraftConfig(parsed);
        if (parsed.bookTitle) {
          setBookTitle(parsed.bookTitle);
        }
      } catch (e) {
        console.error('Failed to load draft config', e);
      }
    }
  }, []);


  // Handle continue to next step
  const handleContinue = async () => {
    console.log('[OnboardingPage] handleContinue called', {
      stepNumber,
      canContinue,
      isGeneratingPrologue,
      isLaunching,
      hasPrologue: !!(draftConfig.story?.prologue?.generatedPrologue)
    });

    if (stepNumber < totalSteps) {
      router.push(`/onboarding/step/${stepNumber + 1}`);
    } else {
      // Final step (Step 4) - check if prologue exists
      const hasPrologue = !!(draftConfig.story?.prologue?.generatedPrologue);
      console.log('[OnboardingPage] Step 4 - prologue check', { hasPrologue });

      if (!hasPrologue) {
        // Generate prologue first
        console.log('[OnboardingPage] Starting prologue generation');
        setIsGeneratingPrologue(true);
        setLastError('');
        try {
          await handleGeneratePrologue(
            draftConfig.story?.questType || 'discovery',
            draftConfig.tone || 'heroic'
          );
          console.log('[OnboardingPage] Prologue generation complete');
          // Scroll to prologue after generation
          setTimeout(() => {
            prologueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 200);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[OnboardingPage] Prologue generation failed', errorMsg);
          setLastError(`API Error: ${errorMsg}`);
        } finally {
          setIsGeneratingPrologue(false);
        }
      } else {
        // Launch adventure
        console.log('[OnboardingPage] Launching adventure');
        handleLaunchAdventure();
      }
    }
  };

  // Step 1 specific handlers
  const handleStepOneData = (data: any) => {
    const updated = { ...draftConfig, mode: data.mode };
    setDraftConfig(updated);
    localStorage.setItem('onboarding_draft', JSON.stringify(updated));
    setCanContinue(true);
  };

  // Step 2 specific handlers
  const handleStepTwoData = (data: any) => {
    const updated = { ...draftConfig, world: data };
    setDraftConfig(updated);
    localStorage.setItem('onboarding_draft', JSON.stringify(updated));
    setCanContinue(true);
  };

  // Step 3 specific handlers
  const handleStepThreeData = (data: any) => {
    const updated = { ...draftConfig, character: data };
    setDraftConfig(updated);
    localStorage.setItem('onboarding_draft', JSON.stringify(updated));
    setCanContinue(true);
  };

  const handleBookTitleChange = (title: string) => {
    setBookTitle(title);
    const updated = { ...draftConfig, bookTitle: title };
    setDraftConfig(updated);
    localStorage.setItem('onboarding_draft', JSON.stringify(updated));
  };

  // Step 4 specific handlers
  const handleStepFourData = (data: any) => {
    console.log('[OnboardingPage] handleStepFourData called', { data });

    // Ensure story has all required fields with defaults
    const storyData = {
      questType: (data.questType || draftConfig.story?.questType || 'discovery') as QuestType,
      complexity: 'branching' as QuestComplexity,
      sceneCreationMethod: 'custom_with_ai' as SceneCreationMethod,
      openingScene: data.prologue?.generatedPrologue || 'Your adventure begins...',
      sceneLocation: 'Starting Location',
      timeOfDay: 'dawn' as TimeOfDay,
      mood: [],
      decisionPoints: [],
      questPaths: [],
      prologue: data.prologue || draftConfig.story?.prologue
    };

    const updated = {
      ...draftConfig,
      story: storyData,
      tone: data.tone || draftConfig.tone
    };
    setDraftConfig(updated);
    localStorage.setItem('onboarding_draft', JSON.stringify(updated));

    // Enable button if quest and tone are selected
    const hasSelections = !!(data.questType && data.tone);
    console.log('[OnboardingPage] Step 4 canContinue update', {
      hasSelections,
      questType: data.questType,
      tone: data.tone
    });
    setCanContinue(hasSelections);
  };

  // Validation handler for manually edited prologues
  const handleValidatePrologue = async (prologueText: string, questTemplate: any, tone: any) => {
    try {
      const validationResponse = await validateContent({
        content: prologueText,
        content_type: 'prologue',
        mode: draftConfig.mode || 'progression',
        tone: tone,
        world_template: draftConfig.world?.template || 'Unknown',
        world_name: draftConfig.world?.name || 'The Realm',
        magic_system: draftConfig.world?.magicSystem || 'on',
        world_tone: draftConfig.world?.worldTone || 'heroic',
        character_name: draftConfig.character?.name || 'Adventurer',
        character_class: draftConfig.character?.class || 'warrior',
        background: draftConfig.character?.background || 'unknown',
        alignment: draftConfig.character?.alignment || 'neutral_good',
        character_role: draftConfig.character?.role || 'hero',
        quest_template: questTemplate
      });

      setValidationResults(validationResponse);
      console.log('[Manual Prologue Validation]', validationResponse);
    } catch (error) {
      console.error('Failed to validate prologue:', error);
      throw error;
    }
  };

  // Prologue generation handler for Step 4
  const handleGeneratePrologue = async (questTemplate: any, tone: any, customPrompt?: string) => {
    try {
      // Build request with all onboarding context for stateless generation
      const response = await generatePrologue({
        quest_template: questTemplate,
        custom_prompt: customPrompt,
        // Pass onboarding data for context
        mode: draftConfig.mode,
        tone: tone,
        world_template: draftConfig.world?.template,
        world_name: draftConfig.world?.name,
        magic_system: draftConfig.world?.magicSystem,
        world_tone: draftConfig.world?.worldTone,
        character_name: draftConfig.character?.name,
        character_class: draftConfig.character?.class,
        background: draftConfig.character?.background,
        alignment: draftConfig.character?.alignment,
        character_role: draftConfig.character?.role
      });

      // Store validation results if available
      if (response.validation) {
        setValidationResults(response.validation);
        console.log('[Prologue Validation]', response.validation);
      }

      // Update draft config with generated prologue and tone
      // Ensure story has all required fields
      const updated = {
        ...draftConfig,
        tone: tone,
        story: {
          questType: questTemplate,
          complexity: 'branching',
          sceneCreationMethod: 'custom_with_ai',
          openingScene: response.prologue,
          sceneLocation: 'Starting Location',
          timeOfDay: 'dawn',
          mood: [],
          decisionPoints: [],
          questPaths: [],
          prologue: {
            questTemplate: response.quest_template,
            generatedPrologue: response.prologue,
            customPrompt: customPrompt
          }
        }
      } as Partial<GameConfig>;
      setDraftConfig(updated);
      localStorage.setItem('onboarding_draft', JSON.stringify(updated));
      // Enable Launch button once prologue is generated
      setCanContinue(true);
    } catch (error) {
      console.error('Failed to generate prologue:', error);
      throw error;
    }
  };

  // Handle final launch - submit onboarding to backend
  const handleLaunchAdventure = async () => {
    setIsLaunching(true);

    try {
      // Prepare complete GameConfig (add defaults for missing fields)
      const completeConfig: GameConfig = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        mode: draftConfig.mode || 'progression',
        tone: draftConfig.tone || 'heroic',
        world: draftConfig.world || {
          template: 'arcane_empire',
          name: 'Default World',
          magicSystem: 'on',
          worldTone: 'heroic',
          factions: []
        },
        character: draftConfig.character || {
          class: 'arcblade',
          name: 'Hero',
          role: 'hero',
          alignment: 'neutral_good',
          background: 'noble_born',
          stats: {
            strength: 8,
            intelligence: 6,
            agility: 7,
            charisma: 5,
            reputation: 4,
            hp: 100,
            max_hp: 100
          },
          traits: [],
          companions: [],
          rivals: []
        },
        story: draftConfig.story || {
          questType: 'discovery',
          complexity: 'branching',
          sceneCreationMethod: 'custom_with_ai',
          openingScene: 'Your adventure begins...',
          sceneLocation: 'Starting Location',
          timeOfDay: 'dawn',
          mood: [],
          decisionPoints: [],
          questPaths: []
        },
        settings: {
          sessionDuration: 60,
          difficultyModifier: 0,
          autoSave: true,
          narratorSpeed: 'normal'
        },
        bookTitle: bookTitle || undefined  // Include custom book title if provided
      };

      // Submit to backend
      const response = await submitOnboarding(completeConfig);

      // Clear onboarding data from localStorage
      localStorage.removeItem('onboarding_draft');

      // Navigate to chapter page instead of old gameplay page
      router.push(`/book/${response.book_id}/chapter/${response.chapter_id}`);
    } catch (error) {
      console.error('Error submitting onboarding:', error);
      alert('Failed to initialize game. Please check that the backend is running.');
      setIsLaunching(false);
    }
  };

  // Render appropriate step
  const renderStep = () => {
    switch (stepNumber) {
      case 1:
        return (
          <StepOne
            initialData={{
              mode: draftConfig.mode
            }}
            onDataChange={handleStepOneData}
          />
        );

      case 2:
        return (
          <StepTwo
            initialData={draftConfig.world}
            onDataChange={handleStepTwoData}
          />
        );
      case 3:
        return (
          <StepThree
            initialData={draftConfig.character}
            onDataChange={handleStepThreeData}
            bookTitle={bookTitle}
            onBookTitleChange={handleBookTitleChange}
          />
        );
      case 4:
        return (
          <StepFour
            initialData={{
              ...draftConfig.story,
              tone: draftConfig.tone
            }}
            onDataChange={handleStepFourData}
            onGeneratePrologue={handleGeneratePrologue}
            onValidatePrologue={handleValidatePrologue}
            prologueRef={prologueRef}
            validationResults={validationResults}
          />
        );
      default:
        return <div className="text-center py-12 text-neutral-600">Invalid step</div>;
    }
  };

  const stepLabels: Record<number, string> = {
    1: 'Story Mode',
    2: 'World Selection',
    3: 'Character Template',
    4: 'Quest & Narrator Tone'
  };

  // Determine button label for step 4
  const getContinueLabel = () => {
    if (stepNumber < totalSteps) {
      return 'Continue';
    }

    // Step 4: Check if prologue exists
    const hasPrologue = !!(draftConfig.story?.prologue?.generatedPrologue);

    if (isGeneratingPrologue) {
      return '✨ Generating...';
    }

    if (isLaunching) {
      return 'Launching...';
    }

    const label = hasPrologue ? '🚀 Launch Adventure' : '✨ Generate Prologue';
    console.log('[OnboardingPage] getContinueLabel', { label, hasPrologue, isGeneratingPrologue, isLaunching });
    return label;
  };

  return (
    <OnboardingLayout
      currentStep={stepNumber}
      totalSteps={totalSteps}
      stepLabel={stepLabels[stepNumber] || 'Onboarding'}
      onContinue={handleContinue}
      canContinue={canContinue && !isGeneratingPrologue && !isLaunching}
      hideBack={stepNumber === 1}
      continueLabel={getContinueLabel()}
      debugInfo={{
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        lastError,
        isGenerating: isGeneratingPrologue
      }}
    >
      {renderStep()}
    </OnboardingLayout>
  );
}
