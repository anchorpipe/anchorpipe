import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import styles from './styles.module.css';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: string;
  className?: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  accent = 'primary',
  className,
}: FeatureCardProps) {
  return (
    <div className={clsx(styles.card, className)}>
      <div className={styles.iconWrapper}>
        <Icon className={styles.icon} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
