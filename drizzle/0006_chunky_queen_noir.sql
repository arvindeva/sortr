CREATE TABLE "sessionFiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" uuid NOT NULL,
	"r2Key" varchar(500) NOT NULL,
	"originalName" varchar(255) NOT NULL,
	"fileType" varchar(10) NOT NULL,
	"mimeType" varchar(50) NOT NULL,
	"fileSize" integer NOT NULL,
	"uploadedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploadSessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "sessionFiles" ADD CONSTRAINT "sessionFiles_sessionId_uploadSessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."uploadSessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploadSessions" ADD CONSTRAINT "uploadSessions_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;