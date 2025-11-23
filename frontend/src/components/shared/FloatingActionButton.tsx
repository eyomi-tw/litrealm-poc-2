'use client';

interface FloatingActionButtonProps {
  icon?: React.ReactNode;
  label?: string;
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  variant?: 'primary' | 'secondary';
  className?: string;
}

export default function FloatingActionButton({
  icon,
  label,
  onClick,
  position = 'bottom-right',
  variant = 'primary',
  className = ''
}: FloatingActionButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2'
  };

  const variantClasses = {
    primary: 'bg-black text-white hover:bg-neutral-800 shadow-lg',
    secondary: 'bg-white text-black border-2 border-neutral-300 hover:bg-neutral-50 shadow-md'
  };

  return (
    <button
      onClick={onClick}
      className={`fixed ${positionClasses[position]} ${variantClasses[variant]} rounded-full px-6 py-4 font-semibold transition-all duration-200 hover:scale-105 active:scale-95 z-30 flex items-center space-x-2 lg:hidden ${className}`}
      aria-label={label || 'Floating action button'}
    >
      {icon && <span className="text-xl">{icon}</span>}
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}
