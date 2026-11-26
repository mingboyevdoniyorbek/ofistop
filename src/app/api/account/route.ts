import { NextResponse } from "next/server";
import { handle, requireUser } from "@/lib/guard";
import { deleteAccount } from "@/lib/account";
import { destroySession } from "@/lib/auth";

/** Foydalanuvchi o'z hisobini o'chiradi (/hisobni-ochirish sahifasidagi tugma). */
export const DELETE = handle(async (req) => {
  const user = await requireUser(req);
  const result = await deleteAccount(user.id);
  await destroySession(); // cookie ham o'chadi: foydalanuvchi darhol tizimdan chiqadi
  return NextResponse.json({ ok: true, ...result });
});
