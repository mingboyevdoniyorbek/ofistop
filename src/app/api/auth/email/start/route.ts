import { handle, HttpError } from "@/lib/guard";
// Retire old clients too: no email is sent even if Resend keys remain configured.
export const POST = handle(async () => {
  throw new HttpError(410, "Email orqali kirish olib tashlangan. Google yoki Telegram orqali kiring.");
});
