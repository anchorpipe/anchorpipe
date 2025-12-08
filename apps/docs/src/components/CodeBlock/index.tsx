import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import clsx from 'clsx';
import Highlight, { defaultProps, Language } from 'prism-react-renderer';
import theme from 'prism-react-renderer/themes/github';
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
  language: languageProp = 'bash',
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const language = (languageProp || 'bash') as Language;

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

        {/* Code with syntax highlighting */}
        <Highlight {...defaultProps} code={code} language={language} theme={theme}>
          {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={clsx(styles.pre, highlightClassName)} style={style}>
              <code className={styles.code}>
                {tokens.map((lineTokens, i) => {
                  const rawLine = lineTokens.map((token) => token.content).join('');
                  const isComment =
                    rawLine.trim().startsWith('#') ||
                    rawLine.trim().startsWith('//') ||
                    rawLine.trim().startsWith('/*');
                  const isAddition = rawLine.trim().startsWith('+');
                  const isDeletion =
                    rawLine.trim().startsWith('-') && !rawLine.trim().startsWith('--');

                  const lineClassName = clsx(styles.line, {
                    [styles.comment]: isComment,
                    [styles.addition]: isAddition,
                    [styles.deletion]: isDeletion,
                  });

                  return (
                    <div {...getLineProps({ line: lineTokens, key: i, className: lineClassName })}>
                      {showLineNumbers && <span className={styles.lineNumber}>{i + 1}</span>}
                      {lineTokens.map((token, key) => (
                        <span key={key} {...getTokenProps({ token, key })} />
                      ))}
                    </div>
                  );
                })}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
