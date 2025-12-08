import React from 'react';
import { useLocation } from '@docusaurus/router';
import OriginalFooter from '@theme-original/Footer';

type Props = React.ComponentProps<typeof OriginalFooter>;

export default function Footer(props: Props): JSX.Element | null {
  const { pathname } = useLocation();

  // Hide footer on docs pages, keep it elsewhere (home, blog, etc.)
  if (pathname.startsWith('/docs')) {
    return null;
  }

  return <OriginalFooter {...props} />;
}



