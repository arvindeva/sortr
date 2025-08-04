import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db";
import { uploadSessions, sessionFiles } from "@/db/schema";
import { z } from "zod";
import { generatePresignedUploadUrl, getSessionFileKey } from "@/lib/r2";
import type {
  UploadTokenRequest,
  UploadTokenResponse,
  FileInfo,
  SignedUploadUrl,
} from "@/types/upload";

// Validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES_PER_REQUEST = 500; // Support comprehensive sorters while remaining practical
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SESSION_DURATION_MINUTES = 15;

// Request validation schema
const uploadTokenRequestSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        size: z.number().min(1).max(MAX_FILE_SIZE),
        type: z.string().refine((type) => ALLOWED_IMAGE_TYPES.includes(type), {
          message: "Only JPG, PNG, and WebP files are allowed",
        }),
        fileType: z.enum(["cover", "item", "group-cover"]),
      }),
    )
    .min(1)
    .max(MAX_FILES_PER_REQUEST),
  type: z.literal("sorter-creation"), // Can extend later
});

export async function POST(request: NextRequest) {
  try {
    console.log("Upload tokens API: Starting request");
    
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log("Upload tokens API: No authenticated user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("Upload tokens API: Authenticated user:", session.user.email);

    // Get user from database
    const userQuery = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.email, session.user.email!),
    });

    if (!userQuery) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    console.log("Upload tokens API: Request body:", body);
    
    const validatedData = uploadTokenRequestSchema.parse(body);
    console.log("Upload tokens API: Validated data:", validatedData);

    // Create upload session
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + SESSION_DURATION_MINUTES);

    const [uploadSession] = await db
      .insert(uploadSessions)
      .values({
        userId: userQuery.id,
        status: "pending",
        expiresAt,
        metadata: {
          type: validatedData.type,
          fileCount: validatedData.files.length,
          totalSize: validatedData.files.reduce(
            (sum, file) => sum + file.size,
            0,
          ),
        },
      })
      .returning();

    // Generate pre-signed URLs for each file (with dual sizes for items)
    const uploadUrls: SignedUploadUrl[] = [];

    for (let index = 0; index < validatedData.files.length; index++) {
      const file = validatedData.files[index];

      // Use explicit file type from frontend (now required)
      const fileType = file.fileType;

      if (fileType === "item") {
        // Generate both thumbnail and full size URLs for items
        const sizes = [
          { suffix: "-thumb", size: "thumbnail" as const },
          { suffix: "", size: "full" as const },
        ];

        for (const sizeConfig of sizes) {
          // Generate session-based key with size suffix
          const sessionKey = getSessionFileKey(
            uploadSession.id,
            fileType,
            index,
            file.name,
            sizeConfig.suffix,
          );

          // Generate pre-signed URL
          const uploadUrl = await generatePresignedUploadUrl(
            sessionKey,
            file.type,
            SESSION_DURATION_MINUTES * 60,
          );

          // Store file metadata in session
          await db.insert(sessionFiles).values({
            sessionId: uploadSession.id,
            r2Key: sessionKey,
            originalName: file.name,
            fileType,
            mimeType: file.type,
            fileSize: file.size, // Client will provide actual size after compression
          });

          uploadUrls.push({
            key: sessionKey,
            uploadUrl,
            fileType,
            originalName: file.name,
            size: sizeConfig.size,
          });
        }
      } else {
        // Single URL for cover and group-cover images
        const sessionKey = getSessionFileKey(
          uploadSession.id,
          fileType,
          index,
          file.name,
        );

        const uploadUrl = await generatePresignedUploadUrl(
          sessionKey,
          file.type,
          SESSION_DURATION_MINUTES * 60,
        );

        await db.insert(sessionFiles).values({
          sessionId: uploadSession.id,
          r2Key: sessionKey,
          originalName: file.name,
          fileType,
          mimeType: file.type,
          fileSize: file.size,
        });

        uploadUrls.push({
          key: sessionKey,
          uploadUrl,
          fileType,
          originalName: file.name,
        });
      }
    }

    const response: UploadTokenResponse = {
      uploadUrls,
      sessionId: uploadSession.id,
      expiresAt: uploadSession.expiresAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("Error generating upload tokens:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

