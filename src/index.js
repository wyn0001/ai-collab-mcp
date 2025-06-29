#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import { TaskQueue } from './taskQueue.js';
import { ProjectState } from './projectState.js';
import { CommunicationLogger } from './logger.js';
import { RoleManager } from './roleManager.js';
import { MissionManager } from './missionManager.js';
import { AutonomousEngine } from './autonomousEngine.js';
import { TicketManager } from './ticketManager.js';
import { ContextManager } from './contextManager.js';

const server = new Server(
  {
    name: 'ai-collab-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Initialize components
const taskQueue = new TaskQueue();
const projectState = new ProjectState();
const logger = new CommunicationLogger();
const roleManager = new RoleManager();
const missionManager = new MissionManager(taskQueue, roleManager);
const autonomousEngine = new AutonomousEngine(taskQueue, missionManager, roleManager);
const ticketManager = new TicketManager();
const contextManager = new ContextManager(projectState, taskQueue, missionManager, ticketManager);

// Error handling
server.onerror = (error) => {
  console.error('[MCP Error]', error);
  logger.logError(error);
};

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'send_directive',
        description: 'Send a task directive to the development team',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Unique identifier for the task' },
            title: { type: 'string', description: 'Title of the task' },
            specification: { type: 'string', description: 'Detailed specification of what needs to be done' },
            requirements: { type: 'array', items: { type: 'string' }, description: 'List of requirements' },
            acceptanceCriteria: { type: 'array', items: { type: 'string' }, description: 'Acceptance criteria for the task' }
          },
          required: ['taskId', 'title', 'specification']
        }
      },
      {
        name: 'submit_work',
        description: 'Submit completed work for review',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID this submission is for' },
            files: { type: 'object', description: 'Files changed or created' },
            summary: { type: 'string', description: 'Summary of work completed' },
            testResults: { type: 'object', description: 'Test results' }
          },
          required: ['taskId', 'summary']
        }
      },
      {
        name: 'review_work',
        description: 'Submit a review of submitted work',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID being reviewed' },
            status: { type: 'string', enum: ['approved', 'needs_revision'], description: 'Review decision' },
            feedback: { type: 'string', description: 'Review feedback' },
            actionItems: { type: 'array', items: { type: 'string' }, description: 'Action items for revision' }
          },
          required: ['taskId', 'status', 'feedback']
        }
      },
      {
        name: 'ask_question',
        description: 'Ask a question about a task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID the question relates to' },
            question: { type: 'string', description: 'The question being asked' },
            context: { type: 'object', description: 'Additional context for the question' }
          },
          required: ['taskId', 'question']
        }
      },
      {
        name: 'answer_question',
        description: 'Answer a previously asked question',
        inputSchema: {
          type: 'object',
          properties: {
            questionId: { type: 'string', description: 'ID of the question being answered' },
            answer: { type: 'string', description: 'The answer to the question' }
          },
          required: ['questionId', 'answer']
        }
      },
      {
        name: 'get_all_tasks',
        description: 'Get all tasks in the system',
        inputSchema: {
          type: 'object',
          properties: {
            role: { type: 'string', description: 'Filter tasks by role' }
          }
        }
      },
      {
        name: 'get_task_status',
        description: 'Get status of a specific task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID to get status for' }
          },
          required: ['taskId']
        }
      },
      {
        name: 'ping',
        description: 'Simple ping to test server connectivity',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'update_project_state',
        description: 'Update the state of a project component',
        inputSchema: {
          type: 'object',
          properties: {
            component: { type: 'string', description: 'Component name to update' },
            state: { type: 'object', description: 'New state data' }
          },
          required: ['component', 'state']
        }
      },
      {
        name: 'get_project_state',
        description: 'Get current project state',
        inputSchema: {
          type: 'object',
          properties: {
            component: { type: 'string', description: 'Specific component to get (optional)' }
          }
        }
      },
      {
        name: 'generate_report',
        description: 'Generate a project status report',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['summary', 'detailed', 'tickets'], description: 'Type of report to generate' }
          }
        }
      },
      {
        name: 'init',
        description: 'Initialize agent with role-based autonomous workflow',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Name of the agent initializing' }
          },
          required: ['agentName']
        }
      },
      {
        name: 'stop_autonomous_work',
        description: 'Stop autonomous work mode',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Name of the agent stopping work' }
          },
          required: ['agentName']
        }
      },
      {
        name: 'status',
        description: 'Get current system status',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Agent requesting status' }
          }
        }
      },
      {
        name: 'create_mission',
        description: 'Create a new mission',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Agent creating the mission' },
            mission: { type: 'object', description: 'Mission details' }
          },
          required: ['agentName', 'mission']
        }
      },
      {
        name: 'create_ticket',
        description: 'Create a new ticket',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Agent creating the ticket' },
            type: { type: 'string', enum: ['bug', 'enhancement', 'tech_debt', 'implementation_plan'], description: 'Type of ticket' },
            data: { type: 'object', description: 'Ticket data' }
          },
          required: ['agentName', 'type', 'data']
        }
      },
      {
        name: 'update_ticket',
        description: 'Update an existing ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticketId: { type: 'string', description: 'ID of ticket to update' },
            updates: { type: 'object', description: 'Updates to apply' },
            agentName: { type: 'string', description: 'Agent making the update' }
          },
          required: ['ticketId', 'updates', 'agentName']
        }
      },
      {
        name: 'list_tickets',
        description: 'List tickets with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status' },
            type: { type: 'string', description: 'Filter by type' },
            priority: { type: 'string', description: 'Filter by priority' }
          }
        }
      },
      {
        name: 'generate_context_summary',
        description: 'Generate a summary of current project context',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Agent requesting context' }
          }
        }
      }
    ]
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'send_directive': {
      const { taskId, title, specification, requirements, acceptanceCriteria } = args;
      
      const directive = {
        taskId,
        title,
        specification,
        requirements: requirements || [],
        acceptanceCriteria: acceptanceCriteria || [],
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      await taskQueue.addDirective(directive);
      await logger.logDirective(directive);
      
      return {
        content: [
          {
            type: 'text',
            text: `Directive ${taskId} queued successfully. Title: ${title}`,
          },
        ],
      };
    }

    case 'get_all_tasks': {
      const { role } = args || {};
      const tasks = await taskQueue.getPendingTasks(role);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(tasks, null, 2),
          },
        ],
      };
    }

    case 'get_task_status': {
      const { taskId } = args;
      const task = await taskQueue.getTask(taskId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(task, null, 2),
          },
        ],
      };
    }

    case 'ping': {
      return {
        content: [
          {
            type: 'text',
            text: 'pong - AI Collaboration MCP Server is running',
          },
        ],
      };
    }

    case 'submit_work': {
      const { taskId, files, summary, testResults } = args;
      
      const submission = {
        taskId,
        files: files || {},
        summary,
        testResults: testResults || {},
        submittedAt: new Date().toISOString(),
        status: 'pending_review',
      };

      await taskQueue.addSubmission(submission);
      await logger.logSubmission(submission);
      
      return {
        content: [
          {
            type: 'text',
            text: `Submission for task ${taskId} received and queued for review.`,
          },
        ],
      };
    }

    case 'review_work': {
      const { taskId, status, feedback, actionItems } = args;
      
      const review = {
        taskId,
        status, // 'approved' or 'needs_revision'
        feedback,
        actionItems: actionItems || [],
        reviewedAt: new Date().toISOString(),
      };

      await taskQueue.addReview(review);
      await logger.logReview(review);
      
      // Update task status
      if (status === 'approved') {
        await taskQueue.markTaskComplete(taskId);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Review for task ${taskId} submitted. Status: ${status}`,
          },
        ],
      };
    }

    case 'ask_question': {
      const { taskId, question, context } = args;
      
      const questionEntry = {
        taskId,
        question,
        context: context || {},
        askedAt: new Date().toISOString(),
        status: 'unanswered',
      };

      await taskQueue.addQuestion(questionEntry);
      await logger.logQuestion(questionEntry);
      
      return {
        content: [
          {
            type: 'text',
            text: `Question about task ${taskId} has been logged.`,
          },
        ],
      };
    }

    case 'answer_question': {
      const { questionId, answer } = args;
      
      await taskQueue.answerQuestion(questionId, answer);
      
      return {
        content: [
          {
            type: 'text',
            text: `Answer provided for question ${questionId}.`,
          },
        ],
      };
    }

    case 'update_project_state': {
      const { component, state } = args;
      
      await projectState.updateComponent(component, state);
      
      return {
        content: [
          {
            type: 'text',
            text: `Project state updated for component: ${component}`,
          },
        ],
      };
    }

    case 'get_project_state': {
      const { component } = args || {};
      const state = component 
        ? await projectState.getComponent(component)
        : await projectState.getAllComponents();
        
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(state, null, 2),
          },
        ],
      };
    }

    case 'generate_report': {
      const { type } = args || {};
      let report;
      
      switch (type) {
        case 'tickets':
          report = await ticketManager.generateTicketReport();
          break;
        case 'detailed':
          report = await contextManager.generateOnboardingSummary();
          break;
        default:
          report = {
            activeMissions: await missionManager.getActiveMissions('all'),
            pendingTasks: await taskQueue.getPendingTasks(),
            projectState: await projectState.getAllComponents(),
            tickets: await ticketManager.generateTicketReport()
          };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    }

    case 'stop_autonomous_work': {
      const { agentName } = args;
      await autonomousEngine.stopAutonomousWork(agentName);
      
      return {
        content: [
          {
            type: 'text',
            text: `Autonomous work stopped for agent: ${agentName}`,
          },
        ],
      };
    }

    case 'status': {
      const { agentName } = args || {};
      const roleContext = roleManager.getRoleContext(agentName);
      const autonomousStatus = await autonomousEngine.getAutonomousStatus();
      const activeMissions = await missionManager.getActiveMissions('all');
      
      const status = {
        role: roleContext?.role || 'Unknown',
        autonomousStatus,
        activeMissions: activeMissions.length,
        timestamp: new Date().toISOString()
      };
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }

    case 'create_mission': {
      const { agentName, mission } = args;
      const result = await autonomousEngine.startMission(mission, agentName);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }


    case 'init': {
      const { agentName } = args;
      
      // Get agent's role and context
      const roleContext = roleManager.getRoleContext(agentName);
      if (!roleContext) {
        throw new Error(`No role assigned to agent: ${agentName}`);
      }
      
      // Capture current state and generate summary
      await contextManager.captureCurrentState();
      const contextSummary = await contextManager.generateOnboardingSummary();
      const ticketReport = await ticketManager.generateTicketReport();
      const activeMissions = await missionManager.getActiveMissions('all');
      
      // Build context summary
      let contextInfo = `I'm ${roleContext.role}. Current project state:\n`;
      contextInfo += `- Active missions: ${contextSummary.currentState.activeMissions.length}\n`;
      contextInfo += `- Pending tasks: ${contextSummary.currentState.inProgressTasks.length}\n`;
      contextInfo += `- Critical tickets: ${ticketReport.details.criticalItems.length}\n`;
      contextInfo += `- Blockers: ${contextSummary.currentState.blockers.length}`;
      
      // Role-specific auto-start behavior
      if (roleContext.role === 'Chief Technology Officer') {
        if (activeMissions.length > 0) {
          // Resume active missions
          const mission = activeMissions[0];
          contextInfo += `\n\nResuming mission: "${mission.title}" (iteration ${mission.iterations}/${mission.maxIterations})`;
          contextInfo += `\nI'll continue monitoring progress and reviewing submissions.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo,
              },
            ],
          };
        } else if (ticketReport.details.criticalItems.length > 0) {
          // No active missions but critical tickets exist
          const criticalTickets = ticketReport.details.criticalItems.slice(0, 3).map(t => 
            `- ${t.id}: ${t.data.title}`
          ).join('\n');
          
          contextInfo += `\n\nNo active missions, but there are critical tickets:\n${criticalTickets}`;
          contextInfo += `\n\nWhat should be today's mission? Please provide a clear objective, or I can address these critical tickets.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo,
              },
            ],
          };
        } else {
          // No active work
          contextInfo += `\n\nNo active missions or critical tickets. What should be today's mission? Please provide a clear objective for the development team.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo,
              },
            ],
          };
        }
      } else if (roleContext.role === 'Senior Developer') {
        const work = await autonomousEngine.getWorkForAgent(agentName);
        
        if (work.tasks.length > 0) {
          // Has pending work - auto-start
          contextInfo += `\n\nI have ${work.tasks.length} pending tasks. Starting autonomous work now.`;
          contextInfo += `\nI'll implement solutions, submit for review, and continuously check for new tasks.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo,
              },
            ],
          };
        } else if (activeMissions.length > 0) {
          // No tasks yet but missions are active
          contextInfo += `\n\nNo tasks assigned yet, but there are active missions. I'll wait for tasks to be created.`;
          contextInfo += `\nI'll continuously check for work to arrive.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo,
              },
            ],
          };
        } else {
          // No work at all
          contextInfo += `\n\nNo pending tasks or active missions. Waiting for work to be assigned.`;
          contextInfo += `\nI'll start checking for tasks once a mission is created.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo,
              },
            ],
          };
        }
      } else {
        // Other roles
        contextInfo += `\n\nReady to begin work. My responsibilities include:\n`;
        contextInfo += roleContext.responsibilities.slice(0, 3).map(r => `- ${r}`).join('\n');
        
        return {
          content: [
            {
              type: 'text',
              text: contextInfo,
            },
          ],
        };
      }
    }

    case 'start': {
      const { agentName, message } = args;
      
      // Simple start command that handles everything
      const roleContext = roleManager.getRoleContext(agentName);
      if (!roleContext) {
        throw new Error(`No role assigned to agent: ${agentName}`);
      }
      
      // Get context first
      await contextManager.captureCurrentState();
      const contextSummary = await contextManager.generateOnboardingSummary();
      
      // For CTO, treat the message as a mission
      if (roleContext.role === 'Chief Technology Officer' && message) {
        const missionResult = await autonomousEngine.startMission({
          title: message,
          objective: message,
          acceptanceCriteria: [
            "All requirements implemented successfully",
            "No regression to existing functionality",
            "Code quality meets standards",
            "Solution is architecturally sound"
          ],
          autoDecompose: true,
          maxIterations: 50
        }, agentName);
        
        // Check for related tickets
        const tickets = await ticketManager.getAllTickets();
        const openBugs = tickets.filter(t => t.type === 'bug' && t.status === 'open');
        
        let ticketInfo = '';
        if (openBugs.length > 0) {
          ticketInfo = `\n\nNote: There are ${openBugs.length} open bug tickets that may be related to this mission.`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Mission "${message}" started. I'll break this down into tasks and oversee the implementation. I'll continuously monitor progress and review submissions.${ticketInfo}`,
            },
          ],
        };
      }
      
      // For Developer, start the work loop
      if (roleContext.role === 'Senior Developer') {
        const work = await autonomousEngine.getWorkForAgent(agentName);
        if (work.tasks.length > 0) {
          return {
            content: [
              {
                type: 'text',
                text: `I'm the Developer. I found ${work.tasks.length} pending tasks. I'll start working on them and continuously check for more work.`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `I'm the Developer. No tasks pending yet. I'll keep checking for work to arrive.`,
              },
            ],
          };
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Started as ${roleContext.role}. I understand my responsibilities and will act accordingly.`,
          },
        ],
      };
    }

    case 'create_ticket': {
      const { agentName, type, data } = args;
      
      const ticketId = await ticketManager.createTicket(type, data, agentName);
      await logger.appendLog('tickets', {
        action: 'ticket_created',
        ticketId,
        type,
        createdBy: agentName
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Created ${type} ticket: ${ticketId}`,
          },
        ],
      };
    }

    case 'update_ticket': {
      const { ticketId, updates, agentName } = args;
      
      const ticket = await ticketManager.updateTicket(ticketId, updates, agentName);
      
      return {
        content: [
          {
            type: 'text',
            text: `Updated ticket ${ticketId}. Current status: ${ticket.status}`,
          },
        ],
      };
    }

    case 'list_tickets': {
      const { status, type, priority } = args || {};
      
      let tickets;
      if (status) {
        tickets = await ticketManager.getTicketsByStatus(status, type);
      } else if (priority) {
        tickets = await ticketManager.getTicketsByPriority(priority, type);
      } else {
        tickets = await ticketManager.getAllTickets();
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(tickets, null, 2),
          },
        ],
      };
    }

    case 'link_ticket_to_mission': {
      const { ticketId, missionId } = args;
      
      await ticketManager.linkToMission(ticketId, missionId);
      
      return {
        content: [
          {
            type: 'text',
            text: `Linked ticket ${ticketId} to mission ${missionId}`,
          },
        ],
      };
    }

    case 'generate_context_summary': {
      const { agentName } = args || {};
      
      // Capture current state
      await contextManager.captureCurrentState();
      
      // Generate onboarding summary
      const summary = await contextManager.generateOnboardingSummary();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    }

    case 'update_context': {
      const { updates } = args;
      
      await contextManager.updateProjectContext(updates);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Project context updated successfully',
          },
        ],
      };
    }

    case 'generate_handoff': {
      const handoffPath = await contextManager.generateHandoffDocument();
      
      return {
        content: [
          {
            type: 'text',
            text: `Handoff document generated at: ${handoffPath}`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Resource: Access project information
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (!uri.startsWith('ai-collab://')) {
    throw new Error('Invalid resource URI');
  }

  const resourcePath = uri.replace('ai-collab://', '');
  const parts = resourcePath.split('/');

  switch (parts[0]) {
    case 'tasks': {
      const taskId = parts[1];
      if (taskId) {
        const task = await taskQueue.getTask(taskId);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      } else {
        const allTasks = await taskQueue.getAllTasks();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(allTasks, null, 2),
            },
          ],
        };
      }
    }

    case 'project-state': {
      const component = parts[1];
      const state = component 
        ? await projectState.getComponent(component)
        : await projectState.getAllComponents();
        
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(state, null, 2),
          },
        ],
      };
    }

    case 'logs': {
      const logType = parts[1] || 'all';
      const logs = await logger.getLogs(logType);
      
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(logs, null, 2),
          },
        ],
      };
    }

    case 'missions': {
      const missionId = parts[1];
      if (missionId) {
        const mission = await missionManager.getMissionById(missionId);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(mission, null, 2),
            },
          ],
        };
      } else {
        const missions = await missionManager.loadMissions();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(missions, null, 2),
            },
          ],
        };
      }
    }

    case 'roles': {
      const roleConfig = {
        availableRoles: roleManager.getAllRoles(),
        activeConfiguration: roleManager.getActiveConfiguration(),
        agentAssignments: roleManager.agents
      };
      
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(roleConfig, null, 2),
          },
        ],
      };
    }

    case 'tickets': {
      const ticketId = parts[1];
      if (ticketId) {
        const ticket = await ticketManager.getTicket(ticketId);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(ticket, null, 2),
            },
          ],
        };
      } else {
        const tickets = await ticketManager.getAllTickets();
        const report = await ticketManager.generateTicketReport();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ tickets, report }, null, 2),
            },
          ],
        };
      }
    }

    case 'context': {
      const context = await contextManager.loadContext();
      const summary = await contextManager.generateOnboardingSummary();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ context, summary }, null, 2),
          },
        ],
      };
    }

    case 'handoff': {
      const handoffPath = await contextManager.generateHandoffDocument();
      const handoffContent = await fs.readFile(handoffPath, 'utf8');
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: handoffContent,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown resource type: ${parts[0]}`);
  }
});

