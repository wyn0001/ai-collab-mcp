# Workflow Examples

This document provides detailed examples of common workflows using the AI Collaboration MCP Server.

## Complete Development Cycle

### Scenario: Implementing a Lexer for the Compiler

#### 1. CTO Creates the Task

```javascript
// Gemini (CTO)
@ai-collab send_directive {
  "taskId": "COMP-001-lexer",
  "title": "Implement Lexer for Compiler",
  "specification": "Create a lexer that tokenizes source code into a stream of tokens. The lexer should handle all language constructs including keywords, operators, literals, and identifiers.",
  "requirements": [
    "Support single and multi-line comments",
    "Handle string literals with escape sequences",
    "Recognize all operators: +, -, *, /, =, ==, !=, <, >, <=, >=",
    "Identify keywords: if, else, while, for, function, return, var, const",
    "Track line and column numbers for error reporting",
    "Implement as a separate module with clean interface"
  ],
  "acceptanceCriteria": [
    "Correctly tokenizes all test cases",
    "Provides accurate position information",
    "Handles edge cases (empty files, long identifiers)",
    "Performance: tokenizes 1000 lines in < 100ms",
    "100% test coverage for token types"
  ]
}
```

#### 2. Developer Checks and Starts Work

```javascript
// Claude (Developer)
@ai-collab get_pending_tasks {"role": "developer"}

// Response shows COMP-001-lexer is pending
// Developer reviews the full task:
@ai-collab ai-collab://tasks/COMP-001-lexer

// Developer has a clarification question:
@ai-collab ask_question {
  "taskId": "COMP-001-lexer",
  "question": "Should the lexer support Unicode identifiers, or ASCII only?",
  "context": {
    "consideration": "Unicode support affects complexity and performance",
    "examples": "Variables like 'пользователь' or '用户'"
  }
}
```

#### 3. CTO Answers Question

```javascript
// Gemini (CTO) checks for questions
@ai-collab get_pending_tasks {"role": "cto"}

// Sees question Q-1234567890 and answers:
@ai-collab answer_question {
  "questionId": "Q-1234567890",
  "answer": "Start with ASCII-only for MVP. We can add Unicode support in a future iteration. Please add a TODO comment where Unicode support would be implemented."
}
```

#### 4. Developer Submits Implementation

```javascript
// Claude (Developer) after implementing
@ai-collab submit_work {
  "taskId": "COMP-001-lexer",
  "files": {
    "src/lexer/lexer.ts": "import { Token, TokenType } from './types';\n\nexport class Lexer {\n  // Implementation...",
    "src/lexer/types.ts": "export enum TokenType {\n  // Token type definitions...",
    "src/lexer/index.ts": "export { Lexer } from './lexer';\nexport * from './types';",
    "tests/lexer.test.ts": "import { Lexer } from '../src/lexer';\n\ndescribe('Lexer', () => {\n  // Test cases..."
  },
  "summary": "Implemented lexer with all required features. ASCII-only as discussed, with TODO markers for future Unicode support. All tests passing with 100% coverage.",
  "testResults": {
    "passed": 47,
    "failed": 0,
    "coverage": {
      "statements": 100,
      "branches": 100,
      "functions": 100,
      "lines": 100
    }
  }
}
```

#### 5. CTO Reviews Submission

```javascript
// Gemini (CTO)
@ai-collab get_pending_tasks {"role": "cto"}

// Reviews the submission
@ai-collab ai-collab://tasks/COMP-001-lexer

// Submits review with minor feedback
@ai-collab submit_review {
  "taskId": "COMP-001-lexer",
  "status": "needs_revision",
  "feedback": "Excellent implementation overall. Clean architecture and comprehensive tests. A few minor items need attention before approval.",
  "actionItems": [
    "Add handling for hexadecimal number literals (0x1234)",
    "The error message for unterminated strings should include the starting line number",
    "Consider extracting magic numbers (like max identifier length) to constants"
  ]
}
```

#### 6. Developer Makes Revisions

```javascript
// Claude (Developer) sees revision request
@ai-collab get_pending_tasks {"role": "developer"}

// Makes the requested changes and resubmits
@ai-collab submit_work {
  "taskId": "COMP-001-lexer",
  "files": {
    "src/lexer/constants.ts": "export const MAX_IDENTIFIER_LENGTH = 255;\nexport const HEX_PREFIX = '0x';",
    "src/lexer/lexer.ts": "// Updated implementation with hex support and constants",
    "tests/lexer.test.ts": "// Added tests for hex literals"
  },
  "summary": "Addressed all feedback: Added hex literal support, improved error messages with line numbers, extracted constants. Added 5 new test cases.",
  "testResults": {
    "passed": 52,
    "failed": 0,
    "coverage": {
      "statements": 100,
      "branches": 100,
      "functions": 100,
      "lines": 100
    }
  }
}
```

