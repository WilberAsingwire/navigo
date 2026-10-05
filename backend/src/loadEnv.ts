/**
 * Loads .env BEFORE any other module is evaluated.
 *
 * ES/CommonJS imports are hoisted and executed before the importing module's
 * body runs, so calling `dotenv.config()` inside index.ts is too late for
 * modules (like utils/auth.ts) that read process.env at import time.
 * index.ts imports this file FIRST, guaranteeing env vars are present for
 * every subsequent import.
 */
import dotenv from 'dotenv';

dotenv.config();
