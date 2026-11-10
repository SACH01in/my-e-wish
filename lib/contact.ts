import { z } from "zod";
export { escapeEmailHtml } from "./email-template";

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(5000),
  website: z.string().max(200).optional(),
}).strict();
