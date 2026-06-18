import { z } from "zod";

export const serverEnvSchema = z.object({
  APP_ENV: z.enum(["local", "test", "staging", "production"]).default("local"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AI_SERVICE_URL: z.string().url(),
  DEFAULT_TIME_ZONE: z.string().default("Asia/Kolkata")
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

