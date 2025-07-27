CREATE TABLE "sorterHistory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sorterId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"coverImageUrl" text,
	"version" integer NOT NULL,
	"archivedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sorterHistory_sorterId_version_unique" UNIQUE("sorterId","version")
);
--> statement-breakpoint
ALTER TABLE "sorterGroups" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sorterItems" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sorters" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sorters" ADD COLUMN "deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sortingResults" ADD COLUMN "version" integer;