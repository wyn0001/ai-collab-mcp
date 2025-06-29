# Architecture Overview

## System Design

The AI Collaboration MCP Server follows a modular architecture designed for extensibility and maintainability.

```
┌─────────────────┐     ┌─────────────────┐
│   Claude Code   │     │   Gemini CLI    │
│   (Developer)   │     │     (CTO)       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │      MCP Protocol     │
         └───────────┬───────────┘
                     │
          ┌──────────┴──────────┐
          │   MCP Server Core   │
          │    (index.js)       │
          └──────────┬──────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───┴────┐    ┌─────┴──────┐   ┌────┴────┐
│  Role   │    │Autonomous  │   │ Mission │
│Manager  │    │  Engine    │   │ Manager │
└────┬────┘    └─────┬──────┘   └────┬────┘
     │               │                │
     └───────────────┼────────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
│TaskQueue  │ │ProjectState│ │  Logger   │
│Component  │ │ Component  │ │Component  │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │              │              │
      ├──────────────┼──────────────┤
      │              │              │
┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
│  Ticket   │ │  Context   │ │File System│
│  Manager  │ │  Manager   │ │  Storage  │
└───────────┘ └────────────┘ └───────────┘
```

## Core Components

### 1. MCP Server Core (`index.js`)

The main server implementation that:
- Handles MCP protocol communication
- Routes tool calls to appropriate handlers
- Manages resource requests
- Provides error handling and logging

### 2. Task Queue (`taskQueue.js`)

Manages the complete lifecycle of development tasks:
- **Directives**: Tasks created by CTO
- **Submissions**: Work submitted by developers
- **Reviews**: Feedback from CTO
- **Questions**: Clarification requests

Key features:
- Persistent storage of all task data
- State transitions (pending → in_review → completed/needs_revision)
- Role-based task filtering
- Question/answer tracking

### 3. Project State (`projectState.js`)

Maintains project-wide information:
- **Components**: State of each system component
- **Architecture**: Decisions, patterns, dependencies
- **Code Standards**: Conventions, linting rules, formatting
- **Metadata**: Version, timestamps

### 4. Communication Logger (`logger.js`)

Provides comprehensive audit trail:
- JSONL format for efficient appending
- Daily log rotation
- Type-based log segregation
- Report generation capabilities

### 5. Role Manager (`roleManager.js`)

Manages role-based behavior and assignments:
- **Role Definitions**: Responsibilities, capabilities, decision authority
- **Agent Assignment**: Maps AI agents to specific roles
- **Context Generation**: Provides role-specific context and instructions
- **Configuration**: Supports multiple team configurations

### 6. Mission Manager (`missionManager.js`)

Handles high-level autonomous workflows:
- **Mission Creation**: Converts objectives into trackable missions
- **Progress Tracking**: Monitors iteration counts and completion
- **Acceptance Criteria**: Validates when missions are complete
- **Auto-Decomposition**: Breaks missions into actionable tasks

### 7. Autonomous Engine (`autonomousEngine.js`)

Orchestrates continuous autonomous work:
- **Work Cycles**: Manages polling and task distribution
- **Role-Based Routing**: Directs work to appropriate agents
- **Mission Lifecycle**: Controls mission execution flow
- **Event Management**: Emits events for workflow stages

### 8. Ticket Manager (`ticketManager.js`)

Comprehensive issue and enhancement tracking:
- **Ticket Types**: Bugs, enhancements, technical debt, implementation plans
- **Status Management**: Open, in-progress, resolved states
- **Linking**: Connect tickets to missions and tasks
- **Reporting**: Generate summaries and priority lists

### 9. Context Manager (`contextManager.js`)

Maintains project continuity across sessions:
- **State Capture**: Snapshots current project state
- **Handoff Documents**: Generates markdown summaries
- **Onboarding**: Provides quick-start information
- **History Tracking**: Maintains decision and change history

