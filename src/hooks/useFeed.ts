import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, collectionGroup, query, where, updateDoc } from 'firebase/firestore';

export interface FeedComment {
  id: string;
  author: string;
  authorSessionId?: string;
  content: string;
  timestamp: Date | null;
  docPath: string;
}

export interface FeedLike {
  id: string;
  author: string;
  type?: string;
  docPath: string;
}

export interface FeedPost {
  id: string;
  type: 'media' | 'guestbook' | 'prediction';
  author: string;
  authorSessionId?: string;
  authorAvatar?: string;
  timestamp: Date | null;
  status?: string;
  
  content?: string;
  mediaDriveId?: string;
  mediaThumbnail?: string;
  mediaType?: 'photo' | 'video';
  isHostAlbum?: boolean;
  
  likes: FeedLike[];
  comments: FeedComment[];
  docPath: string;
  
  _rawLikesCount?: number;
  _rawCommentsCount?: number;
  _ref?: any;
}

export function useFeed(isAdmin: boolean = false) {
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
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

      const postsMap = new Map<string, FeedPost>();

      m.forEach(doc => {
        const data = doc.data();
        
        // Filter out rejected. If not admin, also filter out pending.
        // If status is undefined, we assume it's an old item and therefore approved.
        if (data.status === 'rejected') return;
        if (!isAdmin && data.status === 'pending') return;

        postsMap.set(doc.ref.path, {
          id: doc.id,
          type: 'media',
          author: data.author || 'Anônimo',
          authorSessionId: data.authorSessionId,
          timestamp: data.timestamp?.toDate() || null,
          mediaDriveId: data.driveFileId,
          mediaThumbnail: data.thumbnailLink,
          mediaType: data.type,
          isHostAlbum: data.isHostAlbum === true || data.isHostAlbum === 'true',
          docPath: doc.ref.path,
          status: data.status,
          content: data.title,
          likes: [],
          comments: [],
          _rawLikesCount: data.likesCount || 0,
          _rawCommentsCount: data.commentsCount || 0,
          _ref: doc.ref
        });
      });

      g.forEach(doc => {
        const data = doc.data();
        postsMap.set(doc.ref.path, {
          id: doc.id,
          type: 'guestbook',
          author: data.author || 'Anônimo',
          authorSessionId: data.authorSessionId,
          authorAvatar: data.authorPhotoUrl,
          timestamp: data.timestamp?.toDate() || null,
          content: data.message,
          mediaDriveId: data.driveFileId,
          mediaThumbnail: data.thumbnailLink,
          docPath: doc.ref.path,
          likes: [],
          comments: []
        });
      });

      p.forEach(doc => {
        const data = doc.data();
        postsMap.set(doc.ref.path, {
          id: doc.id,
          type: 'prediction',
          author: data.author || 'Anônimo',
          authorSessionId: data.authorSessionId,
          authorAvatar: data.authorPhotoUrl,
          timestamp: data.timestamp?.toDate() || null,
          content: data.text,
          mediaDriveId: data.driveFileId,
          mediaThumbnail: data.thumbnailLink,
          docPath: doc.ref.path,
          likes: [],
          comments: []
        });
      });

      const getParentPath = (childPath: string) => {
        const parts = childPath.split('/');
        if (parts.length >= 3) {
          return `${parts[0]}/${parts[1]}`;
        }
        return null;
      };

      c.forEach(doc => {
        const pPath = getParentPath(doc.ref.path);
        if (pPath && postsMap.has(pPath)) {
          const p = postsMap.get(pPath)!;
          const data = doc.data();
          p.comments.push({
            id: doc.id,
            author: data.author || 'Anônimo',
            authorSessionId: data.authorSessionId,
            content: data.text,
            timestamp: data.timestamp?.toDate() || null,
            docPath: doc.ref.path
          });
        }
      });

      l.forEach(doc => {
        const pPath = getParentPath(doc.ref.path);
        if (pPath && postsMap.has(pPath)) {
          const p = postsMap.get(pPath)!;
          const data = doc.data();
          p.likes.push({
            id: doc.id,
            author: data.author || 'Anônimo',
            type: data.type || 'heart',
            docPath: doc.ref.path
          });
        }
      });

      const items = Array.from(postsMap.values());

      items.forEach(item => {
        item.comments.sort((a, b) => {
          if (!a.timestamp) return -1;
          if (!b.timestamp) return 1;
          return a.timestamp.getTime() - b.timestamp.getTime();
        });
      });

      items.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      setFeedPosts(items);
      setIsLoading(false);
    };

    const handleError = (error: unknown, op: any, path: string) => {
      console.error(`Feed Error on ${path}:`, error);
    };

    const mediaQuery = query(collection(db, 'media'));

    unsubs.push(onSnapshot(mediaQuery, snapshot => {
      m.length = 0; m.push(...snapshot.docs); isMediaLoaded = true; compute();
    }, error => handleError(error, 'onSnapshot', 'media')));

    unsubs.push(onSnapshot(collectionGroup(db, 'comments'), snapshot => {
      c.length = 0; c.push(...snapshot.docs); isCommentsLoaded = true; compute();
    }, error => handleError(error, 'onSnapshot', 'comments')));

    unsubs.push(onSnapshot(collection(db, 'guestbook'), snapshot => {
      g.length = 0; g.push(...snapshot.docs); isGuestbookLoaded = true; compute();
    }, error => handleError(error, 'onSnapshot', 'guestbook')));

    unsubs.push(onSnapshot(collectionGroup(db, 'likes'), snapshot => {
      l.length = 0; l.push(...snapshot.docs); isLikesLoaded = true; compute();
    }, error => handleError(error, 'onSnapshot', 'likes')));

    unsubs.push(onSnapshot(collection(db, 'predictions'), snapshot => {
      p.length = 0; p.push(...snapshot.docs); isPredictionsLoaded = true; compute();
    }, error => handleError(error, 'onSnapshot', 'predictions')));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [isAdmin]);

  return { feedPosts, isLoading };
}
