import { collectKeys } from "../../src/lib/i18n/keys";
import { FR } from "../../src/lib/i18n/fr";
const missing = collectKeys("/home/claude/etf").filter((k) => !(k in FR));
console.log(JSON.stringify(missing, null, 0));
console.error(missing.length);
