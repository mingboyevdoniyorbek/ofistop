import { centerHandlers } from "@/lib/center-management";
import { requireStaff } from "@/lib/staff";
export const { PATCH, POST } = centerHandlers(req => requireStaff(req, true));
