import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// Global singleton for active transports
// WARNING: Reset on serverless cold start.
export const activeTransports = new Map<string, SSEServerTransport>();
