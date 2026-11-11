import { pgTable, text, jsonb, bigint, timestamp } from "drizzle-orm/pg-core";

// One row per shared roster "room". The whole roster state is stored as JSON.
export const rosters = pgTable("rosters", {
  roomId: text("room_id").primaryKey(),
  payload: jsonb("payload").notNull(),
  senderId: text("sender_id").notNull().default(""),
  // Monotonic version (ms since epoch) used by clients to poll for changes.
  version: bigint("version", { mode: "number" }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
