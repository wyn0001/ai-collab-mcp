# Simplified Usage Guide

The AI Collaboration MCP Server now supports ultra-simple startup commands. No JSON required!

## Starting Autonomous Workflows

### For Gemini (CTO)

Simply use one of these approaches:

**Option 1: Start with mission directly**
```
@ai-collab start {"agentName": "gemini", "message": "Ensure the compiler handles extreme register pressure correctly"}
```

**Option 2: Interactive start**
```
@ai-collab init {"agentName": "gemini"}
// Gemini will ask: "What is today's mission?"
// You respond: "Ensure the compiler handles extreme register pressure correctly"
```

That's it! Gemini will:
- Understand it's the CTO (from config)
- Create the mission
- Break it down into tasks
- Start monitoring for submissions to review
- Continue autonomously

### For Claude (Developer)

Even simpler - just one command:

```
@ai-collab start {"agentName": "claude"}
```

Claude will:
- Understand it's the Developer (from config)
- Start checking for tasks
- Begin working on any pending tasks
- Continue checking for new work
- Submit implementations
- Handle revisions
- Keep working until the mission is complete

## The Complete Workflow

1. **Human to Gemini**: 
   ```
   @ai-collab start {"agentName": "gemini", "message": "Implement robust error handling throughout the compiler"}
   ```

2. **Human to Claude**:
   ```
   @ai-collab start {"agentName": "claude"}
   ```

3. **That's it!** The AIs will now work autonomously until the mission is complete.

## What Happens Behind the Scenes

### Gemini (CTO) automatically:
- Creates a mission from your message
- Decomposes it into specific tasks
- Monitors for submissions
- Reviews code
- Provides feedback
- Approves or requests revisions

### Claude (Developer) automatically:
- Checks for pending tasks
- Implements solutions
- Runs tests
- Submits work
- Handles revision requests
- Continues until all tasks are complete

## Monitoring Progress

While the AIs work autonomously, you can check status:

```
@ai-collab get_autonomous_status
```

Or view specific mission progress:
```
@ai-collab ai-collab://missions
```

## Role Configuration

The system knows each AI's role from `config/agents.json`:

```json
{
  "agents": {
    "claude": {"role": "developer"},
    "gemini": {"role": "cto"}
  }
}
```

Each role has defined behaviors in `config/roles.json`, including:
- Responsibilities
- Decision-making authority
- Communication style
- Capabilities

## Advanced: Switching Roles

To swap roles between AIs:

1. Edit `config/agents.json`
2. Change role assignments
3. Restart with the new configuration

## Examples

### Example 1: Quick Start
```
Gemini: @ai-collab start {"agentName": "gemini", "message": "Add comprehensive logging to all API endpoints"}
Claude: @ai-collab start {"agentName": "claude"}
// Work proceeds autonomously
```

### Example 2: Complex Mission
```
Gemini: @ai-collab start {"agentName": "gemini", "message": "Refactor the entire register allocation system to handle extreme pressure, spill slots, and virtual registers"}
Claude: @ai-collab start {"agentName": "claude"}
// Multiple iteration cycles proceed autonomously
```

### Example 3: Interactive Start
```
Gemini: @ai-collab init {"agentName": "gemini"}
// Response: "You are the CTO. What is today's mission?"
Gemini: Optimize compiler performance by 50% while maintaining correctness
// Mission starts automatically
```

## Benefits of Simplified System

1. **No JSON construction** - Just natural language missions
2. **Role-aware** - Each AI knows what to do based on their role
3. **Auto-polling** - No need to tell them to check for work
4. **Smart defaults** - Sensible acceptance criteria and iteration limits
5. **Truly autonomous** - One command starts hours of productive work