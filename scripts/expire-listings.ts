import "./load-env";
import { closeDb } from "../src/db/client";
import { maintainAvailability } from "../src/lib/availability-maintenance";
// Run hourly. Search excludes expired listings even when this scheduler is offline.
maintainAvailability().then(result => console.log(result)).catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; }).finally(closeDb);
