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
import path from 'path';
import { TaskQueue } from './taskQueue.js';
import { ProjectState } from './projectState.js';
import { CommunicationLogger } from './logger.js';
import { RoleManager } from './roleManager.js';
import { MissionManager } from './missionManager.js';
import { AutonomousEngine } from './autonomousEngine.js';
import { TicketManager } from './ticketManager.js';
import { ContextManager } from './contextManager.js';
import { LoopStateManager } from './loopStateManager.js';
import { ProjectPlanManager } from './projectPlanManager.js';

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
const loopStateManager = new LoopStateManager();
const projectPlanManager = new ProjectPlanManager();

// Initialize managers
loopStateManager.init().catch(console.error);
projectPlanManager.initializeDataDir().catch(console.error);

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
        description: 'Send a task directive to the development team. Can create single or batch tasks with dependencies.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Unique identifier for the task' },
            title: { type: 'string', description: 'Title of the task' },
            specification: { type: 'string', description: 'Detailed specification of what needs to be done' },
            requirements: { type: 'array', items: { type: 'string' }, description: 'List of requirements' },
            acceptanceCriteria: { type: 'array', items: { type: 'string' }, description: 'Acceptance criteria for the task' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Task priority (default: medium)' },
            dependsOn: { type: 'array', items: { type: 'string' }, description: 'Task IDs this task depends on' },
            blockedBy: { type: 'array', items: { type: 'string' }, description: 'Task IDs currently blocking this task' }
          },
          required: ['taskId', 'title', 'specification']
        }
      },
      {
        name: 'send_batch_directives',
        description: 'Send multiple task directives at once. Use this to queue up multiple tasks for efficient workflow.',
        inputSchema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  taskId: { type: 'string', description: 'Unique identifier for the task' },
                  title: { type: 'string', description: 'Title of the task' },
                  specification: { type: 'string', description: 'Detailed specification' },
                  requirements: { type: 'array', items: { type: 'string' } },
                  acceptanceCriteria: { type: 'array', items: { type: 'string' } },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                  dependsOn: { type: 'array', items: { type: 'string' } },
                  blockedBy: { type: 'array', items: { type: 'string' } }
                },
                required: ['taskId', 'title', 'specification']
              },
              description: 'Array of task directives to create'
            }
          },
          required: ['tasks']
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
            agentName: { type: 'string', description: 'Name of the agent initializing' },
            autonomous: { type: 'boolean', description: 'Start autonomous loop immediately (default: false)' },
            checkInterval: { type: 'number', description: 'Seconds between checks for autonomous mode (default: 120)' },
            maxIterations: { type: 'number', description: 'Max iterations for autonomous mode (default: 500)' },
            mission: { type: 'object', description: 'Ad-hoc mission to execute (pauses main project plan)' },
            createProjectPlan: { type: 'boolean', description: 'Create new project plan from requirements (default: false)' }
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
      },
      {
        name: 'start_autonomous_loop',
        description: 'Start an autonomous work loop that continuously checks for and processes work',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Name of the agent starting the loop' },
            mode: { type: 'string', enum: ['continuous', 'developer', 'cto'], description: 'Type of autonomous loop' },
            checkInterval: { type: 'number', description: 'Seconds between checks (default: 30)' },
            maxIterations: { type: 'number', description: 'Maximum loop iterations (default: 100)' }
          },
          required: ['agentName']
        }
      },
      {
        name: 'stop_autonomous_loop',
        description: 'Stop the autonomous work loop',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Name of the agent stopping the loop' }
          },
          required: ['agentName']
        }
      },
      {
        name: 'get_loop_status',
        description: 'Get the current status of the autonomous loop',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Name of the agent to check' }
          },
          required: ['agentName']
        }
      },
      {
        name: 'create_project_plan',
        description: 'Create a comprehensive project plan with multiple phases',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the project plan' },
            description: { type: 'string', description: 'Description of the project' },
            requirementsPath: { type: 'string', description: 'Path to requirements file (optional)' },
            autoGenerate: { type: 'boolean', description: 'Auto-generate phases from requirements' }
          },
          required: ['title']
        }
      },
      {
        name: 'get_project_plan',
        description: 'Get the current active project plan',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'update_plan_progress',
        description: 'Update project plan progress when phase is complete',
        inputSchema: {
          type: 'object',
          properties: {
            phaseComplete: { type: 'boolean', description: 'Mark current phase as complete' },
            adjustments: { type: 'object', description: 'Any adjustments to the plan' }
          }
        }
      },
      {
        name: 'diagnose_tasks',
        description: 'Diagnose task state discrepancies between project state and actual tasks',
        inputSchema: {
          type: 'object',
          properties: {}
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
      const { taskId, title, specification, requirements, acceptanceCriteria, priority, dependsOn, blockedBy } = args;
      
      const directive = {
        taskId,
        title,
        specification,
        requirements: requirements || [],
        acceptanceCriteria: acceptanceCriteria || [],
        priority: priority || 'medium',
        dependsOn: dependsOn || [],
        blockedBy: blockedBy || [],
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      await taskQueue.addDirective(directive);
      await logger.logDirective(directive);
      
      const statusInfo = dependsOn?.length > 0 
        ? ` (blocked by dependencies: ${dependsOn.join(', ')})`
        : ' (available to work on)';
      
      return {
        content: [
          {
            type: 'text',
            text: `Directive ${taskId} queued successfully. Title: ${title}${statusInfo}`,
          },
        ],
      };
    }

    case 'send_batch_directives': {
      const { tasks } = args;
      
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return {
          content: [{
            type: 'text',
            text: '❌ Error: Please provide an array of tasks to create.'
          }]
        };
      }
      
      const directives = tasks.map(task => ({
        ...task,
        priority: task.priority || 'medium',
        dependsOn: task.dependsOn || [],
        blockedBy: task.blockedBy || [],
      }));
      
      const addedTaskIds = await taskQueue.addBatchDirectives(directives);
      
      // Log each directive
      for (const directive of directives) {
        await logger.logDirective(directive);
      }
      
      const summary = addedTaskIds.map(id => {
        const task = directives.find(d => d.taskId === id);
        const deps = task.dependsOn?.length > 0 ? ` (depends on: ${task.dependsOn.join(', ')})` : '';
        return `• ${id}: ${task.title}${deps}`;
      }).join('\n');
      
      return {
        content: [{
          type: 'text',
          text: `✅ Successfully queued ${addedTaskIds.length} tasks:\n\n${summary}\n\nDeveloper can now work on available tasks continuously.`
        }]
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
      
      // Validate that this is a task ID, not a ticket ID
      if (taskId.startsWith('BUG-') || taskId.startsWith('ENH-') || taskId.startsWith('TD-')) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Error: "${taskId}" is a ticket ID, not a task ID.\n\n` +
                    `Tickets (BUG-XXX, ENH-XXX) are for tracking issues and improvements.\n` +
                    `Tasks (KAN-XXX, TASK-XXX) are work assignments that can be implemented.\n\n` +
                    `As CTO, you should:\n` +
                    `1. Create tickets to document issues\n` +
                    `2. Create tasks (using send_directive) to assign work to developers\n` +
                    `3. Link tickets to tasks if needed\n\n` +
                    `Developers can only submit work for tasks, not tickets.`,
            },
          ],
        };
      }
      
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
      
      // Check for next available task for continuous work mode
      const nextTask = await taskQueue.getNextWorkableTask();
      
      let responseText = `Submission for task ${taskId} received and queued for review.`;
      
      if (nextTask) {
        responseText += `\n\n🚀 **CONTINUOUS WORK MODE - NEXT TASK AVAILABLE:**\n`;
        responseText += `📋 Task ${nextTask.taskId}: ${nextTask.title}\n`;
        responseText += `Priority: ${nextTask.priority || 'medium'}\n`;
        if (nextTask.dependsOn?.length > 0) {
          responseText += `Dependencies: All satisfied ✓\n`;
        }
        responseText += `\n**ACTION**: Proceed immediately with this task to maintain continuous workflow.`;
      } else {
        // Check if there are blocked tasks waiting
        const allTasks = await taskQueue.getAllTasks();
        const blockedTasks = allTasks.filter(t => t.status === 'blocked');
        const inReviewTasks = allTasks.filter(t => t.status === 'in_review');
        
        if (blockedTasks.length > 0) {
          responseText += `\n\n⏳ **WAITING**: ${blockedTasks.length} task(s) blocked by dependencies.`;
        } else if (inReviewTasks.length > 0) {
          responseText += `\n\n⏳ **WAITING**: ${inReviewTasks.length} task(s) pending review.`;
        } else {
          responseText += `\n\n✅ **NO MORE TASKS**: All available work completed! Great job!`;
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: responseText,
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
      const { agentName, autonomous = false, checkInterval = 120, maxIterations = 500, mission = null, createProjectPlan = false } = args;
      
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
      
      // Get role-specific task counts
      if (roleContext.role === 'Chief Technology Officer') {
        const allTasks = await taskQueue.getAllTasks();
        const pendingReviews = allTasks.filter(t => 
          t.status === 'in_review' && 
          t.submissions && 
          t.submissions.some(s => s.status === 'pending_review')
        );
        contextInfo += `- Active missions: ${contextSummary.currentState.activeMissions.length}\n`;
        contextInfo += `- Tasks pending review: ${pendingReviews.length}\n`;
        contextInfo += `- Critical tickets: ${ticketReport.details.criticalItems.length}\n`;
        contextInfo += `- Blockers: ${contextSummary.currentState.blockers.length}`;
      } else if (roleContext.role === 'Senior Developer') {
        const developerTasks = await taskQueue.getPendingTasks('developer');
        contextInfo += `- Active missions: ${contextSummary.currentState.activeMissions.length}\n`;
        contextInfo += `- Tasks to implement: ${developerTasks.length}\n`;
        contextInfo += `- Critical tickets: ${ticketReport.details.criticalItems.length}\n`;
        contextInfo += `- Blockers: ${contextSummary.currentState.blockers.length}`;
      } else {
        contextInfo += `- Active missions: ${contextSummary.currentState.activeMissions.length}\n`;
        contextInfo += `- Pending tasks: ${contextSummary.currentState.inProgressTasks.length}\n`;
        contextInfo += `- Critical tickets: ${ticketReport.details.criticalItems.length}\n`;
        contextInfo += `- Blockers: ${contextSummary.currentState.blockers.length}`;
      }
      
      // Add role-specific instructions
      let instructions = '\n\n**IMPORTANT: How to use this system:**\n';
      
      // Check if any work exists to help decide on autonomous mode
      const work = await autonomousEngine.getWorkForAgent(agentName);
      const hasWork = work.tasks && work.tasks.length > 0;
      
      // Add autonomous loop option only if not already starting
      if (!autonomous) {
        instructions += '\n**NEW: Autonomous Mode Available!**\n';
        instructions += 'Start autonomous mode to continuously check for work:\n';
        instructions += `@ai-collab start_autonomous_loop {"agentName": "${agentName}"}\n\n`;
      }
      
      // If autonomous mode requested, start it after init
      let autonomousMessage = '';
      if (autonomous) {
        const loopState = await loopStateManager.startLoop(agentName, {
          mode: roleContext.role.toLowerCase().replace(/\s+/g, '_'),
          checkInterval,
          maxIterations,
          continuous: true // Enable continuous mode
        });
        
        autonomousMessage = `\n\n**🚀 AUTONOMOUS MODE STARTED!**\n`;
        autonomousMessage += `I will check for work every ${checkInterval} seconds for up to ${maxIterations} iterations.\n`;
        autonomousMessage += `\n**IMPORTANT**: This is a MANUAL autonomous loop:\n`;
        autonomousMessage += `1. YOU must run the check command every ${checkInterval} seconds\n`;
        autonomousMessage += `2. Command: @ai-collab get_loop_status {"agentName": "${agentName}"}\n`;
        autonomousMessage += `3. I will guide you on what to do based on available work\n`;
        autonomousMessage += `4. Continue until all work is complete or ${maxIterations} iterations\n`;
        autonomousMessage += `\n⏱️ Set a timer for ${checkInterval} seconds and run the command when it expires.`;
        autonomousMessage += `\n\n⚠️ **IMPORTANT WARNINGS:**`;
        autonomousMessage += `\n- DO NOT run blocking commands (npm start, server processes, etc.)`;
        autonomousMessage += `\n- If you get stuck, press Ctrl+C to stop any running process`;
        autonomousMessage += `\n- Always run processes in background with & or use separate terminals`;
        autonomousMessage += `\n\nStarting iteration 1/${maxIterations}...`;
      }
      
      // Role-specific auto-start behavior
      if (roleContext.role === 'Chief Technology Officer') {
        instructions += '\nAs CTO, you create tasks for developers using MCP commands:\n';
        instructions += '- Create tasks: `@ai-collab send_directive {"taskId": "KAN-XXX", "title": "...", "specification": "...", "requirements": [...], "acceptanceCriteria": [...]}`\n';
        instructions += '- Review work: `@ai-collab review_work {"taskId": "KAN-XXX", "status": "approved|needs_revision", "feedback": "..."}`\n';
        instructions += '- Check progress: `@ai-collab get_all_tasks {}`\n';
        instructions += '\n**IMPORTANT DISTINCTIONS:**\n';
        instructions += '- **Tasks (KAN-XXX)**: Work assignments that developers implement\n';
        instructions += '- **Tickets (BUG-XXX, ENH-XXX)**: Issue tracking and documentation\n';
        instructions += '\n**WORKFLOW:**\n';
        instructions += '1. Create tickets to document bugs/enhancements (optional)\n';
        instructions += '2. Create tasks for developers to implement fixes/features\n';
        instructions += '3. Review submitted work and approve/reject\n';
        instructions += '\n**DO NOT create tasks as files. Use the MCP commands above.**';
        
        if (activeMissions.length > 0) {
          // Resume active missions
          const mission = activeMissions[0];
          contextInfo += `\n\nResuming mission: "${mission.title}" (iteration ${mission.iterations}/${mission.maxIterations})`;
          contextInfo += instructions;
          contextInfo += `\n\nI'll continue monitoring progress and reviewing submissions.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo + autonomousMessage,
              },
            ],
          };
        } else if (ticketReport.details.criticalItems.length > 0) {
          // No active missions but critical tickets exist
          const criticalTickets = ticketReport.details.criticalItems.slice(0, 3).map(t => 
            `- ${t.id}: ${t.data.title}`
          ).join('\n');
          
          contextInfo += `\n\nNo active missions, but there are critical tickets:\n${criticalTickets}`;
          contextInfo += instructions;
          contextInfo += `\n\nWhat should be today's mission? Please provide a clear objective, or I can address these critical tickets.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo + autonomousMessage,
              },
            ],
          };
        } else {
          // No active work - check for project plan or create one
          const activePlan = await projectPlanManager.getActivePlan();
          
          if (activePlan) {
            // Continue with existing project plan
            const nextPhase = await projectPlanManager.getNextPhase(activePlan.id);
            if (nextPhase) {
              contextInfo += `\n\n**📝 CONTINUING PROJECT PLAN: ${activePlan.title}**\n\n`;
              contextInfo += `Progress: Phase ${nextPhase.phaseNumber}/${nextPhase.totalPhases}\n`;
              contextInfo += `Current Phase: ${nextPhase.phase.name}\n`;
              contextInfo += `Description: ${nextPhase.phase.description}\n\n`;
              
              contextInfo += `**NEXT TASKS TO CREATE:**\n`;
              nextPhase.phase.tasks.forEach((task, index) => {
                contextInfo += `${index + 1}. ${task.title} (${task.priority} priority)\n`;
              });
              
              contextInfo += `\n**RECOMMENDED ACTION:**\n`;
              contextInfo += `Create the first task from this phase using @ai-collab send_directive\n`;
              contextInfo += instructions;
            } else {
              contextInfo += `\n\n**🎉 PROJECT PLAN COMPLETE!**\n`;
              contextInfo += `All ${activePlan.phases.length} phases have been completed.\n`;
              contextInfo += `Total tasks completed: ${activePlan.completedTasks}\n\n`;
              contextInfo += `Consider creating a new project plan or ad-hoc missions.`;
              contextInfo += instructions;
            }
          } else if (createProjectPlan || !mission) {
            // Create a new project plan
            contextInfo += `\n\n**🚀 CREATING COMPREHENSIVE PROJECT PLAN**\n\n`;
            
            // Check if PROJECT_REQUIREMENTS.md exists
            let requirements = null;
            try {
              requirements = await fs.readFile(path.join(process.cwd(), 'PROJECT_REQUIREMENTS.md'), 'utf8');
            } catch (e) {
              // No requirements file
            }
            
            if (requirements) {
              // Extract project name from requirements or use directory name
              const projectDir = path.basename(process.cwd());
              let projectName = projectDir;
              
              // Try to extract project name from requirements
              const titleMatch = requirements.match(/^#\s+(.+?)\s*-\s*Project Requirements/m);
              if (titleMatch) {
                projectName = titleMatch[1];
              }
              
              // Generate phases based on requirements
              const phases = await projectPlanManager.generatePhaseBreakdown(requirements);
              const plan = await projectPlanManager.createProjectPlan({
                title: `${projectName} Development Plan`,
                description: `Comprehensive development plan for the ${projectName} project`,
                createdBy: agentName,
                phases,
                projectRequirements: requirements
              });
              
              contextInfo += `Created ${plan.phases.length}-phase project plan with ${plan.totalTasks} total tasks:\n\n`;
              plan.phases.forEach((phase, index) => {
                contextInfo += `**Phase ${index + 1}: ${phase.name}**\n`;
                contextInfo += `- ${phase.tasks.length} tasks, ${phase.estimatedDuration}\n`;
              });
              
              contextInfo += `\n**STARTING WITH PHASE 1**\n`;
              contextInfo += `Create the first task to begin development!`;
              contextInfo += instructions;
            } else {
              contextInfo += `No PROJECT_REQUIREMENTS.md found. Please provide project requirements or create an ad-hoc mission.`;
              contextInfo += instructions;
            }
          } else if (mission) {
            // Create ad-hoc mission that pauses the main plan
            await projectPlanManager.pauseCurrentPlan();
            const adHocPlan = await projectPlanManager.createAdHocMission({
              title: mission.title || mission,
              description: mission.description || mission,
              specification: mission.specification || mission,
              requirements: mission.requirements || [],
              acceptanceCriteria: mission.acceptanceCriteria || [],
              createdBy: agentName
            });
            
            contextInfo += `\n\n**🎯 AD-HOC MISSION CREATED**\n\n`;
            contextInfo += `Mission: ${adHocPlan.title}\n`;
            contextInfo += `The main project plan has been paused.\n\n`;
            contextInfo += `**CREATE TASK FOR THIS MISSION:**\n`;
            contextInfo += `Use @ai-collab send_directive to create implementation tasks.`;
            contextInfo += instructions;
          }
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo + autonomousMessage,
              },
            ],
          };
        }
      } else if (roleContext.role === 'Senior Developer') {
        instructions += '\nAs Developer, you work on tasks using MCP commands:\n';
        instructions += '- Check tasks: `@ai-collab get_all_tasks {"role": "developer"}`\n';
        instructions += '- Submit work: `@ai-collab submit_work {"taskId": "TASK-XXX", "summary": "...", "files": {...}}`\n';
        instructions += '- Ask questions: `@ai-collab ask_question {"taskId": "TASK-XXX", "question": "..."}`\n';
        instructions += '\n**Tasks are created by the CTO through MCP commands, not as files.**';
        
        if (work.tasks.length > 0) {
          // Has pending work - auto-start
          contextInfo += `\n\nI have ${work.tasks.length} pending tasks. Starting autonomous work now.`;
          contextInfo += instructions;
          contextInfo += `\nI'll implement solutions, submit for review, and continuously check for new tasks.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo + autonomousMessage,
              },
            ],
          };
        } else if (activeMissions.length > 0) {
          // No tasks yet but missions are active
          contextInfo += `\n\nNo tasks assigned yet, but there are active missions. I'll wait for tasks to be created.`;
          contextInfo += instructions;
          contextInfo += `\nI'll continuously check for work to arrive using @ai-collab get_all_tasks.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo + autonomousMessage,
              },
            ],
          };
        } else {
          // No work at all
          contextInfo += `\n\nNo pending tasks or active missions. Waiting for work to be assigned.`;
          contextInfo += instructions;
          contextInfo += `\nI'll start checking for tasks once a mission is created.`;
          
          return {
            content: [
              {
                type: 'text',
                text: contextInfo + autonomousMessage,
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

    case 'start_autonomous_loop': {
      const { agentName, mode, checkInterval, maxIterations } = args;
      
      // Get agent's role
      const roleContext = roleManager.getRoleContext(agentName);
      if (!roleContext) {
        throw new Error(`No role assigned to agent: ${agentName}`);
      }
      
      // Start the loop
      const loopState = await loopStateManager.startLoop(agentName, {
        mode: mode || roleContext.role.toLowerCase().replace(/\s+/g, '_'),
        checkInterval,
        maxIterations
      });
      
      // Build instructions for the agent
      let instructions = `Autonomous loop started! I will check for work every ${loopState.checkInterval} seconds.\n\n`;
      instructions += `**IMPORTANT INSTRUCTIONS FOR AUTONOMOUS OPERATION:**\n\n`;
      instructions += `1. After this message, wait ${loopState.checkInterval} seconds\n`;
      instructions += `2. Then run: @ai-collab get_loop_status {"agentName": "${agentName}"}\n`;
      instructions += `3. If loop is still active, check for work:\n`;
      
      if (roleContext.role === 'Senior Developer') {
        instructions += `   - Run: @ai-collab get_all_tasks {"role": "developer"}\n`;
        instructions += `   - If tasks exist, work on them and submit\n`;
        instructions += `   - If no tasks, wait and check again\n`;
      } else if (roleContext.role === 'Chief Technology Officer') {
        instructions += `   - Check for pending reviews: @ai-collab get_all_tasks {}\n`;
        instructions += `   - Review any submissions\n`;
        instructions += `   - Create new tasks as needed\n`;
      }
      
      instructions += `4. After each action, increment the loop: @ai-collab get_loop_status {"agentName": "${agentName}"}\n`;
      instructions += `5. Repeat until loop stops or max iterations (${loopState.maxIterations}) reached\n\n`;
      instructions += `Loop will automatically stop after ${loopState.maxIterations} iterations.`;
      
      return {
        content: [
          {
            type: 'text',
            text: instructions,
          },
        ],
      };
    }

    case 'stop_autonomous_loop': {
      const { agentName } = args;
      const stoppedState = await loopStateManager.stopLoop(agentName);
      
      if (!stoppedState) {
        return {
          content: [
            {
              type: 'text',
              text: `No active loop found for agent: ${agentName}`,
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Autonomous loop stopped. Completed ${stoppedState.currentIteration} iterations.`,
          },
        ],
      };
    }

    case 'get_loop_status': {
      const { agentName } = args;
      let loopState = loopStateManager.getLoopState(agentName);
      
      if (!loopState) {
        return {
          content: [
            {
              type: 'text',
              text: `No loop state found for agent: ${agentName}`,
            },
          ],
        };
      }
      
      // Auto-increment iteration when checking status
      if (loopState.isActive) {
        loopState = await loopStateManager.incrementIteration(agentName);
      }
      
      // Get agent's role and check for work
      const roleContext = roleManager.getRoleContext(agentName);
      const work = await autonomousEngine.getWorkForAgent(agentName);
      
      // Always use actual role, not stored mode
      const actualMode = roleContext.role.toLowerCase().replace(/\s+/g, '_');
      
      let status = `Loop Status for ${agentName}:\n`;
      status += `- Active: ${loopState.isActive}\n`;
      status += `- Mode: ${actualMode} (Role: ${roleContext.role})\n`;
      status += `- Iteration: ${loopState.currentIteration}/${loopState.maxIterations}\n`;
      
      if (!loopState.isActive) {
        status += `- Stopped at: ${loopState.stoppedAt || 'Unknown'}\n`;
        status += `- Stop reason: ${loopState.stopReason || 'Manual stop'}\n`;
        return {
          content: [
            {
              type: 'text',
              text: status,
            },
          ],
        };
      }
      
      // Check for work based on role
      let workFound = false;
      let instructions = '';
      
      if (roleContext.role === 'Chief Technology Officer') {
        // Check for pending reviews
        const allTasks = await taskQueue.getAllTasks();
        const pendingReviews = allTasks.filter(t => 
          t.status === 'in_review' && 
          t.submissions && 
          t.submissions.some(s => s.status === 'pending_review')
        );
        
        if (pendingReviews.length > 0) {
          workFound = true;
          instructions = `\n\n**🔔 WORK REQUIRING YOUR ATTENTION:**\n`;
          instructions += `Found ${pendingReviews.length} task(s) pending review:\n`;
          
          for (const task of pendingReviews) {
            instructions += `\n📋 Task ${task.taskId}: ${task.title}\n`;
            const submission = task.submissions.find(s => s.status === 'pending_review');
            if (submission) {
              instructions += `   Submitted: ${new Date(submission.submittedAt).toLocaleString()}\n`;
              instructions += `   Summary: ${submission.summary}\n`;
            }
          }
          
          instructions += `\n**NEXT ACTION:** Review the submission(s) above using:\n`;
          instructions += `@ai-collab review_work {"taskId": "<TASK_ID>", "status": "approved|needs_revision", "feedback": "..."}\n`;
        } else {
          // Check for questions that need answers
          const unansweredQuestions = await taskQueue.getUnansweredQuestions();
          if (unansweredQuestions.length > 0) {
            workFound = true;
            instructions = `\n\n**🔔 QUESTIONS REQUIRING YOUR ATTENTION:**\n`;
            instructions += `Found ${unansweredQuestions.length} unanswered question(s).\n`;
            instructions += `\n**NEXT ACTION:** Check questions with @ai-collab get_all_questions {}\n`;
          } else {
            // Check if we should create new tasks based on project progress
            const completedTasks = allTasks.filter(t => t.status === 'completed');
            const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
            const inProgressTasks = allTasks.filter(t => t.status === 'in_progress' || t.status === 'in_review');
            
            if (pendingTasks.length === 0 && inProgressTasks.length === 0) {
              // No work in progress, CTO should create next tasks
              workFound = true;
              
              // Check for active project plan
              const activePlan = await projectPlanManager.getActivePlan();
              
              if (activePlan) {
                const nextPhase = await projectPlanManager.getNextPhase(activePlan.id);
                
                if (nextPhase) {
                  // Check if tasks from this phase already exist
                  const phaseTaskTitles = nextPhase.phase.tasks.map(t => t.title.toLowerCase());
                  const existingTitles = completedTasks.map(t => t.title.toLowerCase());
                  
                  // Filter out tasks that already exist
                  const newTasks = nextPhase.phase.tasks.filter(task => {
                    const taskTitle = task.title.toLowerCase();
                    // Check for exact or similar matches
                    const alreadyExists = existingTitles.some(existing => {
                      return existing.includes('drag') && taskTitle.includes('drag') ||
                             existing.includes('drag-and-drop') && taskTitle.includes('drag-and-drop') ||
                             existing === taskTitle ||
                             (existing.includes(taskTitle.split(' ').slice(0, 3).join(' ')));
                    });
                    return !alreadyExists;
                  });
                  
                  if (newTasks.length === 0) {
                    // All tasks in this phase are complete, move to next phase
                    instructions = `\n\n**✅ PHASE COMPLETE:**\n`;
                    instructions += `All tasks in Phase ${nextPhase.phaseNumber} (${nextPhase.phase.name}) are already implemented!\n`;
                    instructions += `\n**NEXT ACTION:** Update plan progress to move to next phase:\n`;
                    instructions += `@ai-collab update_plan_progress {"phaseComplete": true}\n`;
                    
                    // Update plan progress automatically
                    await projectPlanManager.updatePlanProgress(activePlan.id, {
                      currentPhaseComplete: true,
                      completedTasks: completedTasks.length
                    });
                  } else {
                    instructions = `\n\n**📝 PROJECT PLAN - NEXT PHASE READY:**\n`;
                    instructions += `\nPlan: ${activePlan.title}\n`;
                    instructions += `Progress: Phase ${nextPhase.phaseNumber}/${nextPhase.totalPhases}\n`;
                    instructions += `\n**CURRENT PHASE: ${nextPhase.phase.name}**\n`;
                    instructions += `${nextPhase.phase.description}\n\n`;
                    
                    instructions += `**COMPLETED FROM THIS PHASE:**\n`;
                    const completedInPhase = nextPhase.phase.tasks.filter(t => !newTasks.includes(t));
                    completedInPhase.forEach(task => {
                      instructions += `✓ ${task.title}\n`;
                    });
                    
                    instructions += `\n**TASKS TO CREATE FOR THIS PHASE:**\n`;
                    newTasks.forEach((task, index) => {
                      instructions += `${index + 1}. ${task.title}\n`;
                      instructions += `   Type: ${task.type}, Priority: ${task.priority}\n`;
                    });
                    
                    instructions += `\n**NEXT ACTION:** Create the first task from this phase:\n`;
                    const firstTask = newTasks[0];
                    instructions += `@ai-collab send_directive {\n`;
                    instructions += `  "taskId": "KAN-${String(completedTasks.length + pendingTasks.length + 1).padStart(3, '0')}",\n`;
                    instructions += `  "title": "${firstTask.title}",\n`;
                    instructions += `  "specification": "${firstTask.specification || firstTask.title}",\n`;
                    instructions += `  "requirements": [...],\n`;
                    instructions += `  "acceptanceCriteria": [...]\n`;
                    instructions += `}\n`;
                  }
                  
                  // Update plan progress
                  await projectPlanManager.updatePlanProgress(activePlan.id, {
                    completedTasks: completedTasks.length
                  });
                } else {
                  instructions = `\n\n**🎉 PROJECT PLAN COMPLETE!**\n`;
                  instructions += `\nAll ${activePlan.phases.length} phases completed successfully!\n`;
                  instructions += `Total tasks completed: ${completedTasks.length}\n\n`;
                  instructions += `**OPTIONS:**\n`;
                  instructions += `1. Create a new project plan\n`;
                  instructions += `2. Create ad-hoc missions for enhancements\n`;
                  instructions += `3. Stop the autonomous loop\n`;
                }
              } else {
                // Fallback to old logic if no project plan exists
                instructions = `\n\n**📝 PROJECT PLANNING NEEDED:**\n`;
                instructions += `No active project plan found. Consider creating one with:\n`;
                instructions += `@ai-collab init {"agentName": "${agentName}", "createProjectPlan": true}\n`;
              }
            } else if (pendingTasks.length > 0) {
              instructions = `\n\n⏳ ${pendingTasks.length} task(s) pending developer work.\n`;
              instructions += `Waiting for developer to pick up and implement...\n`;
            } else {
              instructions = `\n\n✅ No pending reviews or questions.\n`;
              instructions += `${inProgressTasks.length} task(s) in progress. Waiting for submissions...\n`;
            }
          }
        }
      } else if (roleContext.role === 'Senior Developer') {
        // Check for tasks to work on
        const developerTasks = await taskQueue.getPendingTasks('developer');
        const nextWorkableTask = await taskQueue.getNextWorkableTask();
        
        if (nextWorkableTask) {
          workFound = true;
          instructions = `\n\n**🔔 WORK AVAILABLE:**\n`;
          instructions += `Found ${developerTasks.length} task(s) to implement:\n`;
          
          // Show priority task first
          instructions += `\n🎯 **PRIORITY TASK:**\n`;
          instructions += `📋 Task ${nextWorkableTask.taskId}: ${nextWorkableTask.title}\n`;
          instructions += `   Priority: ${nextWorkableTask.priority || 'medium'}\n`;
          instructions += `   Status: ${nextWorkableTask.status}\n`;
          if (nextWorkableTask.dependsOn?.length > 0) {
            instructions += `   Dependencies: All met ✓\n`;
          }
          
          // Show other available tasks
          const otherTasks = developerTasks.filter(t => t.taskId !== nextWorkableTask.taskId);
          if (otherTasks.length > 0) {
            instructions += `\n📋 **OTHER AVAILABLE TASKS:**\n`;
            for (const task of otherTasks.slice(0, 2)) {
              instructions += `• ${task.taskId}: ${task.title} (${task.priority || 'medium'})\n`;
            }
          }
          
          instructions += `\n**🚀 CONTINUOUS WORK MODE:**\n`;
          instructions += `I will now:\n`;
          instructions += `1. Work on ${nextWorkableTask.taskId} immediately\n`;
          instructions += `2. Submit the work when complete\n`;
          instructions += `3. Automatically move to the next available task\n`;
          instructions += `4. Continue until all available tasks are complete\n`;
          
          instructions += `\n**NEXT ACTION:** Starting work on ${nextWorkableTask.taskId} now...\n`;
          instructions += `\n💡 **TIP**: After submitting this task, you'll automatically see the next available task!`;
          
          // Update task status to in_progress
          await taskQueue.updateTaskStatus(nextWorkableTask.taskId, 'in_progress');
        } else {
          // Check if waiting for review responses
          const allTasks = await taskQueue.getAllTasks();
          const inReview = allTasks.filter(t => 
            t.status === 'in_review' && 
            t.submissions && 
            t.submissions.some(s => s.status === 'pending_review')
          );
          
          const blockedTasks = allTasks.filter(t => t.status === 'blocked');
          
          if (inReview.length > 0) {
            instructions = `\n\n⏳ Waiting for CTO review on ${inReview.length} submission(s).\n`;
            instructions += `Will check again for new tasks or review feedback...\n`;
          } else if (blockedTasks.length > 0) {
            instructions = `\n\n🚧 ${blockedTasks.length} task(s) are blocked by dependencies:\n`;
            for (const task of blockedTasks.slice(0, 3)) {
              instructions += `• ${task.taskId}: Waiting for ${task.dependsOn.join(', ')}\n`;
            }
            instructions += `\nWill check again when dependencies are resolved...\n`;
          } else {
            instructions = `\n\n✅ No pending tasks.\n`;
            instructions += `Waiting for new assignments...\n`;
          }
        }
      }
      
      // Calculate time until next check
      const secondsUntilNext = Math.max(0, Math.floor((new Date(loopState.nextCheckAt) - new Date()) / 1000));
      
      status += `\n${instructions}`;
      status += `\n⏰ Next automatic check in ${secondsUntilNext} seconds.`;
      status += `\nTo continue the loop, wait ${secondsUntilNext} seconds then run:\n`;
      status += `@ai-collab get_loop_status {"agentName": "${agentName}"}\n`;
      
      // Add reminder about automatic continuation
      if (loopState.currentIteration > 2 && !workFound) {
        status += `\n⚠️ **REMINDER**: The autonomous loop requires you to manually run the get_loop_status command.\n`;
        status += `Continue checking every ${loopState.checkInterval} seconds until work appears or max iterations reached.\n`;
      }
      
      // Suggest stopping if no work for many iterations
      if (loopState.consecutiveEmptyChecks > 10) {
        status += `\n💡 **TIP**: No work found for ${loopState.consecutiveEmptyChecks} checks. Consider:\n`;
        status += `- Stopping the loop: @ai-collab stop_autonomous_loop {"agentName": "${agentName}"}\n`;
        status += `- Or wait for the other agent to complete their work\n`;
      }
      
      // Update loop state with work status
      if (workFound) {
        await loopStateManager.updateLoop(agentName, {
          lastWorkFound: new Date().toISOString(),
          consecutiveEmptyChecks: 0
        });
      } else {
        const currentEmptyChecks = loopState.consecutiveEmptyChecks || 0;
        await loopStateManager.updateLoop(agentName, {
          consecutiveEmptyChecks: currentEmptyChecks + 1
        });
      }
      
      return {
        content: [
          {
            type: 'text',
            text: status,
          },
        ],
      };
    }

    case 'create_project_plan': {
      const { title, description, requirementsPath, autoGenerate } = args;
      
      let requirements = null;
      if (requirementsPath || autoGenerate) {
        try {
          const reqPath = requirementsPath || path.join(process.cwd(), 'PROJECT_REQUIREMENTS.md');
          requirements = await fs.readFile(reqPath, 'utf8');
        } catch (e) {
          // No requirements file
        }
      }
      
      let phases = [];
      if (requirements && autoGenerate) {
        phases = await projectPlanManager.generatePhaseBreakdown(requirements);
      }
      
      const plan = await projectPlanManager.createProjectPlan({
        title,
        description: description || title,
        createdBy: 'system',
        phases,
        projectRequirements: requirements
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Project plan created: ${plan.id}\n\nTitle: ${plan.title}\nPhases: ${plan.phases.length}\nTotal Tasks: ${plan.totalTasks}\nStatus: ${plan.status}`,
          },
        ],
      };
    }

    case 'get_project_plan': {
      const activePlan = await projectPlanManager.getActivePlan();
      
      if (!activePlan) {
        return {
          content: [
            {
              type: 'text',
              text: 'No active project plan found.',
            },
          ],
        };
      }
      
      const nextPhase = await projectPlanManager.getNextPhase(activePlan.id);
      
      let response = `**Active Project Plan**\n`;
      response += `Title: ${activePlan.title}\n`;
      response += `Status: ${activePlan.status}\n`;
      response += `Progress: ${activePlan.completedTasks}/${activePlan.totalTasks} tasks\n`;
      response += `Current Phase: ${activePlan.currentPhase + 1}/${activePlan.phases.length}\n\n`;
      
      if (nextPhase) {
        response += `**Next Phase: ${nextPhase.phase.name}**\n`;
        response += nextPhase.phase.tasks.map(t => `- ${t.title}`).join('\n');
      }
      
      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    }

    case 'update_plan_progress': {
      const { phaseComplete, adjustments } = args;
      const activePlan = await projectPlanManager.getActivePlan();
      
      if (!activePlan) {
        throw new Error('No active project plan to update');
      }
      
      const updates = {
        currentPhaseComplete: phaseComplete || false
      };
      
      if (adjustments) {
        await projectPlanManager.adjustPlan(activePlan.id, adjustments);
      }
      
      const updatedPlan = await projectPlanManager.updatePlanProgress(activePlan.id, updates);
      
      return {
        content: [
          {
            type: 'text',
            text: `Plan updated. Current phase: ${updatedPlan.currentPhase + 1}/${updatedPlan.phases.length}`,
          },
        ],
      };
    }

    case 'diagnose_tasks': {
      // Get all tasks from task queue
      const allTasks = await taskQueue.getAllTasks();
      const taskIds = Object.keys(allTasks);
      
      // Get project state
      const projectStateData = await projectState.getFullState();
      const projectPlan = projectStateData.components?.project_plan || {};
      
      // Extract task IDs from project state phases
      const stateTaskIds = new Set();
      if (projectPlan.phases) {
        projectPlan.phases.forEach(phase => {
          if (phase.tasks) {
            phase.tasks.forEach(taskId => stateTaskIds.add(taskId));
          }
        });
      }
      
      // Find discrepancies
      const missingInTaskQueue = Array.from(stateTaskIds).filter(id => !taskIds.includes(id));
      const missingInProjectState = taskIds.filter(id => !stateTaskIds.has(id));
      
      let diagnosis = `📊 **Task State Diagnosis**\n\n`;
      diagnosis += `**Task Queue Status:**\n`;
      diagnosis += `- Total tasks in queue: ${taskIds.length}\n`;
      diagnosis += `- Task IDs: ${taskIds.length > 0 ? taskIds.join(', ') : 'NONE'}\n\n`;
      
      diagnosis += `**Project State Status:**\n`;
      diagnosis += `- Total tasks in project state: ${stateTaskIds.size}\n`;
      diagnosis += `- Task IDs: ${stateTaskIds.size > 0 ? Array.from(stateTaskIds).join(', ') : 'NONE'}\n\n`;
      
      diagnosis += `**Discrepancies:**\n`;
      if (missingInTaskQueue.length > 0) {
        diagnosis += `❌ Tasks in project state but NOT in task queue: ${missingInTaskQueue.join(', ')}\n`;
        diagnosis += `   These tasks were referenced but never created with send_directive!\n\n`;
      }
      if (missingInProjectState.length > 0) {
        diagnosis += `⚠️ Tasks in queue but NOT in project state: ${missingInProjectState.join(', ')}\n`;
        diagnosis += `   These tasks exist but aren't tracked in the project plan.\n\n`;
      }
      if (missingInTaskQueue.length === 0 && missingInProjectState.length === 0) {
        diagnosis += `✅ No discrepancies found - all tasks are properly synchronized.\n\n`;
      }
      
      diagnosis += `**Recommendation:**\n`;
      if (missingInTaskQueue.length > 0) {
        diagnosis += `The CTO needs to create the missing tasks using send_directive or send_batch_directives.\n`;
        diagnosis += `Example: @ai-collab send_directive {"taskId": "${missingInTaskQueue[0]}", "title": "...", "specification": "..."}\n`;
      }
      
      return {
        content: [{
          type: 'text',
          text: diagnosis
        }]
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