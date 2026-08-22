CREATE TABLE "serverErrors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"digest" text,
	"message" text NOT NULL,
	"stack" text,
	"method" text,
	"path" text,
	"routeType" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "serverErrors_createdAt_idx" ON "serverErrors" ("createdAt");
--> statement-breakpoint
CREATE INDEX "serverErrors_digest_idx" ON "serverErrors" ("digest");
