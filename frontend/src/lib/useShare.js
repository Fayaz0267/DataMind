// lib/useShare.js
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useCallback, useState } from 'react';

export function useShare() {
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const shareChart = useCallback(async ({ query, chartType, chartConfig, data, insight, sql, rowCount }) => {
    setSharing(true);
    try {
      // Generate a short unique id
      const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const ref = doc(db, 'sharedCharts', id);

      await setDoc(ref, {
        id,
        query,
        chartType,
        chartConfig,
        data,
        insight,
        sql,
        rowCount,
        createdAt: serverTimestamp(),
        views: 0,
      });

      const url = `${window.location.origin}/share/${id}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      return url;
    } catch (err) {
      console.error('Share error:', err);
      return null;
    } finally {
      setSharing(false);
    }
  }, []);

  return { shareChart, sharing, shareUrl, setShareUrl };
}