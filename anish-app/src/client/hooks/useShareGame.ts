import { useCallback, useState } from 'react';
import { showToast } from '@devvit/web/client';

export function useShareGame() {
  const [loading, setLoading] = useState(false);

  const copyShareLink = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/game/share-url');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.type !== 'game.shareUrl') throw new Error('Unexpected response');
      await navigator.clipboard.writeText(data.url);
      showToast('Link copied! Share it with your opponent.');
    } catch (err) {
      console.error('Failed to copy share link', err);
      showToast('Could not copy link. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { copyShareLink, loading };
}
