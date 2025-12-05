import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'hero' | 'glow';
type ButtonSize = 'sm' | 'default' | 'lg' | 'xl' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export default function Button({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        styles.button,
        styles[`variant-${variant}`],
        styles[`size-${size}`],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
