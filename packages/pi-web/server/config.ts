export const PI_WEB_PORT = Number(process.env.PI_WEB_PORT ?? 3311);

// Model override: e.g. "anthropic/claude-sonnet-4-20250514"
export const PI_WEB_MODEL = process.env.PI_WEB_MODEL;

// Working directory for the agent
export const PI_WEB_CWD = process.env.PI_WEB_CWD ?? process.cwd();
