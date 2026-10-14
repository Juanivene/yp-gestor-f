CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_lowercase_chk" CHECK ("username" = lower("username") AND char_length("username") >= 5);--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_estimated_hours_chk" CHECK ("estimated_hours" > 0);--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_incident_number_chk" CHECK ("incident_number" IS NULL OR "incident_number" > 0);--> statement-breakpoint
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_body_chk" CHECK (char_length(btrim("body")) > 0);
