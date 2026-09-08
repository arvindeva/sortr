CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sorterId" uuid,
	"sorterSlug" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"email" text,
	"reporterUserId" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_sorterId_sorters_id_fk" FOREIGN KEY ("sorterId") REFERENCES "public"."sorters"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterUserId_user_id_fk" FOREIGN KEY ("reporterUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "reports_status_createdAt_idx" ON "reports" ("status","createdAt");
