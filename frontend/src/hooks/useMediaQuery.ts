import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    
    // Some older browsers might need addListener
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    }

    return () => {
      window.removeEventListener('resize', listener);
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      }
    };
  }, [matches, query]);

  return matches;
}
