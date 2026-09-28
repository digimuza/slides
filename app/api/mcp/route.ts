import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Native MCP clients omit Origin. Browser callers must use this app's origin.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Origin is not allowed." }, { status: 403 });
  }
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 2_000_000,
  });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } finally {
    await server.close();
  }
}

// Stateless JSON transport has no persistent event stream or sessions to delete.
function methodNotAllowed() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
