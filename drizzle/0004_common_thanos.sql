CREATE TABLE "waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(320),
	"productId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
