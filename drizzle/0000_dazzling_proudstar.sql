CREATE TABLE "account" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sorterGroups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sorterId" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sorterItems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sorterId" uuid NOT NULL,
	"groupId" uuid,
	"title" text NOT NULL,
	"imageUrl" text
);
--> statement-breakpoint
CREATE TABLE "sorters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"use_groups" boolean DEFAULT false NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completionCount" integer DEFAULT 0 NOT NULL,
	"viewCount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sortingResults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sorterId" uuid NOT NULL,
	"userId" uuid,
	"rankings" text NOT NULL,
	"selectedGroups" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"username" text,
	"image" text,
	"emailVerified" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text PRIMARY KEY NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorterGroups" ADD CONSTRAINT "sorterGroups_sorterId_sorters_id_fk" FOREIGN KEY ("sorterId") REFERENCES "public"."sorters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorterItems" ADD CONSTRAINT "sorterItems_sorterId_sorters_id_fk" FOREIGN KEY ("sorterId") REFERENCES "public"."sorters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorterItems" ADD CONSTRAINT "sorterItems_groupId_sorterGroups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."sorterGroups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorters" ADD CONSTRAINT "sorters_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortingResults" ADD CONSTRAINT "sortingResults_sorterId_sorters_id_fk" FOREIGN KEY ("sorterId") REFERENCES "public"."sorters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sortingResults" ADD CONSTRAINT "sortingResults_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;