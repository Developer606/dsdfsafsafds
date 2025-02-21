CREATE TABLE "custom_characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"avatar" text NOT NULL,
	"description" text NOT NULL,
	"persona" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"character_id" text NOT NULL,
	"content" text NOT NULL,
	"is_user" boolean NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"trial_characters_created" integer DEFAULT 0 NOT NULL,
	"subscription_tier" text,
	"subscription_status" text DEFAULT 'trial',
	"subscription_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
