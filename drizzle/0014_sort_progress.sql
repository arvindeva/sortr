CREATE TABLE "sortProgress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"sorterId" uuid NOT NULL,
	"version" integer NOT NULL,
	"state" text NOT NULL,
	"itemCount" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sortProgress_userId_sorterId_unique" UNIQUE("userId","sorterId")
);
--> statement-breakpoint
ALTER TABLE "sortProgress" ADD CONSTRAINT "sortProgress_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortProgress" ADD CONSTRAINT "sortProgress_sorterId_sorters_id_fk" FOREIGN KEY ("sorterId") REFERENCES "public"."sorters"("id") ON DELETE cascade ON UPDATE no action;