## Data Flow

### Autonomous Initialization Flow
1. Agent calls `init` command
2. Context Manager captures current state
3. System checks for active missions/tasks
4. Auto-resumes work or prompts for input
5. Continuous work cycles begin

### Mission-Driven Flow
1. CTO provides mission objective via `init`
2. Mission Manager creates trackable mission
3. Mission auto-decomposes into tasks
4. Tasks queued for developer
5. Autonomous Engine manages execution cycles

### Ticket Creation Flow
1. Any agent identifies issue/enhancement
2. Creates ticket with appropriate type
3. Ticket linked to active mission/task
4. Ticket appears in reports and context
5. Critical tickets influence mission priority

### Context Retention Flow
1. All significant events update context
2. Handoff documents generated on demand
3. New sessions load full context
4. Work continues from exact state
5. History preserved for decisions

## Storage Design

### File Structure
```
config/
├── roles.json              # Role definitions and behaviors
├── agents.json             # Agent-to-role assignments
└── ticket-templates.json   # Ticket type schemas

data/
├── tasks.json              # All task data
├── missions.json           # Mission definitions and progress
├── project-state.json      # Project configuration
├── tickets/
│   └── tickets.json        # All tickets (bugs, enhancements, etc.)
└── context/
    ├── project-context.json    # Current project context
    └── handoff-document.md     # Generated handoff document

logs/
├── directives-YYYY-MM-DD.jsonl
├── submissions-YYYY-MM-DD.jsonl
├── reviews-YYYY-MM-DD.jsonl
├── questions-YYYY-MM-DD.jsonl
├── tickets-YYYY-MM-DD.jsonl
└── errors-YYYY-MM-DD.jsonl
```

### Task Schema
```json
{
  "TASK-001": {
    "taskId": "TASK-001",
    "title": "Task title",
    "specification": "Detailed spec",
    "requirements": [],
    "acceptanceCriteria": [],
    "status": "pending|in_review|completed|needs_revision",
    "createdAt": "ISO-8601",
    "submissions": [],
    "reviews": [],
    "questions": []
  }
}
```

### Mission Schema
```json
{
  "MISSION-1234567890": {
    "id": "MISSION-1234567890",
    "title": "Mission title",
    "objective": "High-level objective",
    "acceptanceCriteria": [],
    "constraints": [],
    "status": "active|completed|stopped",
    "createdAt": "ISO-8601",
    "tasks": ["TASK-001", "TASK-002"],
    "iterations": 0,
    "maxIterations": 50,
    "decisions": []
  }
}
```

### Ticket Schema
```json
{
  "BUG-0001": {
    "id": "BUG-0001",
    "type": "bug|enhancement|techDebt|implementationPlan",
    "status": "open|in_progress|resolved",
    "createdBy": "agentName",
    "createdAt": "ISO-8601",
    "data": {
      "title": "Ticket title",
      "description": "Details",
      "priority": "critical|high|medium|low"
    },
    "history": [],
    "linkedItems": {
      "tickets": [],
      "tasks": [],
      "missions": []
    }
  }
}
```

## Security Considerations

1. **Input Validation**: All tool inputs are validated
2. **File System Isolation**: Data stored in designated directories
3. **Error Handling**: Graceful error handling prevents crashes
4. **Audit Trail**: Complete logging of all operations

## Extensibility

The architecture supports easy extension through:
1. New tool handlers in the main server
2. Additional resource types
3. Custom logger implementations
4. Alternative storage backends
5. New ticket types in ticket-templates.json
6. Additional roles in roles.json
7. Custom mission decomposition strategies
8. Enhanced context capture mechanisms

## Performance Considerations

1. **File-based Storage**: Simple but may need optimization for large projects
2. **JSONL Logs**: Efficient append-only operations
3. **In-memory Caching**: Could be added for frequently accessed data
4. **Async Operations**: All I/O operations are asynchronous