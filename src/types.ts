export interface Media {
  id: string;
  title: string;
  type: 'photo' | 'video';
  author: string;
  authorSessionId: string;
  driveFileId: string;
  driveViewLink?: string;
  thumbnailLink?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any; // Firestore timestamp
  likesCount: number;
  commentsCount?: number;
  isPinned?: boolean;
  isHostAlbum?: boolean;
  isFavorite?: boolean;
}

export interface Comment {
  id: string;
  author: string;
  authorSessionId: string;
  text: string;
  timestamp: any;
}

export interface GuestbookEntry {
  id: string;
  author: string;
  authorSessionId: string;
  authorPhotoUrl?: string;
  message: string;
  driveFileId?: string;
  thumbnailLink?: string;
  signatureDataUrl?: string;
  timestamp: any;
}

export interface Settings {
  uploadsEnabled: boolean;
  videoUploadsEnabled: boolean;
  requireApproval: boolean;
  inviteCode: string;
  eventName?: string;
  eventDate?: string;
  eventPhotoUrl?: string;
  eventVideoUrl?: string;
  logoUrl?: string;
  bannerUrl?: string;
  welcomeMessage?: string;
  canLike: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;
  canFavorite: boolean;
  canDownload: boolean;
}

export interface Prediction {
  id: string;
  author: string;
  authorSessionId: string;
  authorPhotoUrl?: string;
  text: string;
  driveFileId?: string;
  thumbnailLink?: string;
  timestamp: any;
}

export interface UserLog {
  id: string;
  guestName: string;
  sessionId: string;
  timestamp: any;
}
