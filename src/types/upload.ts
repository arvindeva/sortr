// Types for direct R2 upload flow

export interface FileInfo {
  name: string;
  size: number;
  type: string; // MIME type
}

export interface SignedUploadUrl {
  key: string;          // R2 object key
  uploadUrl: string;    // Pre-signed PUT URL
  fileType: 'cover' | 'item' | 'group-cover';
  originalName: string;
}

export interface UploadTokenRequest {
  files: FileInfo[];
  type: 'sorter-creation'; // Can extend for other upload types later
}

export interface UploadTokenResponse {
  uploadUrls: SignedUploadUrl[];
  sessionId: string;
  expiresAt: string; // ISO timestamp
}

export interface UploadedFile {
  key: string;
  type: 'cover' | 'item' | 'group-cover';
  originalName: string;
  success: boolean;
  itemIndex?: number;    // For linking to specific items
  groupIndex?: number;   // For linking to specific groups
}

export interface CreateSorterWithUploads {
  // Existing sorter data
  title: string;
  description?: string;
  category?: string;
  useGroups: boolean;
  groups?: {
    name: string;
    items: { title: string }[];
  }[];
  items?: { title: string }[];
  
  // New upload-related fields
  uploadSession?: string;        // Session ID from upload tokens
  uploadedFiles?: UploadedFile[]; // Results from direct uploads
}

export interface UploadProgress {
  phase: 'requesting-tokens' | 'uploading-files' | 'creating-sorter' | 'complete' | 'failed';
  files: {
    name: string;
    progress: number;
    status: 'pending' | 'uploading' | 'complete' | 'failed';
    error?: string;
  }[];
  overallProgress: number;
  statusMessage: string;
}

export interface UploadSession {
  id: string;
  userId: string;
  status: 'pending' | 'uploading' | 'complete' | 'expired' | 'failed';
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface SessionFile {
  id: string;
  sessionId: string;
  r2Key: string;
  originalName: string;
  fileType: 'cover' | 'item' | 'group-cover';
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
}

// Error types for upload handling
export interface UploadError {
  type: 'validation' | 'network' | 'server' | 'r2' | 'timeout';
  message: string;
  file?: string;
  retryable: boolean;
}