import { importCodexCatalog } from '../server/import/codexCatalog.js';

const summary = importCodexCatalog();
console.log(JSON.stringify(summary, null, 2));
