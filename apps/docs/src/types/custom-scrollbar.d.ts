/* eslint-disable @typescript-eslint/no-unused-vars */
import 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'custom-scrollbar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export {};
