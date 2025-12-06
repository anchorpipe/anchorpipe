import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import clsx from 'clsx';
import styles from './styles.module.css';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export default function CodeBlock({
  code,
  language = 'bash',
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={clsx(styles.codeBlock, className)}>
      {/* Glow effect on hover */}
      <div className={styles.glow} />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.dots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          {filename && <span className={styles.filename}>{filename}</span>}
          <button
            onClick={handleCopy}
            className={styles.copyButton}
            aria-label="Copy code"
            type="button"
          >
            {copied ? (
              <>
                <Check className={styles.iconSuccess} />
                <span className={styles.textSuccess}>Copied!</span>
              </>
            ) : (
              <>
                <Copy className={styles.icon} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Code */}
        <pre className={styles.pre}>
          <code className={styles.code}>
            {code.split('\n').map((line, i) => (
              <div
                key={i}
                className={clsx(styles.line, {
                  [styles.comment]:
                    line.trim().startsWith('#') ||
                    line.trim().startsWith('//') ||
                    line.trim().startsWith('/*'),
                  [styles.addition]: line.trim().startsWith('+'),
                  [styles.deletion]: line.trim().startsWith('-') && !line.trim().startsWith('--'),
                })}
              >
                {showLineNumbers && <span className={styles.lineNumber}>{i + 1}</span>}
                {line || ' '}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
