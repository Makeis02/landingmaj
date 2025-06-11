import { useState, useEffect } from 'react';

interface MediaQueryOptions {
  maxWidth?: number;
  minWidth?: number;
}

export const useMediaQuery = ({ maxWidth, minWidth }: MediaQueryOptions) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(${maxWidth ? `max-width: ${maxWidth}px` : ''}${
        minWidth ? `${maxWidth ? ' and ' : ''}min-width: ${minWidth}px` : ''
      })`
    );

    const updateMatch = (e: MediaQueryListEvent | MediaQueryList) => {
      setMatches(e.matches);
    };

    // Initial check
    updateMatch(mediaQuery);

    // Add listener
    mediaQuery.addEventListener('change', updateMatch);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', updateMatch);
    };
  }, [maxWidth, minWidth]);

  return matches;
}; 