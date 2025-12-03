import { db } from "@/db";
import { uploadSessions, sessionFiles } from "@/db/schema";
import { eq, lt } from "drizzle-orm";
import { deleteFromR2 } from "@/lib/r2";
import type { UploadSession, SessionFile } from "@/types/upload";

/**
 * Get upload session by ID with validation
 */
export async function getUploadSession(
  sessionId: string,
): Promise<UploadSession | null> {
  try {
    const session = await db.query.uploadSessions.findFirst({
      where: eq(uploadSessions.id, sessionId),
    });

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      // Mark as expired but don't delete yet (cleanup job will handle)
      await db
        .update(uploadSessions)
        .set({ status: "expired" })
        .where(eq(uploadSessions.id, sessionId));

      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      status: session.status as
        | "pending"
        | "uploading"
        | "complete"
        | "expired"
        | "failed",
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      metadata: session.metadata || {},
    };
  } catch (error) {
    console.error("Error getting upload session:", error);
    return null;
  }
}

/**
 * Get all files in an upload session
 */
export async function getSessionFiles(
  sessionId: string,
): Promise<SessionFile[]> {
  try {
    const files = await db.query.sessionFiles.findMany({
      where: eq(sessionFiles.sessionId, sessionId),
    });

    return files.map((file) => ({
      id: file.id,
      sessionId: file.sessionId,
      r2Key: file.r2Key,
      originalName: file.originalName,
      fileType: file.fileType as "cover" | "item" | "group-cover",
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      uploadedAt: file.uploadedAt,
    }));
  } catch (error) {
    console.error("Error getting session files:", error);
    return [];
  }
}

/**
 * Mark upload session as complete
 */
export async function completeUploadSession(
  sessionId: string,
): Promise<boolean> {
  try {
    const result = await db
      .update(uploadSessions)
      .set({
        status: "complete",
        metadata: { completedAt: new Date().toISOString() },
      })
      .where(eq(uploadSessions.id, sessionId));

    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error("Error completing upload session:", error);
    return false;
  }
}

/**
 * Mark upload session as failed
 */
export async function failUploadSession(
  sessionId: string,
  error?: string,
): Promise<boolean> {
  try {
    const result = await db
      .update(uploadSessions)
      .set({
        status: "failed",
        metadata: {
          failedAt: new Date().toISOString(),
          error: error || "Unknown error",
        },
      })
      .where(eq(uploadSessions.id, sessionId));

    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error("Error failing upload session:", error);
    return false;
  }
}

/**
 * Validate that user owns the upload session
 */
export async function validateSessionOwnership(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  try {
    const session = await db.query.uploadSessions.findFirst({
      where: eq(uploadSessions.id, sessionId),
      columns: { userId: true },
    });

    return session?.userId === userId;
  } catch (error) {
    console.error("Error validating session ownership:", error);
    return false;
  }
}

/**
 * Clean up expired upload sessions
 * This should be run periodically as a background job
 */
export async function cleanupExpiredSessions(): Promise<{
  sessionsDeleted: number;
  filesDeleted: number;
}> {
  let sessionsDeleted = 0;
  let filesDeleted = 0;

  try {
    // Find expired sessions
    const expiredSessions = await db.query.uploadSessions.findMany({
      where: lt(uploadSessions.expiresAt, new Date()),
      columns: { id: true },
    });

    for (const session of expiredSessions) {
      // Get all files for this session
      const files = await getSessionFiles(session.id);

      // Delete files from R2
      for (const file of files) {
        try {
          await deleteFromR2(file.r2Key);
          filesDeleted++;
        } catch (error) {
          console.error(`Failed to delete R2 file ${file.r2Key}:`, error);
          // Continue with other files
        }
      }

      // Delete session files from database
      await db
        .delete(sessionFiles)
        .where(eq(sessionFiles.sessionId, session.id));

      // Delete session from database
      await db.delete(uploadSessions).where(eq(uploadSessions.id, session.id));

      sessionsDeleted++;
    }

    return { sessionsDeleted, filesDeleted };
  } catch (error) {
    console.error("Error during session cleanup:", error);
    return { sessionsDeleted, filesDeleted };
  }
}

/**
 * Delete a specific upload session and all its files
 * Used when user cancels upload or session fails
 */
export async function deleteUploadSession(sessionId: string): Promise<boolean> {
  try {
    // Get all files for this session
    const files = await getSessionFiles(sessionId);

    // Delete files from R2
    const deletePromises = files.map((file) =>
      deleteFromR2(file.r2Key).catch((error) => {
        console.error(`Failed to delete R2 file ${file.r2Key}:`, error);
        // Don't throw - continue with database cleanup
      }),
    );

    await Promise.all(deletePromises);

    // Delete session files from database
    await db.delete(sessionFiles).where(eq(sessionFiles.sessionId, sessionId));

    // Delete session from database
    await db.delete(uploadSessions).where(eq(uploadSessions.id, sessionId));

    return true;
  } catch (error) {
    console.error("Error deleting upload session:", error);
    return false;
  }
}

/**
 * Get session statistics for monitoring
 */
export async function getSessionStats(): Promise<{
  pending: number;
  uploading: number;
  complete: number;
  expired: number;
  failed: number;
}> {
  try {
    const stats = await db.query.uploadSessions.findMany({
      columns: { status: true },
    });

    const counts = {
      pending: 0,
      uploading: 0,
      complete: 0,
      expired: 0,
      failed: 0,
    };

    stats.forEach((session) => {
      const status = session.status as keyof typeof counts;
      if (status in counts) {
        counts[status]++;
      }
    });

    return counts;
  } catch (error) {
    console.error("Error getting session stats:", error);
    return {
      pending: 0,
      uploading: 0,
      complete: 0,
      expired: 0,
      failed: 0,
    };
  }
}
