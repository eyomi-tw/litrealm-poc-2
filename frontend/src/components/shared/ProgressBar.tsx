'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
}

export default function ProgressBar({ currentStep, totalSteps, stepLabel }: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-600">
          Step {currentStep} of {totalSteps}
        </span>
        {stepLabel && (
          <span className="text-sm text-neutral-600">{stepLabel}</span>
        )}
      </div>
      <div className="w-full bg-neutral-200 rounded-full h-2">
        <div
          className="bg-black h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
