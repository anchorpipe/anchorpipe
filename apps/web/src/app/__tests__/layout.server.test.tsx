import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout, { metadata } from '../layout';

describe('RootLayout', () => {
  it('exposes default metadata', () => {
    expect(metadata.title).toBe('anchorpipe - Flaky Test Management');
    expect(metadata.description).toContain('flaky test management');
  });

  it('wraps children in html/body', () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>hello</div>
      </RootLayout>
    );

    expect(markup).toContain('<html lang="en">');
    expect(markup).toContain('<body>');
    expect(markup).toContain('hello');
  });
});
