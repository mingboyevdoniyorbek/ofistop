import { centerHandlers } from "@/lib/center-management";
import { requireUser, HttpError, managedCenterIds } from "@/lib/guard";
export const { PATCH, POST } = centerHandlers(async (req, id) => {
  const user = await requireUser(req);
  if (!(await managedCenterIds(user.id)).includes(id)) throw new HttpError(403, "Ruxsat yo'q");
  return { id: user.id, centerMember: true };
});
