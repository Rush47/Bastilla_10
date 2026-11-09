"""Cloud Run entry point for BastillaOS MCP.

Deploy as a PRIVATE Cloud Run service with IAM authentication. The MCP app
itself does not implement OAuth; never grant public unauthenticated access.
"""
import os
import uvicorn
from server import mcp

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    if not 1 <= port <= 65535:
        raise ValueError("PORT out of range")
    uvicorn.run(mcp.streamable_http_app(), host="0.0.0.0", port=port, log_level="info")
