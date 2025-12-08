import React from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import { Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import styles from './styles.module.css';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { colorMode, setColorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const toggleTheme = () => {
    setColorMode(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={clsx(styles.toggle, className)}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
    >
      <span className={styles.iconContainer}>
        <Sun className={clsx(styles.icon, styles.sun, { [styles.hidden]: isDark })} aria-hidden />
        <Moon
          className={clsx(styles.icon, styles.moon, { [styles.hidden]: !isDark })}
          aria-hidden
        />
      </span>
    </button>
  );
}
