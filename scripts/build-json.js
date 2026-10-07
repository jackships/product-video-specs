import { writeFileSync } from "node:fs";
import { SPECS } from "../src/specs.js";

writeFileSync(new URL("../data/specs.json", import.meta.url), JSON.stringify(SPECS, null, 2) + "\n");
console.log(`wrote data/specs.json (${SPECS.channels.length} channels)`);
