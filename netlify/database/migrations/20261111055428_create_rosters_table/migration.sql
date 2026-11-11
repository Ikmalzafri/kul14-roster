CREATE TABLE "rosters" (
	"room_id" text PRIMARY KEY,
	"payload" jsonb NOT NULL,
	"sender_id" text DEFAULT '' NOT NULL,
	"version" bigint NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
