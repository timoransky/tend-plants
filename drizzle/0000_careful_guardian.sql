CREATE TABLE "households" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"room" text,
	"species_id" integer,
	"common_name" text,
	"avatar" text,
	"last_watered" timestamp with time zone,
	"water_interval_days" integer,
	"water_note" text,
	"light_note" text,
	"last_fed" timestamp with time zone,
	"feed_interval_days" integer,
	"feed_note" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;