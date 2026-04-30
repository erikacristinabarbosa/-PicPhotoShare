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
  likesCount?: number;
  commentsCount?: number;
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
  welcomeMediaType?: 'photo' | 'video';
  welcomeMediaUrl?: string;
  welcomeAudioUrl?: string;
  welcomeTemplate?: string;
  canLike: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;
  canFavorite: boolean;
  canDownload: boolean;
  displayBackgrounds?: Array<{id: string, name: string, url: string}>;
  entranceTemplate?: string;
  entranceAudioPreset?: string;
  entranceAudioUrl?: string;
  customAudioPresets?: Array<{id: string, name: string, url: string}>;
  instagramUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
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
  likesCount?: number;
  commentsCount?: number;
}

export interface UserLog {
  id: string;
  guestName: string;
  contact?: string;
  sessionId: string;
  timestamp: any;
}
