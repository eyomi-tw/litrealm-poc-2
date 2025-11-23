'use client';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  icon?: React.ReactNode;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  icon
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary: 'bg-black text-white hover:bg-neutral-800 focus:ring-neutral-500 disabled:bg-neutral-300 disabled:cursor-not-allowed disabled:pointer-events-none',
    secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 border border-neutral-300 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    outline: 'bg-transparent text-neutral-900 hover:bg-neutral-50 border border-neutral-300 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    ghost: 'bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('[Button] Click event', { disabled, variant, type });
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}
