declare module '@theme/Layout' {
  import type { CSSProperties, ReactElement, ReactNode } from 'react';

  export interface Props {
    children: ReactNode;
    title?: string;
    description?: string;
    image?: string;
    keywords?: string | string[];
    permalink?: string;
    wrapperClassName?: string;
    pageClassName?: string;
    style?: CSSProperties;
    noFooter?: boolean;
    noNavbar?: boolean;
  }

  export default function Layout(props: Props): ReactElement;
}
