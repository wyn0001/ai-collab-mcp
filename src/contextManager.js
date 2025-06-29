import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTEXT_DIR = path.join(DATA_DIR, 'context');

export class ContextManager {
  constructor(projectState, taskQueue, missionManager, ticketManager) {
    this.projectState = projectState;
    this.taskQueue = taskQueue;
    this.missionManager = missionManager;
    this.ticketManager = ticketManager;
    this.contextFile = path.join(CONTEXT_DIR, 'project-context.json');
    this.handoffFile = path.join(CONTEXT_DIR, 'handoff-document.md');
    this.initializeContextDir();
  }

  async initializeContextDir() {
    try {
      await fs.mkdir(CONTEXT_DIR, { recursive: true });
      
      // Initialize context file if it doesn't exist
      try {
        await fs.access(this.contextFile);
      } catch {
        await this.saveContext({
          project: {
            name: '',
            description: '',
            startDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          },
          currentState: {
            activeMissions: [],
            inProgressTasks: [],
            recentDecisions: [],
            blockers: []
          },
          keyInformation: {
            architecture: {},
            conventions: {},
            dependencies: {},
            criticalPaths: []
          },
          history: []
        });
      }
    } catch (error) {
      console.error('Failed to initialize context directory:', error);
    }
  }

  async loadContext() {
    try {
      const data = await fs.readFile(this.contextFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async saveContext(context) {
    context.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.contextFile, JSON.stringify(context, null, 2));
  }

  async updateProjectContext(updates) {
    const context = await this.loadContext() || {};
    
    // Deep merge updates
    if (updates.project) {
      context.project = { ...context.project, ...updates.project };
    }
    
    if (updates.currentState) {
      context.currentState = { ...context.currentState, ...updates.currentState };
    }
    
    if (updates.keyInformation) {
      context.keyInformation = { ...context.keyInformation, ...updates.keyInformation };
    }

    await this.saveContext(context);
  }

  async captureCurrentState() {
    // Get all active work
    const activeMissions = await this.missionManager.getActiveMissions('all');
    const allTasks = await this.taskQueue.getAllTasks();
    const projectState = await this.projectState.getFullState();
    const ticketReport = await this.ticketManager.generateTicketReport();

    // Filter for active work
    const inProgressTasks = Object.values(allTasks).filter(
      task => task.status === 'in_review' || task.status === 'pending'
    );

    // Get recent architectural decisions
    const recentDecisions = projectState.architecture.decisions
      .slice(-5)
      .map(d => ({
        id: d.id,
        title: d.title || d.decision,
        timestamp: d.timestamp
      }));

    // Identify blockers
    const blockers = [];
    
    // Check for stalled missions
    for (const mission of activeMissions) {
      if (mission.iterations > mission.maxIterations * 0.8) {
        blockers.push({
          type: 'mission_stalled',
          id: mission.id,
          description: `Mission "${mission.title}" approaching iteration limit`,
          severity: 'high'
        });
      }
    }

    // Check for high priority tickets
    if (ticketReport.details.criticalItems.length > 0) {
      blockers.push({
        type: 'critical_tickets',
        count: ticketReport.details.criticalItems.length,
        description: `${ticketReport.details.criticalItems.length} critical/high priority tickets open`,
        severity: 'high'
      });
    }

    // Update context
    await this.updateProjectContext({
      currentState: {
        activeMissions: activeMissions.map(m => ({
          id: m.id,
          title: m.title,
          progress: m.progress || 'unknown',
          iterations: m.iterations
        })),
        inProgressTasks: inProgressTasks.map(t => ({
          id: t.taskId,
          title: t.title,
          status: t.status,
          assignedRole: t.assignedRole || 'unknown'
        })),
        recentDecisions,
        blockers,
        ticketSummary: ticketReport.summary
      }
    });

    return {
      activeMissions: activeMissions.length,
      inProgressTasks: inProgressTasks.length,
      blockers: blockers.length,
      lastUpdated: new Date().toISOString()
    };
  }

  async generateHandoffDocument() {
    const context = await this.loadContext();
    const projectState = await this.projectState.getFullState();
    const ticketReport = await this.ticketManager.generateTicketReport();
    
    const handoff = `# Project Handoff Document
Generated: ${new Date().toISOString()}

## Project Overview

**Name**: ${context.project.name || 'Unnamed Project'}
**Description**: ${context.project.description || 'No description provided'}
**Started**: ${context.project.startDate}
**Last Updated**: ${context.lastUpdated}

## Current State

### Active Missions
${context.currentState.activeMissions.map(m => 
  `- **${m.id}**: ${m.title} (${m.iterations} iterations)`
).join('\n') || 'No active missions'}

### In-Progress Tasks
${context.currentState.inProgressTasks.map(t => 
  `- **${t.id}**: ${t.title} [${t.status}]`
).join('\n') || 'No tasks in progress'}

### Recent Architectural Decisions
${context.currentState.recentDecisions.map(d => 
  `- **${d.id}**: ${d.title}`
).join('\n') || 'No recent decisions'}

### Current Blockers
${context.currentState.blockers.map(b => 
  `- **${b.type}**: ${b.description} [${b.severity}]`
).join('\n') || 'No blockers identified'}

## Ticket Summary

### By Type
${Object.entries(ticketReport.summary.byType).map(([type, count]) => 
  `- ${type}: ${count}`
).join('\n')}

### By Status
${Object.entries(ticketReport.summary.byStatus).map(([status, count]) => 
  `- ${status}: ${count}`
).join('\n')}

### Critical Items
${ticketReport.details.criticalItems.slice(0, 5).map(t => 
  `- **${t.id}**: ${t.data.title} [${t.data.priority || t.data.severity}]`
).join('\n') || 'No critical items'}

## Key Information

### Architecture
${JSON.stringify(context.keyInformation.architecture, null, 2)}

### Conventions
${JSON.stringify(context.keyInformation.conventions, null, 2)}

### Critical Paths
${context.keyInformation.criticalPaths.map(path => `- ${path}`).join('\n') || 'None identified'}

## Next Steps

1. Review active missions and their progress
2. Address any blockers identified above
3. Check critical tickets and prioritize accordingly
4. Continue work on in-progress tasks

## Quick Start Commands

For CTO role:
\`\`\`
@ai-collab get_context {"agentName": "gemini"}
@ai-collab get_autonomous_status
\`\`\`

For Developer role:
\`\`\`
@ai-collab get_context {"agentName": "claude"}
@ai-collab get_autonomous_work {"agentName": "claude"}
\`\`\`

## Additional Context

${context.additionalNotes || 'No additional notes'}
`;

    await fs.writeFile(this.handoffFile, handoff);
    return this.handoffFile;
  }

  async addHistoryEntry(entry) {
    const context = await this.loadContext();
    
    if (!context.history) {
      context.history = [];
    }
    
    context.history.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 entries
    if (context.history.length > 100) {
      context.history = context.history.slice(-100);
    }
    
    await this.saveContext(context);
  }

  async getRecentHistory(limit = 10) {
    const context = await this.loadContext();
    return (context.history || []).slice(-limit);
  }

  async generateOnboardingSummary() {
    const context = await this.loadContext();
    const handoffPath = await this.generateHandoffDocument();
    
    return {
      project: context.project,
      currentState: context.currentState,
      keyInformation: context.keyInformation,
      handoffDocument: handoffPath,
      quickStart: {
        cto: [
          'Review handoff document',
          'Check active missions',
          'Address any blockers',
          'Review critical tickets'
        ],
        developer: [
          'Review handoff document', 
          'Check assigned tasks',
          'Review recent decisions',
          'Start working on highest priority items'
        ]
      }
    };
  }
}