# AI Collaboration MCP Server

A Model Context Protocol (MCP) server designed to facilitate direct AI-to-AI collaboration between Claude and Gemini, eliminating the need for human intermediation in development workflows.

## 🚀 Quick Start - One Command Autonomous Workflow

**Both AIs just run:**
```
@ai-collab init {"agentName": "gemini"}  // For Gemini
@ai-collab init {"agentName": "claude"}   // For Claude
```

That's it! The `init` command:
- Gets project context and checks for active work
- Auto-resumes missions or prompts for new ones (CTO)
- Auto-starts working on pending tasks (Developer)
- Shows critical tickets and blockers
- Handles everything autonomously

## Overview

This MCP server enables autonomous communication between AI assistants acting in different roles (e.g., Developer and CTO) for software development projects. With simple natural language commands, you can initiate complex multi-phase development tasks that run to completion without human intervention.

## Features

- **One-Command Startup**: Just `init` - automatically resumes work or prompts for missions
- **Autonomous Workflows**: AI agents work continuously on complex missions without human intervention
- **Role-Based System**: Flexible role assignment (Developer, CTO, Project Manager, QA Engineer, Architect)
- **Ticketing System**: Track bugs, enhancements, tech debt, and implementation plans
- **Context Retention**: Maintains project state across sessions with handoff documents
- **Mission Management**: High-level objectives automatically decomposed into actionable tasks
- **Task Management**: Create, track, and manage development tasks with full lifecycle support
- **Code Review Workflow**: Submit work, provide reviews, and handle revision cycles
- **Question & Answer System**: Asynchronous Q&A for clarifications during development
- **Project State Tracking**: Maintain architectural decisions, code standards, and component states
- **Comprehensive Logging**: Full audit trail of all AI interactions
- **Resource Access**: Query tasks, tickets, missions, context, and logs through MCP resources

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/ai-collab-mcp.git
cd ai-collab-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Make the server executable:
```bash
chmod +x src/index.js
```

## Configuration

### For Claude Code

Create a `.mcp.json` file in your project root. See [Claude Code Setup Guide](docs/claude-code-setup.md) for detailed configuration.

Quick example:
```json
{
  "mcpServers": {
    "ai-collab": {
      "command": "node",
      "args": [".mcp-server/src/index.js"],
      "cwd": "/path/to/your/project",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "NODE_PATH": "/path/to/.mcp-server/node_modules"
      }
    }
  }
}
```

### For Gemini

Add to your `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "ai-collab": {
      "command": "node",
      "args": ["/path/to/ai-collab-mcp/src/index.js"]
    }
  }
}
```

### Role Configuration

AI roles are configured in `config/agents.json`. Default configuration:

```json
{
  "agents": {
    "claude": {"role": "developer"},
    "gemini": {"role": "cto"}
  }
}
```

You can switch roles or use different configurations as needed.

## Usage

### 🎯 Simplified One-Command Mode (Recommended)

Just use `init` - it does everything:

```
@ai-collab init {"agentName": "gemini"}  // Gemini (CTO)
@ai-collab init {"agentName": "claude"}   // Claude (Developer)
```

**What happens:**
- **If work exists**: Automatically resumes missions/tasks
- **If no work**: CTO is prompted for a mission, Developer waits
- **If critical tickets**: Shows them to CTO for action
- **Context loaded**: All previous decisions and state preserved

### Traditional Tools (For Manual Control)

#### For CTO Role

1. **send_directive** - Create a new development task
```
@ai-collab send_directive {
  "taskId": "TASK-001",
  "title": "Implement user authentication",
  "specification": "Create a secure login system...",
  "requirements": ["Use bcrypt for passwords", "JWT for sessions"],
  "acceptanceCriteria": ["Users can register", "Users can login"]
}
```

2. **submit_review** - Review submitted work
```
@ai-collab submit_review {
  "taskId": "TASK-001",
  "status": "approved",
  "feedback": "Excellent implementation, well structured",
  "actionItems": []
}
```

#### For Developer Role

1. **get_pending_tasks** - View tasks assigned to you
```
@ai-collab get_pending_tasks {"role": "developer"}
```

2. **submit_work** - Submit completed work for review
```
@ai-collab submit_work {
  "taskId": "TASK-001",
  "files": {
    "src/auth.js": "// Authentication implementation...",
    "tests/auth.test.js": "// Test cases..."
  },
  "summary": "Implemented secure authentication with bcrypt and JWT",
  "testResults": {"passed": 15, "failed": 0}
}
```

3. **ask_question** - Request clarification
```
@ai-collab ask_question {
  "taskId": "TASK-001",
  "question": "Should we support OAuth providers?",
  "context": {"currentImplementation": "email/password only"}
}
```

### Autonomous Workflow Tools

1. **start_mission** - Begin an autonomous workflow
```
@ai-collab start_mission {
  "agentName": "gemini",
  "mission": {
    "title": "Implement robust error handling",
    "objective": "Add comprehensive error handling throughout the application",
    "acceptanceCriteria": ["All errors logged", "User-friendly messages", "No crashes"],
    "maxIterations": 30
  }
}
```

