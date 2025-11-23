'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../shared/Header';
import ProgressBar from '../shared/ProgressBar';
import Button from '../shared/Button';
import DebugOverlay from '../shared/DebugOverlay';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  onBack?: () => void;
  onContinue: () => void;
  canContinue?: boolean;
  hideBack?: boolean;
  continueLabel?: string;
  debugInfo?: {
    apiUrl?: string;
    lastError?: string;
    isGenerating?: boolean;
  };
}

export default function OnboardingLayout({
  children,
  currentStep,
  totalSteps,
  stepLabel,
  onBack,
  onContinue,
  canContinue = true,
  hideBack = false,
  continueLabel = 'Continue',
  debugInfo
}: OnboardingLayoutProps) {
  const router = useRouter();
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState<string>('');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (currentStep > 1) {
      router.push(`/onboarding/step/${currentStep - 1}`);
    }
  };

  const handleContinueClick = () => {
    const now = new Date().toISOString().split('T')[1];
    setClickCount(prev => prev + 1);
    setLastClickTime(now);
    console.log('[OnboardingLayout] Continue button clicked', {
      canContinue,
      continueLabel,
      currentStep,
      clickCount: clickCount + 1
    });
    onContinue();
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <Header currentPage="home" showAuth={true} />

      {/* Main Content */}
      <main className="flex-1 pb-24">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {/* Progress Bar */}
          <ProgressBar
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepLabel={stepLabel}
          />

          {/* Step Content Container */}
          <div className="bg-white rounded-lg border border-neutral-200 p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 shadow-lg z-50" style={{ touchAction: 'manipulation' }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          {/* Back Button */}
          <div>
            {!hideBack && currentStep > 1 && (
              <Button
                variant="ghost"
                onClick={handleBack}
              >
                Back
              </Button>
            )}
          </div>

          {/* Continue Button */}
          <div>
            <Button
              variant="primary"
              onClick={handleContinueClick}
              disabled={!canContinue}
            >
              {continueLabel}
            </Button>
          </div>

          {/* Backup Click Area - Mobile Debug */}
          {currentStep === totalSteps && (
            <div
              className="lg:hidden absolute inset-0 pointer-events-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  console.log('[OnboardingLayout] Backup area clicked');
                  handleContinueClick();
                }
              }}
              style={{ zIndex: 40 }}
            />
          )}
        </div>
      </div>

      {/* Debug Overlay - Hidden in production */}
      <DebugOverlay
        data={{
          forceShow: false,
          step: currentStep,
          canContinue,
          label: continueLabel,
          clicks: clickCount,
          lastClick: lastClickTime || 'none',
          apiUrl: debugInfo?.apiUrl || 'not set',
          error: debugInfo?.lastError || 'none',
          generating: debugInfo?.isGenerating ? 'yes' : 'no',
        }}
      />
    </div>
  );
}
