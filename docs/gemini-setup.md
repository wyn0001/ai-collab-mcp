# Gemini CLI MCP Configuration Guide

## Overview

This guide provides configuration instructions for using the AI Collaboration MCP Server with Gemini CLI.

## Configuration Steps

### 1. Locate Gemini Settings

Gemini CLI stores its configuration in:
- **User settings**: `~/.gemini/settings.json`
- **Project settings**: `.gemini/settings.json` (in project root)

### 2. Add MCP Server Configuration

Edit your `~/.gemini/settings.json` file to add the MCP server configuration:

```json
{
  "theme": "ANSI",
  "selectedAuthType": "oauth-personal",
  "mcpServers": {
    "ai-collab": {
      "command": "node",
      "args": ["/path/to/ai-collab-mcp/src/index.js"],
      "cwd": "/path/to/your/project",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "NODE_PATH": "/path/to/ai-collab-mcp/node_modules"
      },
      "timeout": 600000
    }
  }
}
```

### 3. Configuration Parameters

- **command**: The command to run the server (usually `node` for JavaScript servers)
- **args**: Array containing the path to the MCP server's index.js file
- **cwd**: Working directory (your project directory)
- **env**: Environment variables including:
  - `PROJECT_PATH`: Path to your project
  - `NODE_PATH`: Path to the MCP server's node_modules
- **timeout**: Request timeout in milliseconds (default: 600000 = 10 minutes)

### 4. Example Configuration

For a project at `/Users/username/projects/my-app` with MCP server as a submodule:

```json
{
  "theme": "ANSI",
  "selectedAuthType": "oauth-personal",
  "mcpServers": {
    "ai-collab": {
      "command": "node",
      "args": ["/Users/username/projects/my-app/.mcp-server/src/index.js"],
      "cwd": "/Users/username/projects/my-app",
      "env": {
        "PROJECT_PATH": "/Users/username/projects/my-app",
        "NODE_PATH": "/Users/username/projects/my-app/.mcp-server/node_modules"
      },
      "timeout": 600000
    }
  }
}
```

### 5. Verify Configuration

After adding the configuration:

1. **Restart Gemini CLI**
2. **Check MCP status**: Run `/mcp` command
3. **Test connection**: Run `@ai-collab ping`

You should see the ai-collab server listed with all available tools.

### 6. Troubleshooting

If the MCP server doesn't appear:
- Ensure all paths are absolute paths
- Check that the MCP server directory exists and has dependencies installed
- Verify that `node` is in your PATH
- Try running the server manually: `node /path/to/ai-collab-mcp/src/index.js`

### 7. Using MCP Commands

Once configured, use MCP commands directly in Gemini CLI:
```
@ai-collab init {"agentName": "gemini"}
@ai-collab send_directive {"taskId": "TASK-001", ...}
@ai-collab review_work {"taskId": "TASK-001", "status": "approved", ...}
```

**Important**: Type MCP commands directly in the Gemini CLI interface, not as shell commands.