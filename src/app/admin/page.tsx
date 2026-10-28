import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import AdminLogin from "@/components/AdminLogin";
export default async function AdminHome() {
  if (!await getAdminUser()) return <AdminLogin />;
  redirect("/admin/elonlar?holat=pending");
}
