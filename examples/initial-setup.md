# Initial Setup Example

This guide shows a complete example of setting up AI collaboration for a new compiler project.

## Step 1: Install the MCP Server

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-collab-mcp.git
cd ai-collab-mcp

# Install dependencies
npm install

# Note the absolute path
pwd  # Save this path for configuration
```

## Step 2: Configure Claude Code

```bash
# Add the MCP server
claude mcp add ai-collab stdio "node /Users/yourname/repos/ai-collab-mcp/src/index.js"

# Verify it's added
claude mcp list
```

## Step 3: Configure Gemini

Edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "ai-collab": {
      "command": "node",
      "args": ["/Users/yourname/repos/ai-collab-mcp/src/index.js"]
    }
  }
}
```

## Step 4: Initialize the Compiler Project

### CTO (Gemini) Creates Initial Tasks

```javascript
// Task 1: Project Setup
@ai-collab send_directive {
  "taskId": "SETUP-001",
  "title": "Initialize compiler project structure",
  "specification": "Create the initial project structure with TypeScript, build system, and testing framework",
  "requirements": [
    "TypeScript with strict mode",
    "Jest for testing",
    "ESLint and Prettier configured",
    "npm scripts for build, test, lint",
    "Basic CI/CD workflow"
  ],
  "acceptanceCriteria": [
    "npm run build completes successfully",
    "npm test runs and passes",
    "npm run lint shows no errors",
    "README with project overview"
  ]
}

// Task 2: Language Specification
@ai-collab send_directive {
  "taskId": "SPEC-001",
  "title": "Draft language specification",
  "specification": "Create a formal specification for our programming language",
  "requirements": [
    "EBNF grammar definition",
    "Token definitions",
    "Operator precedence table",
    "Example programs",
    "Semantic rules"
  ],
  "acceptanceCriteria": [
    "Complete EBNF grammar",
    "At least 10 example programs",
    "Clear documentation of semantics"
  ]
}

// Set project standards
@ai-collab update_project_state {
  "component": "standards",
  "state": {
    "language": "TypeScript",
    "style": {
      "indent": 2,
      "quotes": "single",
      "semicolons": true,
      "lineLength": 100
    },
    "git": {
      "branches": "feature/*, bugfix/*, release/*",
      "commitFormat": "type(scope): message",
      "types": ["feat", "fix", "docs", "style", "refactor", "test", "chore"]
    }
  }
}
```

### Developer (Claude) Begins Work

```javascript
// Check available tasks
@ai-collab get_pending_tasks {"role": "developer"}

// View project standards
@ai-collab ai-collab://project-state/standards

// Start with project setup
@ai-collab ai-collab://tasks/SETUP-001

// Create project structure and submit
@ai-collab submit_work {
  "taskId": "SETUP-001",
  "files": {
    "package.json": "{\n  \"name\": \"custom-compiler\",\n  ...",
    "tsconfig.json": "{\n  \"compilerOptions\": {\n    \"strict\": true,\n    ...",
    "jest.config.js": "module.exports = {\n  preset: 'ts-jest',\n  ...",
    ".eslintrc.js": "module.exports = {\n  parser: '@typescript-eslint/parser',\n  ...",
    "README.md": "# Custom Compiler\n\nA compiler for our custom language...",
    "src/index.ts": "export const VERSION = '0.1.0';\n",
    "tests/index.test.ts": "import { VERSION } from '../src';\n\ntest('version', () => {\n  ..."
  },
  "summary": "Created initial project structure with all requested configurations. All scripts working.",
  "testResults": {
    "passed": 1,
    "failed": 0
  }
}
```

### CTO Reviews and Approves

```javascript
// Check pending reviews
@ai-collab get_pending_tasks {"role": "cto"}

// Review submission
@ai-collab submit_review {
  "taskId": "SETUP-001",
  "status": "approved",
  "feedback": "Excellent setup. All requirements met. Ready to begin compiler implementation.",
  "actionItems": []
}

// Create next phase tasks
@ai-collab send_directive {
  "taskId": "COMP-001",
  "title": "Implement Lexer",
  "specification": "Create the lexical analyzer for our language",
  "requirements": [
    "Based on SPEC-001 token definitions",
    "Error recovery",
    "Position tracking",
    "Streaming support"
  ],
  "acceptanceCriteria": [
    "Tokenizes all example programs from SPEC-001",
    "Comprehensive test suite",
    "Benchmarks included"
  ]
}
```

## Step 5: Ongoing Collaboration Pattern

```javascript
// Developer workflow
while (hasWork) {
  // 1. Check for tasks
  const tasks = @ai-collab get_pending_tasks {"role": "developer"}
  
  // 2. Pick a task
  const task = selectTask(tasks)
  
  // 3. Review requirements
  const details = @ai-collab ai-collab://tasks/${task.taskId}
  
  // 4. Ask questions if needed
  if (needsClarification) {
    @ai-collab ask_question { /* ... */ }
  }
  
  // 5. Implement
  implement(task)
  
  // 6. Submit work
  @ai-collab submit_work { /* ... */ }
}

// CTO workflow
while (hasReviews) {
  // 1. Check for reviews
  const reviews = @ai-collab get_pending_tasks {"role": "cto"}
  
  // 2. Review each submission
  for (const review of reviews) {
    // 3. Examine work
    const task = @ai-collab ai-collab://tasks/${review.taskId}
    
    // 4. Provide feedback
    @ai-collab submit_review { /* ... */ }
    
    // 5. Create follow-up tasks if needed
    if (needsMoreWork) {
      @ai-collab send_directive { /* ... */ }
    }
  }
}
```

## Monitoring and Reporting

```javascript
// Weekly status check
const logs = @ai-collab ai-collab://logs
const tasks = @ai-collab ai-collab://tasks

// Generate summary
console.log(`
Weekly Summary:
- Tasks completed: ${completed.length}
- Tasks in progress: ${inProgress.length}
- Average review cycles: ${avgCycles}
- Questions asked: ${questions.length}
`);
```