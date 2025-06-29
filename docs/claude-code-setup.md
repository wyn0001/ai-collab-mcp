# Claude Code MCP Configuration Guide

## Overview

This guide provides the correct configuration for using the AI Collaboration MCP Server with Claude Code.

## Configuration Steps

### 1. Project Structure

When using the MCP server as a git submodule or within your project:

```
your-project/
├── .mcp-server/          # The AI Collaboration MCP server
│   ├── src/
│   │   └── index.js
│   └── node_modules/
├── .mcp.json            # Claude Code configuration
└── ... (your project files)
```

### 2. Create .mcp.json Configuration

Create a `.mcp.json` file in your project root with this configuration:

```json
{
  "mcpServers": {
    "ai-collab": {
      "command": "node",
      "args": [".mcp-server/src/index.js"],
      "cwd": "/absolute/path/to/your/project",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/your/project",
        "NODE_PATH": "/absolute/path/to/your/project/.mcp-server/node_modules"
      }
    }
  }
}
```

### 3. Key Configuration Points

**Important:** The following elements are critical for Claude Code:

1. **Use relative paths in `args`**: Claude Code works better with relative paths from the working directory
2. **Specify `cwd`**: Always include the working directory - this is where Claude Code will run the command from
3. **Include `NODE_PATH`**: This ensures the MCP server can find its dependencies
4. **Use absolute paths for `cwd` and environment variables**

### 4. Example Configuration

For a project at `/Users/username/projects/my-app`:

```json
{
  "mcpServers": {
    "ai-collab": {
      "command": "node",
      "args": [".mcp-server/src/index.js"],
      "cwd": "/Users/username/projects/my-app",
      "env": {
        "PROJECT_PATH": "/Users/username/projects/my-app",
        "NODE_PATH": "/Users/username/projects/my-app/.mcp-server/node_modules"
      }
    }
  }
}
```

### 5. Troubleshooting

If the MCP server fails to start:

1. **Check the MCP status**: Use the `/mcp` command in Claude Code
2. **Verify paths**: Ensure all paths in the configuration exist
3. **Test manually**: Run `node .mcp-server/src/index.js` from your project directory
4. **Check dependencies**: Run `npm install` in the `.mcp-server` directory
5. **Restart Claude Code**: Configuration changes require a restart

### 6. Alternative: Global Installation

If you prefer a global installation:

```json
{
  "mcpServers": {
    "ai-collab": {
      "command": "node",
      "args": ["/Users/username/tools/ai-collab-mcp/src/index.js"],
      "cwd": "/Users/username/projects/my-app",
      "env": {
        "PROJECT_PATH": "/Users/username/projects/my-app",
        "NODE_PATH": "/Users/username/tools/ai-collab-mcp/node_modules"
      }
    }
  }
}
```

## Verification

Once configured, verify the MCP server is working:

```
@ai-collab ping
```

Should return: "pong - AI Collaboration MCP Server is running"