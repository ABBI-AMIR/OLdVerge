import { processOutbox } from '../_shared/handlers.js';
import { buildDeps } from '../_shared/deps.ts';

import { createOutboxMailer } from '../_shared/mailer.js';

const deps = buildDeps();
Deno.serve(processOutbox({ ...deps, mailer: createOutboxMailer(deps) }));
