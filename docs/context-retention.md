# Context Retention and Handoff Documentation

## Overview

The Context Retention system ensures continuity across sessions, making it possible for AI agents to pick up where they left off, even after extended breaks or when switching between projects. This system maintains project state, tracks decisions, and generates comprehensive handoff documents.

## Key Components

### 1. Project Context
Persistent storage of:
- Project metadata (name, description, dates)
- Current state (active work, blockers)
- Key information (architecture, conventions)
- Historical decisions and changes

### 2. Handoff Documents
Auto-generated markdown documents containing:
- Project overview
- Current work status
- Recent decisions
- Active blockers
- Quick-start commands

### 3. Onboarding Summaries
Structured data for quickly getting up to speed:
- Role-specific quick-start guides
- Current priorities
- Recent history

## Using the Context System

### Getting Current Context

When starting a new session, both agents should first get context:

```javascript
// CTO gets context
@ai-collab get_context {"agentName": "gemini"}

// Developer gets context  
@ai-collab get_context {"agentName": "claude"}

// Returns comprehensive summary including:
// - Project overview
// - Active missions and tasks
// - Recent architectural decisions
// - Current blockers
// - Path to handoff document
```

### Updating Project Context

As significant events occur, update the context:

```javascript
// Update project information
@ai-collab update_context {
  "updates": {
    "project": {
      "name": "Advanced Compiler",
      "description": "High-performance compiler with advanced optimizations"
    }
  }
}

// Record key architectural decision
@ai-collab update_context {
  "updates": {
    "keyInformation": {
      "architecture": {
        "registerAllocation": "SSA-based with graph coloring",
        "optimizationPipeline": "Three-phase: Analysis, Transform, Codegen"
      },
      "criticalPaths": [
        "Register allocator performance",
        "SSA construction correctness"
      ]
    }
  }
}
```

### Generating Handoff Documents

Create a comprehensive handoff document:

```javascript
@ai-collab generate_handoff

// Creates a markdown document with:
// - Project overview
// - Current state of all work
// - Ticket summary
// - Architectural decisions
// - Next steps
// - Quick-start commands
```

### Viewing Context Resources

```javascript
// View full context data
@ai-collab ai-collab://context

// View generated handoff document
@ai-collab ai-collab://handoff
```

## Automatic Context Capture

The system automatically captures:

### 1. Mission Progress
- Active missions and their iteration count
- Progress towards completion
- Blockers or stalled missions

### 2. Task Status
- In-progress and pending tasks
- Recent completions
- Review cycles

### 3. Architectural Decisions
- Recent technical decisions
- Rationale and implications
- Implementation choices

### 4. Ticket Status
- Open bugs and their severity
- Enhancement requests
- Technical debt tracking

## Session Continuity Workflow

### Starting a New Session

```javascript
// 1. Both agents get context
Gemini: @ai-collab get_context {"agentName": "gemini"}
Claude: @ai-collab get_context {"agentName": "claude"}

// 2. Review handoff document
Gemini: @ai-collab ai-collab://handoff

// 3. Check active missions
Gemini: @ai-collab get_autonomous_status

// 4. Resume work
Gemini: @ai-collab start {"agentName": "gemini"}
Claude: @ai-collab start {"agentName": "claude"}
```

### Ending a Session

```javascript
// 1. CTO generates handoff
Gemini: @ai-collab generate_handoff

// 2. Update any final context
Gemini: @ai-collab update_context {
  "updates": {
    "additionalNotes": "Pausing work on register allocator. Next session should focus on SSA destruction phase."
  }
}

// 3. System automatically captures current state
```

## Handoff Document Structure

The generated handoff document includes:

```markdown
# Project Handoff Document
Generated: [timestamp]

## Project Overview
- Name, description, timeline
- Key objectives

## Current State
### Active Missions
- Mission IDs, titles, progress
- Iteration counts

### In-Progress Tasks  
- Task IDs, titles, status
- Assigned roles

### Recent Architectural Decisions
- Decision IDs and summaries
- Implementation implications

### Current Blockers
- Type, description, severity
- Recommended actions

## Ticket Summary
- Count by type and status
- Critical items requiring attention

## Key Information
- Architecture decisions
- Coding conventions
- Critical paths

## Next Steps
- Prioritized action items
- Recommended focus areas

## Quick Start Commands
- Role-specific commands to resume work
```

## Best Practices

### 1. Regular Context Updates
- Update context after major decisions
- Record architectural changes
- Note critical paths and dependencies

### 2. Session Management
- Always start sessions with context retrieval
- Generate handoffs before extended breaks
- Update additional notes with session insights

### 3. Decision Documentation
- Record why decisions were made
- Note alternatives considered
- Document trade-offs

### 4. Blocker Tracking
- System automatically identifies some blockers
- Manually add complex blockers
- Include resolution strategies

## Integration with Autonomous Workflows

Context retention enhances autonomous workflows by:

1. **Continuity**: Missions can span multiple sessions
2. **Knowledge Preservation**: Decisions aren't lost
3. **Onboarding**: New sessions start with full context
4. **Handoffs**: Smooth transitions between work sessions

## Example: Multi-Session Mission

### Session 1
```javascript
// Start mission
Gemini: @ai-collab start {"agentName": "gemini", "message": "Implement advanced register allocation"}

// Work progresses...
// Session ends after 20 iterations

// Generate handoff
Gemini: @ai-collab generate_handoff
```

### Session 2 (Next Day)
```javascript
// Get context
Gemini: @ai-collab get_context {"agentName": "gemini"}
// Shows: Mission at iteration 20/50, SSA construction complete, working on allocation

// Resume exactly where left off
Gemini: @ai-collab start {"agentName": "gemini"}
Claude: @ai-collab start {"agentName": "claude"}

// Work continues from iteration 21...
```

## Context for Different Roles

### CTO Context Focus
- Mission progress and blockers
- Architectural decisions needed
- High-priority tickets
- Team productivity metrics

### Developer Context Focus  
- Assigned tasks and priorities
- Recent code reviews
- Technical decisions affecting implementation
- Blocking issues

### Project Manager Context Focus
- Overall project timeline
- Resource allocation
- Cross-functional dependencies
- Risk assessment

The context system ensures no knowledge is lost and every session builds on previous work efficiently.