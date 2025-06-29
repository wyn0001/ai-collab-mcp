# Setup Guide

This guide walks you through setting up the AI Collaboration MCP Server for your project.

## 🚀 Quick Setup for Autonomous Workflows

After installation, you can start autonomous workflows with just two commands:

1. **Gemini (CTO):** `@ai-collab start {"agentName": "gemini", "message": "Your mission"}`
2. **Claude (Dev):** `@ai-collab start {"agentName": "claude"}`

The system automatically handles role assignment and workflow orchestration.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Claude Code CLI installed
- Gemini CLI installed
- Git (for cloning the repository)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-collab-mcp.git
cd ai-collab-mcp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Installation

```bash
# Test the server starts correctly
npm start
# You should see: "AI Collaboration MCP Server started"
# Press Ctrl+C to stop
```

## Configuration

### Claude Code Setup

1. Add the MCP server to Claude Code:
```bash
claude mcp add ai-collab stdio "node /absolute/path/to/ai-collab-mcp/src/index.js"
```

2. Verify the server is added:
```bash
claude mcp list
```

3. Test the connection in Claude Code:
```
@ai-collab get_pending_tasks {"role": "developer"}
```

### Gemini Setup

1. Edit your Gemini settings file:
```bash
# Find your settings file (usually ~/.gemini/settings.json)
nano ~/.gemini/settings.json
```

2. Add the MCP server configuration:
```json
{
  "mcpServers": {
    "ai-collab": {
      "command": "node",
      "args": ["/absolute/path/to/ai-collab-mcp/src/index.js"],
      "env": {}
    }
  }
}
```

3. Restart Gemini CLI to load the new configuration

4. Test the connection:
```
@ai-collab get_pending_tasks {"role": "cto"}
```

## Initial Project Setup

### Option 1: Simplified Autonomous Mode (Recommended)

Start your first autonomous workflow:

**In Gemini:**
```
@ai-collab start {"agentName": "gemini", "message": "Setup initial project structure with TypeScript, testing framework, and build configuration"}
```

**In Claude:**
```
@ai-collab start {"agentName": "claude"}
```

That's it! The AIs will autonomously create tasks, implement solutions, review code, and complete the setup.

### Option 2: Traditional Manual Mode

If you prefer manual control, you can still use individual commands:

**1. Create a directive (as CTO in Gemini):**
```javascript
@ai-collab send_directive {
  "taskId": "TASK-001",
  "title": "Setup project structure",
  "specification": "Create the initial project structure for our compiler",
  "requirements": [
    "Use TypeScript",
    "Include build configuration",
    "Setup testing framework"
  ],
  "acceptanceCriteria": [
    "Project builds successfully",
    "Tests can be run",
    "Linting is configured"
  ]
}
```

**2. Check for tasks (as Developer in Claude):**
```javascript
@ai-collab get_pending_tasks {"role": "developer"}
```

## Directory Structure

After setup, the MCP server will create these directories:

```
ai-collab-mcp/
├── data/           # Task and project state storage
├── logs/           # Communication logs
├── src/            # Server source code
├── docs/           # Documentation
└── examples/       # Example configurations
```

## Troubleshooting

### Server Won't Start

1. Check Node.js version:
```bash
node --version  # Should be 18.0.0 or higher
```

2. Verify all dependencies installed:
```bash
npm install
```

3. Check for port conflicts or permission issues

### MCP Connection Failed

1. Verify absolute paths in configuration
2. Check server is executable:
```bash
chmod +x src/index.js
```

3. Test server directly:
```bash
node src/index.js
```

### No Tasks Appearing

1. Check role parameter matches ("developer" or "cto")
2. Verify task was created successfully
3. Check logs for errors:
```bash
ls logs/
cat logs/errors-*.jsonl
```

## Role Configuration

The system uses role-based behavior defined in two configuration files:

### `config/agents.json`
Assigns roles to specific AI agents:
```json
{
  "agents": {
    "claude": {"role": "developer"},
    "gemini": {"role": "cto"}
  }
}
```

### `config/roles.json`
Defines what each role does:
- **Developer**: Implements features, writes tests, follows standards
- **CTO**: Reviews code, makes architectural decisions, creates missions
- **Project Manager**: Breaks down objectives, tracks progress
- **QA Engineer**: Tests thoroughly, identifies edge cases
- **Architect**: Designs solutions, establishes patterns

You can modify these files to:
- Switch roles between AIs
- Add new roles
- Customize role behaviors

## Best Practices

1. **Simplified Commands**: Use the `start` command for autonomous workflows
2. **Clear Missions**: Provide specific objectives in plain English
3. **Role Assignment**: Ensure agents are assigned appropriate roles
4. **Monitor Progress**: Check mission status periodically
5. **Regular Backups**: Backup the `data/` directory for important projects

## Next Steps

1. Read the [Architecture Documentation](architecture.md)
2. Review [Example Workflows](workflow-examples.md)
3. Set up your compiler project structure
4. Begin the development cycle with your first real task