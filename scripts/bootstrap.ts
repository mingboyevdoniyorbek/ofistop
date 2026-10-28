import "./load-env";
import { bootstrap } from "../src/db/bootstrap";
import { getPool } from "../src/db/client";
bootstrap().then(() => console.log("14 hudud, Toshkent tumanlari va qulayliklar tayyor. Boshqa tumanlarni admin panelda kiriting.")).catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => getPool().end());
