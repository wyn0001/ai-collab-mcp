# Ticketing Workflow Example: Register Pressure Management

This example shows how the ticketing system enhances the autonomous workflow for managing register pressure issues.

## Scenario Setup

The CTO (Gemini) starts a mission to handle register pressure, and during development, various tickets are created and managed.

## Step 1: Mission Start with Context

```javascript
// CTO starts the day by checking context
Gemini: @ai-collab get_context {"agentName": "gemini"}

// Reviews existing tickets
Gemini: @ai-collab get_tickets {"type": "bug", "status": "open"}

// Sees BUG-0087: "Register allocation fails on nested loops"
// Decides to address this with a comprehensive solution

Gemini: @ai-collab start {
  "agentName": "gemini", 
  "message": "Ensure the compiler handles extreme register pressure correctly, addressing BUG-0087 and related issues"
}
```

## Step 2: Developer Discovers Additional Issues

```javascript
// Developer starts work
Claude: @ai-collab start {"agentName": "claude"}

// While analyzing, discovers multiple related issues
// Creates a bug ticket for immediate issue
Claude: @ai-collab create_ticket {
  "agentName": "claude",
  "type": "bug",
  "data": {
    "title": "Spill slot conflicts in nested function calls",
    "description": "When functions are nested 3+ levels deep with high register pressure, spill slots can conflict",
    "stepsToReproduce": [
      "Create function A calling B calling C",
      "Each function uses 15+ local variables",
      "Enable optimization level 2"
    ],
    "expectedBehavior": "Each function should have isolated spill slots",
    "actualBehavior": "Spill slots overlap causing corruption",
    "severity": "critical",
    "affectedComponents": ["spill_manager", "call_stack_handler"]
  }
}
// Response: Created bug ticket: BUG-0123

// Links to current mission
Claude: @ai-collab link_ticket_to_mission {
  "ticketId": "BUG-0123",
  "missionId": "MISSION-1234567890"
}
```

## Step 3: CTO Reviews and Creates Tech Debt Ticket

```javascript
// During code review, CTO notices suboptimal implementation
Gemini: "The current spill slot allocator works but uses O(n²) algorithm. Creating tech debt ticket for future optimization."

@ai-collab create_ticket {
  "agentName": "gemini",
  "type": "techDebt",
  "data": {
    "title": "Optimize spill slot allocation algorithm",
    "description": "Current nested loop approach doesn't scale well",
    "currentState": "Nested loops checking every slot against every variable",
    "desiredState": "Graph coloring or interval tree approach for O(n log n)",
    "impact": {
      "performance": "Compilation time increases quadratically with function size",
      "scalability": "Large functions (1000+ variables) take minutes to compile"
    },
    "priority": "low",
    "estimatedEffort": "medium",
    "riskOfNotAddressing": "Poor developer experience for large generated code"
  }
}
// Response: Created techDebt ticket: DEBT-0045

// Continue with current review
"For now, the implementation is correct. We'll optimize this in a future iteration. Approving with minor revisions."
```

## Step 4: Architect Creates Implementation Plan

```javascript
// CTO decides comprehensive redesign is needed
Gemini: @ai-collab create_ticket {
  "agentName": "gemini",
  "type": "implementationPlan",
  "data": {
    "title": "Comprehensive Register Pressure Management System",
    "relatedTickets": ["BUG-0087", "BUG-0123", "DEBT-0045"],
    "overview": "Redesign register allocation to handle extreme pressure gracefully",
    "technicalDesign": {
      "architecture": "Multi-phase approach: Pressure analysis → Spill decision → Slot allocation → Verification",
      "dataFlow": "IR → Liveness Analysis → Pressure Points → Spill Decisions → Allocated IR",
      "interfaces": "New RegisterPressureAnalyzer, SpillManager, SlotAllocator interfaces",
      "algorithms": "SSA-based liveness, Graph coloring for slots, Pressure prediction heuristics"
    },
    "implementationSteps": [
      "Phase 1: Implement pressure point detection",
      "Phase 2: Create intelligent spill decision maker",
      "Phase 3: Implement conflict-free slot allocator",
      "Phase 4: Add verification and recovery mechanisms",
      "Phase 5: Performance optimization",
      "Phase 6: Comprehensive testing"
    ],
    "testingStrategy": "Unit tests per component, Integration tests with nested functions, Stress tests with 1000+ variables, Benchmark suite",
    "risks": [
      "Breaking existing optimizations",
      "Performance regression for simple cases",
      "Complexity increase"
    ],
    "estimatedTimeline": "2-3 weeks for full implementation"
  }
}
// Response: Created implementationPlan ticket: IMPL-0012
```

## Step 5: Developer Creates Enhancement

```javascript
// While implementing, developer has an idea
Claude: @ai-collab create_ticket {
  "agentName": "claude",
  "type": "enhancement",
  "data": {
    "title": "Add register pressure visualization tool",
    "objective": "Help developers understand register pressure in their code",
    "rationale": "Would make debugging register allocation issues much easier",
    "proposedSolution": "Generate heat map showing register pressure at each program point",
    "acceptanceCriteria": [
      "Generates visual representation",
      "Shows pressure points",
      "Indicates spill decisions"
    ],
    "priority": "wishlist",
    "estimatedEffort": "medium",
    "dependencies": ["IMPL-0012"]
  }
}
// Response: Created enhancement ticket: ENH-0234
```

## Step 6: Progress Tracking

```javascript
// CTO checks ticket status mid-mission
Gemini: @ai-collab ai-collab://tickets

// Sees report showing:
// - 2 critical bugs (1 resolved, 1 in progress)
// - 1 active implementation plan
// - 1 tech debt ticket (low priority)
// - 1 enhancement (wishlist)

// Updates main bug as resolved
Gemini: @ai-collab update_ticket {
  "ticketId": "BUG-0087",
  "updates": {
    "status": "resolved",
    "resolution": "Implemented comprehensive register pressure management per IMPL-0012"
  },
  "agentName": "gemini"
}
```

## Step 7: Session Handoff with Ticket Context

```javascript
// End of session, generate handoff
Gemini: @ai-collab generate_handoff

// Handoff document includes:
## Ticket Summary
### By Type
- bug: 2 (1 resolved, 1 in progress)
- enhancement: 1
- techDebt: 1
- implementationPlan: 1

### Critical Items
- BUG-0123: Spill slot conflicts in nested function calls [critical]

### Recently Created
- IMPL-0012: Comprehensive Register Pressure Management System
- ENH-0234: Add register pressure visualization tool
```

## Benefits Demonstrated

1. **Tracking**: All issues discovered during development are tracked
2. **Prioritization**: Critical bugs vs. nice-to-have enhancements
3. **Technical Debt**: Logged without blocking current work
4. **Planning**: Implementation plans provide roadmap
5. **Context**: Tickets preserve knowledge across sessions
6. **Flexibility**: Can create tickets without disrupting flow

## Next Session

```javascript
// Next day, new session starts
Gemini: @ai-collab get_context {"agentName": "gemini"}

// Sees BUG-0123 still critical and in progress
// Mission continues with clear focus on remaining critical bug

Gemini: "Good, BUG-0087 is resolved. Let's focus on BUG-0123 today."
```

This workflow shows how tickets enhance the development process by providing structure while maintaining flexibility.