// Resource: List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'ai-collab://tasks',
        name: 'All Tasks',
        description: 'View all tasks in the system',
        mimeType: 'application/json',
      },
      {
        uri: 'ai-collab://project-state',
        name: 'Project State',
        description: 'Current state of all project components',
        mimeType: 'application/json',
      },
      {
        uri: 'ai-collab://logs',
        name: 'Communication Logs',
        description: 'All communication between AIs',
        mimeType: 'application/json',
      },
      {
        uri: 'ai-collab://missions',
        name: 'All Missions',
        description: 'View all missions and their progress',
        mimeType: 'application/json',
      },
      {
        uri: 'ai-collab://roles',
        name: 'Role Configuration',
        description: 'View role definitions and agent assignments',
        mimeType: 'application/json',
      },
      {
        uri: 'ai-collab://tickets',
        name: 'All Tickets',
        description: 'View bugs, enhancements, tech debt, and implementation plans',
        mimeType: 'application/json',
      },
      {
        uri: 'ai-collab://context',
        name: 'Project Context',
        description: 'Current project context and onboarding information',
        mimeType: 'application/json',
      },
      {
        uri: 'ai-collab://handoff',
        name: 'Handoff Document',
        description: 'Generated handoff document with current project state',
        mimeType: 'text/markdown',
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AI Collaboration MCP Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});