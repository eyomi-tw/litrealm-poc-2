'use client';

interface DebugOverlayProps {
  data: Record<string, any>;
}

export default function DebugOverlay({ data }: DebugOverlayProps) {
  // Only show in development or when explicitly forced
  if (!data.forceShow && process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Never show if forceShow is explicitly false
  if (data.forceShow === false) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 bg-red-600 text-white text-xs p-3 z-[9999] opacity-90 max-w-xs overflow-auto max-h-48 font-mono">
      <div className="font-bold mb-1">🐛 DEBUG</div>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="mb-1">
          <span className="font-semibold">{key}:</span>{' '}
          <span className="text-yellow-200">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
