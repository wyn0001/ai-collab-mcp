# Autonomous Workflow Guide

## 🚀 Quick Start

The simplest way to start autonomous workflows:

**Gemini (CTO):**
```
@ai-collab start {"agentName": "gemini", "message": "Your objective in plain English"}
```

**Claude (Developer):**
```
@ai-collab start {"agentName": "claude"}
```

That's it! The system handles everything else based on preconfigured roles.

## Overview

The AI Collaboration MCP Server supports fully autonomous workflows through missions and role-based task execution. This allows AI agents to work continuously on complex objectives without human intervention.

## Key Concepts

### 1. Roles
Each AI agent is assigned a specific role that defines:
- Responsibilities and capabilities
- Decision-making authority
- Communication style
- Areas of expertise

### 2. Missions
High-level objectives that can span multiple tasks and iterations:
- Automatically decomposed into actionable tasks
- Track progress and acceptance criteria
- Support iterative refinement
- Can run autonomously until completion

### 3. Autonomous Engine
Orchestrates continuous work cycles:
- Polls for pending work
- Routes tasks based on roles
- Manages mission lifecycle
- Tracks iterations and progress

## How Autonomous Workflow Works

### Step 1: Mission Creation (Simplified)

Simply tell the CTO what you want:

```
@ai-collab start {"agentName": "gemini", "message": "Ensure the compiler has an architecturally sound way of managing extreme register pressure"}
```

The system automatically:
- Creates a mission with appropriate acceptance criteria
- Sets reasonable iteration limits
- Enables automatic task decomposition
- Starts the autonomous workflow

No need to construct complex JSON objects!

### Step 2: Automatic Task Decomposition

The mission is automatically broken down into tasks:

1. **Analysis Phase**
   - Review current register management implementation
   - Identify bottlenecks and limitations
   - Document findings

2. **Design Phase**
   - Propose architectural improvements
   - Create design documents
   - Get approval on approach

3. **Implementation Phase**
   - Implement spill slot optimizer
   - Enhance temporary register allocation
   - Improve virtual to physical mapping

4. **Testing Phase**
   - Create stress tests for extreme scenarios
   - Verify no regressions
   - Performance benchmarking

### Step 3: Autonomous Work Cycles

With the simplified system, you don't need to manually poll. After running:
```
@ai-collab start {"agentName": "claude"}
```

The Developer automatically and continuously:
- Checks for pending tasks
- Implements solutions
- Submits work for review
- Handles revision requests
- Continues until the mission is complete

2. **Developer implements and submits:**
```javascript
@ai-collab process_autonomous_action {
  "agentName": "claude",
  "action": {
    "type": "complete_task",
    "submission": {
      "taskId": "TASK-001-analyze",
      "files": { /* implementation */ },
      "summary": "Completed analysis of current register management",
      "testResults": { /* results */ }
    }
  }
}
```

3. **CTO reviews and provides feedback:**
```javascript
@ai-collab process_autonomous_action {
  "agentName": "gemini",
  "action": {
    "type": "review_submission",
    "review": {
      "taskId": "TASK-001-analyze",
      "status": "approved",
      "feedback": "Good analysis. Proceed with design phase."
    }
  }
}
```

4. **System checks mission progress:**
```javascript
@ai-collab check_mission_progress {"missionId": "MISSION-1234567890"}
// Updates progress, checks acceptance criteria
```

### Step 4: Iteration Until Completion

The cycle continues automatically:
- New tasks are created as needed
- Revisions are handled through the review process
- Questions are asked and answered asynchronously
- Progress is tracked against acceptance criteria

The mission completes when:
- All tasks are completed
- All acceptance criteria are met
- Or maximum iterations are reached

## Example: Register Pressure Management Mission

### Initial Setup (Human)
```
Gemini: "Today, you must ensure that the compiler has an architecturally sound way of managing extreme register pressure..."
```

### Autonomous Execution

**Iteration 1: Analysis**
- Claude analyzes existing code
- Identifies issues with spill slot conflicts
- Submits findings

**Iteration 2: Design**
- Gemini reviews analysis
- Creates design tasks for improvements
- Claude proposes new architecture

**Iteration 3-5: Implementation**
- Claude implements spill slot optimizer
- Gemini requests changes for edge cases
- Claude refines implementation

**Iteration 6-8: Testing**
- Claude adds comprehensive tests
- Discovers performance regression
- Implements optimization

**Iteration 9: Final Review**
- All tests pass
- Performance benchmarks meet targets
- Gemini approves final implementation

**Mission Complete**
- All acceptance criteria met
- No regression to test suite
- Architecture documented

## Monitoring Autonomous Work

### Check Status
```javascript
@ai-collab get_autonomous_status
// Shows all active missions and workflows
```

### View Mission Progress
```javascript
@ai-collab ai-collab://missions/MISSION-1234567890
// Detailed mission status and history
```

### Review Logs
```javascript
@ai-collab ai-collab://logs
// All autonomous actions and decisions
```

## Configuration

### Switching Roles
You can swap roles between agents:

```javascript
// In config/agents.json
{
  "team_configurations": {
    "reversed": {
      "claude": "cto",
      "gemini": "developer"
    }
  }
}
```

### Adding New Roles
Define new roles in `config/roles.json`:
- Project Manager for task breakdown
- QA Engineer for comprehensive testing
- Architect for design decisions

## Best Practices

1. **Clear Acceptance Criteria**: Define specific, measurable criteria
2. **Reasonable Iterations**: Set appropriate limits to prevent infinite loops
3. **Regular Monitoring**: Check progress periodically
4. **Role Alignment**: Ensure agents are assigned appropriate roles
5. **Mission Scope**: Keep missions focused but comprehensive

## Limitations and Considerations

1. **Context Windows**: Large missions may exceed context limits
2. **Decision Making**: Complex architectural decisions may need human input
3. **Conflict Resolution**: Disagreements between agents need escalation paths
4. **Resource Management**: Monitor for excessive iterations or stuck workflows

## Advanced Features

### Multi-Agent Missions
Missions can involve multiple agents:
- Project Manager decomposes
- Developer implements
- QA Engineer tests
- CTO approves

### Conditional Workflows
Missions can have conditional paths:
- If performance degrades, optimize
- If tests fail, debug
- If design rejected, revise

### Parallel Execution
Multiple missions can run simultaneously:
- Frontend development
- Backend API
- Documentation updates