#### 7. CTO Approves

```javascript
// Gemini (CTO)
@ai-collab submit_review {
  "taskId": "COMP-001-lexer",
  "status": "approved",
  "feedback": "Perfect! All issues addressed. The lexer is well-structured and thoroughly tested. Ready for integration.",
  "actionItems": []
}
```

## Parallel Task Management

### Working on Multiple Features

```javascript
// CTO creates multiple tasks at once
const tasks = [
  {
    taskId: "COMP-002-parser",
    title: "Implement Recursive Descent Parser",
    dependencies: ["COMP-001-lexer"]
  },
  {
    taskId: "COMP-003-ast",
    title: "Design AST Node Structure",
    dependencies: []
  },
  {
    taskId: "FEAT-001-repl",
    title: "Create REPL for Testing",
    dependencies: ["COMP-001-lexer"]
  }
];

// Create all tasks
for (const task of tasks) {
  @ai-collab send_directive { ...task }
}

// Developer can work on independent tasks
@ai-collab get_pending_tasks {"role": "developer"}
// Shows COMP-003-ast (no dependencies) and others
```

## Project State Management

### Establishing Architecture Decisions

```javascript
// CTO updates project architecture
@ai-collab update_project_state {
  "component": "architecture",
  "state": {
    "decisions": [
      {
        "id": "ADR-001",
        "title": "Use Recursive Descent Parser",
        "rationale": "Simpler to implement and debug than table-driven approach",
        "consequences": "May be slower for very large files"
      }
    ],
    "patterns": [
      "Visitor pattern for AST traversal",
      "Builder pattern for IR construction"
    ]
  }
}

// Developer can reference these decisions
@ai-collab ai-collab://project-state/architecture
```

### Code Standards

```javascript
// CTO establishes coding standards
@ai-collab update_project_state {
  "component": "standards",
  "state": {
    "typescript": {
      "strictMode": true,
      "noImplicitAny": true,
      "naming": {
        "interfaces": "PascalCase with 'I' prefix",
        "types": "PascalCase",
        "enums": "PascalCase"
      }
    },
    "testing": {
      "framework": "Jest",
      "structure": "Colocated with source files",
      "naming": "*.test.ts",
      "coverage": {
        "statements": 90,
        "branches": 85,
        "functions": 90,
        "lines": 90
      }
    }
  }
}
```

## Monitoring Progress

### Checking Project Status

```javascript
// View all tasks and their states
@ai-collab ai-collab://tasks

// View specific component progress
@ai-collab ai-collab://project-state/lexer

// Check recent communications
@ai-collab ai-collab://logs
```

### Generating Reports

```javascript
// CTO can track velocity and progress
const recentLogs = @ai-collab ai-collab://logs

// Analyze:
// - Tasks completed this week
// - Average review cycles per task
// - Common revision reasons
// - Question frequency
```

## Error Handling Scenarios

### Build Failures

```javascript
// Developer encounters build issue
@ai-collab submit_work {
  "taskId": "COMP-004-optimizer",
  "files": { /* partial implementation */ },
  "summary": "Partial implementation - encountering circular dependency issue with current module structure",
  "testResults": {
    "buildFailed": true,
    "error": "Cannot resolve circular dependency between optimizer and analyzer"
  }
}

// Include question about architectural change
@ai-collab ask_question {
  "taskId": "COMP-004-optimizer",
  "question": "Should we refactor to extract shared interfaces to a separate module?",
  "context": {
    "issue": "Circular dependency between optimizer and analyzer",
    "proposedSolution": "Create 'interfaces' module"
  }
}
```

## Best Practices Demonstrated

1. **Clear Task Definitions**: Include specific requirements and measurable acceptance criteria
2. **Iterative Communication**: Use questions for clarification before implementation
3. **Comprehensive Submissions**: Include all relevant files and test results
4. **Actionable Feedback**: Specific items to address in reviews
5. **State Documentation**: Keep architectural decisions and standards in project state
6. **Progress Tracking**: Regular status checks and log reviews