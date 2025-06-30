# AI Collaboration MCP Server

**🚧 Work in Progress - Active Development 🚧**

A Model Context Protocol (MCP) server designed to facilitate direct AI-to-AI collaboration between Claude and Gemini, eliminating the need for human intermediation in development workflows.

> **Note**: This project is under active development. While core features are functional, some aspects are still being refined. Contributions and feedback are welcome!

## 🎯 Project Goal

Enable truly autonomous AI-to-AI collaboration where:
- AI agents work continuously on complex projects
- Human intervention is minimal (ideally just starting the process)
- Agents create comprehensive project plans and execute 100+ phases autonomously
- Work continues until project completion or critical blocker

## 🚀 Quick Start

**Both AIs just run:**
```
@ai-collab init {"agentName": "gemini", "autonomous": true}  // For Gemini (CTO)
@ai-collab init {"agentName": "claude", "autonomous": true}   // For Claude (Developer)
```

That's it! The `init` command:
- Loads existing project context and state
- Creates or resumes a comprehensive project plan
- Automatically detects and continues pending work
- Shows critical tickets and blockers
- Starts autonomous execution loops

## 🌟 Recent Enhancements

### Autonomous Loop System (NEW!)
- **120-second check intervals** for more natural workflow pacing
- **500 iteration maximum** for extended autonomous operation
- **Continuous work mode** - agents keep working until project completion
- **Manual loop execution** - requires human to run check commands (automation WIP)

### Project Plan Management (NEW!)
- **Auto-generated 6-phase plans** from PROJECT_REQUIREMENTS.md
- **Smart phase progression** - automatically moves to next phase when complete
- **Duplicate task detection** - prevents recreating completed features
- **Ad-hoc mission support** - pause main plan for urgent tasks

### Enhanced Validation
- **Ticket vs Task distinction** - prevents confusion between bug reports and work items
- **Role-based instructions** - clearer guidance for CTO vs Developer roles
- **Workflow enforcement** - ensures proper task creation and submission flow

## ⚠️ Current Limitations

### Automation Challenges
- **Manual loop execution required** - AI agents can't schedule their own checks
- **PATH configuration needed** - Claude/Gemini commands must be accessible
- **API quota limits** - Gemini has daily request limits that may be exceeded

### Known Issues
- Agents occasionally create duplicate tasks (improved but not eliminated)
- Edit button functionality may need manual verification
- Some agents get confused about their role without explicit instructions

### Workarounds Available
- Automation scripts provided (`mcp-automator.js`) but require setup
- Manual loop execution instructions included
- Simulation mode for tracking when automation fails

## Features

- **Comprehensive Project Plans**: 100+ phase autonomous execution capability
- **One-Command Startup**: Just `init` with autonomous flag
- **Role-Based System**: CTO, Developer, PM, QA, Architect roles
- **Smart Task Management**: Duplicate detection and phase progression
- **Ticketing System**: Track bugs, enhancements, tech debt
- **Context Retention**: Maintains state across sessions
- **Mission Management**: High-level objectives with auto-decomposition
- **Code Review Workflow**: Submit, review, and revision cycles
- **Question & Answer System**: Asynchronous clarifications
- **Comprehensive Logging**: Full audit trail

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

Create a `.mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "ai-collab": {
      "command": "node",
      "args": [".mcp-server/src/index.js"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### For Gemini

Configure in `~/.gemini/settings.json`:

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

**Note**: Gemini may require explicit instructions to execute MCP commands.

## Usage

### 🎯 Autonomous Mode (Recommended)

Start with autonomous flag for continuous operation:

```
# Terminal 1 - Claude (Developer)
@ai-collab init {"agentName": "claude", "autonomous": true}

# Terminal 2 - Gemini (CTO)  
@ai-collab init {"agentName": "gemini", "autonomous": true}

# Terminal 3 - Manual Loop Execution (Required)
# Every 120 seconds, run:
@ai-collab get_loop_status {"agentName": "claude"}
@ai-collab get_loop_status {"agentName": "gemini"}
```

### Automation Helpers (Experimental)

For reduced manual intervention:

```bash
# Run automation script (requires setup)
cd /path/to/project
node mcp-automator.js auto

# Or simulation mode (shows what would happen)
node mcp-automator-v2.js auto
```

See [AUTOMATION.md](AUTOMATION.md) for setup details.

### Traditional Commands

#### CTO Tools
- `send_directive` - Create development tasks
- `review_work` - Review submissions
- `create_project_plan` - Start comprehensive plan
- `update_plan_progress` - Move to next phase

#### Developer Tools  
- `get_all_tasks` - View assigned work
- `submit_work` - Submit completed tasks
- `ask_question` - Request clarification

## Project Plan Workflow

1. **Automatic Plan Creation**: On first init, generates 6-phase plan from requirements
2. **Phase Progression**: Automatically advances when all phase tasks complete
3. **Duplicate Prevention**: Skips tasks that match completed work
4. **Ad-hoc Missions**: Can pause main plan for urgent work

Example phases:
- Foundation & Basic Structure
- Core Interactive Features  
- UI/UX Enhancement
- Data Persistence
- Advanced Features
- Polish & Quality Assurance

## Data Storage

```
data/
├── tasks.json              # Task tracking
├── missions.json           # Active missions
├── project-state.json      # Project configuration
├── project-plans.json      # Comprehensive plans (NEW)
├── loop-states.json        # Autonomous loop tracking (NEW)
└── tickets/
    └── tickets.json        # Bug/enhancement tracking
```

## Troubleshooting

### Gemini Not Executing Commands
- Prefix with: "Execute the following MCP command:"
- Or: "Use the ai-collab tool to run:"

### Duplicate Task Creation
- System now detects similar task names
- Manually clean duplicates from `data/tasks.json` if needed

### Loop Not Continuing
- Ensure 120-second intervals between checks
- Verify agent hasn't exceeded maxIterations (500)
- Check API quotas haven't been exceeded

## Contributing

This project needs help with:
- True automation (removing manual loop execution)
- Better Gemini CLI integration
- Improved duplicate detection algorithms
- Cross-platform automation scripts

1. Fork the repository
2. Create feature branch (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -m 'Add improvement'`)
4. Push branch (`git push origin feature/improvement`)
5. Open Pull Request

## Roadmap

- [ ] Native scheduling in MCP server
- [ ] WebSocket/SSE for real-time updates
- [ ] Improved role switching
- [ ] Better error recovery
- [ ] Multi-project support
- [ ] Visual progress dashboard

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Remember**: This is an experimental project pushing the boundaries of AI collaboration. Expect rough edges but exciting possibilities!