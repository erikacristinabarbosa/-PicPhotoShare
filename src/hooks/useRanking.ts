import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, collectionGroup, query, where } from 'firebase/firestore';

export interface RankingUser {
  name: string;
  normName: string;
  photos: number;
  likes: number;
  comments: number;
  messages: number;
  total: number;
  animationLevel: number; // 0-100
  avatarUrl?: string;
  position?: number;
}

export function useRanking() {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const m: any[] = [];
    const c: any[] = [];
    const g: any[] = [];
    const l: any[] = [];
    const p: any[] = [];

    let isMediaLoaded = false;
    let isCommentsLoaded = false;
    let isGuestbookLoaded = false;
    let isLikesLoaded = false;
    let isPredictionsLoaded = false;

    const compute = () => {
      if (!isMediaLoaded || !isCommentsLoaded || !isGuestbookLoaded || !isLikesLoaded || !isPredictionsLoaded) return;

      try {
        const userStats: Record<string, RankingUser> = {};
        const sessionToName: Record<string, string> = {};

        const getNormalizedName = (name: string | undefined | null) => {
          if (!name || name.trim() === '') return 'anônimo';
          return name.trim().toLowerCase();
        };

        const getDisplayName = (name: string | undefined | null) => {
          if (!name || name.trim() === '') return 'Anônimo';
          return name
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        };

        const updateStats = (sessionId: string | undefined, authorName: string | undefined, type: 'photos' | 'comments' | 'messages', avatarData?: { driveFileId?: string, thumbnailLink?: string }, isPriorityAvatar?: boolean) => {
          const normName = getNormalizedName(authorName);
          if (sessionId) {
            sessionToName[sessionId] = normName;
          }
          
          if (!userStats[normName]) {
            userStats[normName] = { name: getDisplayName(authorName), normName, photos: 0, likes: 0, comments: 0, messages: 0, total: 0, animationLevel: 0 };
          }
          
          userStats[normName][type] += 1;
          
          if (authorName && userStats[normName].name === 'Anônimo') {
            userStats[normName].name = getDisplayName(authorName);
          }

          if (avatarData && (!userStats[normName].avatarUrl || isPriorityAvatar)) {
            if (avatarData.driveFileId) {
              userStats[normName].avatarUrl = `/api/image/${avatarData.driveFileId}`;
            } else if (avatarData.thumbnailLink) {
              userStats[normName].avatarUrl = avatarData.thumbnailLink.replace('=s220', '=s800');
            }
          }
        };

        const approvedMediaIds = new Set<string>();
        m.forEach(doc => {
          const data = doc.data() as any;
          approvedMediaIds.add(doc.id);
          if (data.isHostAlbum || data.isHostAlbum === 'true') return;
          if (data.type === 'photo' || data.type === 'video') {
            updateStats(data.authorSessionId, data.author, 'photos', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink });
          }
        });

        const activeGuestbookIds = new Set<string>();
        g.forEach(doc => {
          activeGuestbookIds.add(doc.id);
          const data = doc.data() as any;
          updateStats(data.authorSessionId, data.author, 'messages', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink }, true);
        });

        const activePredictionIds = new Set<string>();
        p.forEach(doc => {
          activePredictionIds.add(doc.id);
          const data = doc.data() as any;
          updateStats(data.authorSessionId, data.author, 'messages', { driveFileId: data.driveFileId, thumbnailLink: data.thumbnailLink }, true);
        });

        c.forEach(doc => {
          const data = doc.data() as any;
          const parentCollection = doc.ref.parent.parent?.parent?.id;
          const parentDocId = doc.ref.parent.parent?.id;
          let isValid = false;
          if (parentCollection === 'media' && parentDocId && approvedMediaIds.has(parentDocId)) isValid = true;
          if (parentCollection === 'guestbook' && parentDocId && activeGuestbookIds.has(parentDocId)) isValid = true;
          if (parentCollection === 'predictions' && parentDocId && activePredictionIds.has(parentDocId)) isValid = true;
          if (isValid) {
            updateStats(data.authorSessionId, data.author, 'comments');
          }
        });

        l.forEach(doc => {
          const data = doc.data() as any;
          const parentCollection = doc.ref.parent.parent?.parent?.id;
          const parentDocId = doc.ref.parent.parent?.id;
          let isValid = false;
          if (parentCollection === 'media' && parentDocId && approvedMediaIds.has(parentDocId)) isValid = true;
          if (parentCollection === 'guestbook' && parentDocId && activeGuestbookIds.has(parentDocId)) isValid = true;
          if (parentCollection === 'predictions' && parentDocId && activePredictionIds.has(parentDocId)) isValid = true;
          if (isValid) {
            const sessionId = data.sessionId || doc.id;
            if (sessionId) {
              const normName = sessionToName[sessionId] || getNormalizedName(data.author);
              if (!userStats[normName]) {
                const displayName = data.author ? getDisplayName(data.author) : 'Anônimo';
                userStats[normName] = { name: displayName, normName, photos: 0, likes: 0, comments: 0, messages: 0, total: 0, animationLevel: 0 };
              }
              userStats[normName].likes += 1;
              if (data.author && userStats[normName].name === 'Anônimo') {
                userStats[normName].name = getDisplayName(data.author);
              }
            }
          }
        });

        const rawRanking = Object.values(userStats)
          .filter(stat => stat.name.toLowerCase() !== 'anônimo' && stat.name.toLowerCase() !== 'anfitrião')
          .map(stat => ({
            ...stat,
            total: stat.photos * 10 + stat.messages * 5 + stat.comments * 3 + stat.likes * 2
          }))
          .filter(stat => stat.total > 0)
          .sort((a, b) => b.total - a.total);

        const maxScore = rawRanking.length > 0 ? rawRanking[0].total : 1;
        
        const rankingArray = rawRanking.map((stat, idx) => ({
          ...stat,
          position: idx + 1,
          animationLevel: Math.min(100, Math.round((stat.total / maxScore) * 100))
        }));

        setRanking(rankingArray);
      } catch (error) {
        console.error("Error computing ranking:", error);
      } finally {
        setIsLoading(false);
      }
    };

    unsubs.push(onSnapshot(query(collection(db, 'media')), snapshot => {
      m.length = 0; 
      m.push(...snapshot.docs.filter(doc => doc.data().status !== 'rejected' && doc.data().status !== 'pending'));
      isMediaLoaded = true; compute();
    }));

    unsubs.push(onSnapshot(collectionGroup(db, 'comments'), snapshot => {
      c.length = 0; c.push(...snapshot.docs); isCommentsLoaded = true; compute();
    }));

    unsubs.push(onSnapshot(collection(db, 'guestbook'), snapshot => {
      g.length = 0; g.push(...snapshot.docs); isGuestbookLoaded = true; compute();
    }));

    unsubs.push(onSnapshot(collectionGroup(db, 'likes'), snapshot => {
      l.length = 0; l.push(...snapshot.docs); isLikesLoaded = true; compute();
    }));

    unsubs.push(onSnapshot(collection(db, 'predictions'), snapshot => {
      p.length = 0; p.push(...snapshot.docs); isPredictionsLoaded = true; compute();
    }));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  return { ranking, isLoading };
}