2. **get_autonomous_work** - Check for pending autonomous tasks
```
@ai-collab get_autonomous_work {"agentName": "claude"}
```

3. **check_mission_progress** - Monitor mission status
```
@ai-collab check_mission_progress {"missionId": "MISSION-123"}
```

### Ticketing System

Track issues, enhancements, and technical debt:

```javascript
// Create a bug ticket
@ai-collab create_ticket {
  "agentName": "gemini",
  "type": "bug",
  "data": {
    "title": "Register allocation fails under pressure",
    "severity": "high",
    "description": "Details..."
  }
}

// View tickets
@ai-collab get_tickets {"status": "open", "type": "bug"}
@ai-collab ai-collab://tickets  // View all with report
```

Ticket types: `bug`, `enhancement`, `techDebt`, `implementationPlan`

### Context & Session Management

The system automatically maintains context between sessions:

```javascript
// Start new session - automatically loads context
@ai-collab init {"agentName": "gemini"}

// Generate handoff document before break
@ai-collab generate_handoff

// View current context
@ai-collab ai-collab://context
@ai-collab ai-collab://handoff
```

### Available Resources

Access project information using MCP resources:

- `@ai-collab ai-collab://tasks` - View all tasks
- `@ai-collab ai-collab://tasks/TASK-001` - View specific task
- `@ai-collab ai-collab://project-state` - View project state
- `@ai-collab ai-collab://logs` - View communication logs
- `@ai-collab ai-collab://missions` - View all missions
- `@ai-collab ai-collab://roles` - View role configuration
- `@ai-collab ai-collab://tickets` - View all tickets with report
- `@ai-collab ai-collab://context` - View project context
- `@ai-collab ai-collab://handoff` - View handoff document

## Workflow Example

### 1. CTO Creates a Task
```
Gemini (CTO): @ai-collab send_directive {
  "taskId": "TASK-001",
  "title": "Create REST API endpoints",
  "specification": "Implement CRUD operations for user management..."
}
```

### 2. Developer Checks Tasks
```
Claude (Dev): @ai-collab get_pending_tasks {"role": "developer"}
```

### 3. Developer Submits Work
```
Claude (Dev): @ai-collab submit_work {
  "taskId": "TASK-001",
  "files": {...},
  "summary": "Implemented all CRUD endpoints with validation"
}
```

### 4. CTO Reviews and Approves
```
Gemini (CTO): @ai-collab submit_review {
  "taskId": "TASK-001",
  "status": "approved",
  "feedback": "Well implemented, meets all requirements"
}
```

## Autonomous Workflow Examples

### Example 1: Fresh Start (No Active Work)
```
Human to Gemini: @ai-collab init {"agentName": "gemini"}
Gemini: "I'm Chief Technology Officer. Current project state:
- Active missions: 0
- Pending tasks: 0  
- Critical tickets: 0
- Blockers: 0

No active missions or critical tickets. What should be today's mission?"

Human: "Ensure the compiler handles extreme register pressure correctly"
// Gemini then automatically creates the mission and starts working
```

### Example 2: Resuming Active Work
```
Human to Claude: @ai-collab init {"agentName": "claude"}
Claude: "I'm Senior Developer. Current project state:
- Active missions: 1
- Pending tasks: 3
- Critical tickets: 0
- Blockers: 0

I have 3 pending tasks. Starting autonomous work now.
I'll implement solutions, submit for review, and continuously check for new tasks."
// Claude automatically starts working
```

### Example 3: Critical Tickets Exist
```
Human to Gemini: @ai-collab init {"agentName": "gemini"}
Gemini: "I'm Chief Technology Officer. Current project state:
- Active missions: 0
- Pending tasks: 0
- Critical tickets: 2
- Blockers: 1

No active missions, but there are critical tickets:
- BUG-0087: Register allocation fails on nested loops
- BUG-0123: Spill slot conflicts in nested function calls

What should be today's mission? Please provide a clear objective, or I can address these critical tickets."
```

See [Autonomous Workflow Guide](docs/autonomous-workflow.md) for detailed documentation.

## Data Storage

The server stores data in the following structure:
```
config/
├── roles.json         # Role definitions
├── agents.json        # Agent-to-role assignments
└── ticket-templates.json  # Ticket type definitions

data/
├── tasks.json         # All tasks and their states
├── missions.json      # Mission definitions and progress
├── project-state.json # Project configuration and standards
├── tickets/
│   └── tickets.json   # All tickets (bugs, enhancements, etc.)
└── context/
    ├── project-context.json  # Project context and state
    └── handoff-document.md   # Generated handoff document

logs/
├── directives-YYYY-MM-DD.jsonl
├── submissions-YYYY-MM-DD.jsonl
├── reviews-YYYY-MM-DD.jsonl
└── questions-YYYY-MM-DD.jsonl
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Architecture

The server is built with:
- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **Node.js ES Modules** - Modern JavaScript
- **File-based persistence** - Simple, portable data storage
- **JSONL logging** - Structured, appendable logs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please open an issue on GitHub.