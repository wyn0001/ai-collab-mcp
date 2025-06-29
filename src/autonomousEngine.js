import { EventEmitter } from 'events';

export class AutonomousEngine extends EventEmitter {
  constructor(taskQueue, missionManager, roleManager) {
    super();
    this.taskQueue = taskQueue;
    this.missionManager = missionManager;
    this.roleManager = roleManager;
    this.activeWorkflows = new Map();
    this.pollingInterval = 5000; // 5 seconds
    this.isRunning = false;
  }

  async startMission(missionData, agentName) {
    // Get the agent's role
    const role = this.roleManager.getRoleByAgent(agentName);
    if (!role) {
      throw new Error(`No role assigned to agent: ${agentName}`);
    }

    // Create the mission
    const missionId = await this.missionManager.createMission({
      ...missionData,
      initiator: agentName,
      assignedTo: role.name
    });

    // Start autonomous workflow for this mission
    const workflow = {
      missionId,
      agentName,
      role: role.name,
      status: 'active',
      startedAt: new Date().toISOString(),
      iterations: 0
    };

    this.activeWorkflows.set(missionId, workflow);
    
    // Start the autonomous work cycle
    this.startWorkCycle(missionId);

    return {
      missionId,
      message: `Mission ${missionId} started. Autonomous workflow initiated.`,
      workflow
    };
  }

  async startWorkCycle(missionId) {
    const workflow = this.activeWorkflows.get(missionId);
    if (!workflow || workflow.status !== 'active') {
      return;
    }

    // Check mission progress
    const { mission, progress, shouldContinue } = await this.missionManager.checkMissionProgress(missionId);

    if (!shouldContinue) {
      workflow.status = 'completed';
      this.emit('missionCompleted', { missionId, mission, progress });
      return;
    }

    // Emit work cycle event
    this.emit('workCycle', {
      missionId,
      mission,
      progress,
      iteration: workflow.iterations++
    });

    // Schedule next cycle
    setTimeout(() => this.startWorkCycle(missionId), this.pollingInterval);
  }

  async getWorkForAgent(agentName) {
    const role = this.roleManager.getRoleByAgent(agentName);
    if (!role) {
      return { tasks: [], missions: [] };
    }

    // Get pending tasks for this role
    const pendingTasks = await this.taskQueue.getPendingTasks(role.name.toLowerCase());

    // Get active missions for this role
    const activeMissions = await this.missionManager.getActiveMissions(role.name);

    // Check for missions that need decomposition
    const missionsNeedingWork = activeMissions.filter(m => 
      m.decompositionPending && role.name === 'Project Manager'
    );

    return {
      role: role.name,
      roleContext: this.roleManager.getRoleContext(agentName),
      tasks: pendingTasks,
      missions: activeMissions,
      missionsNeedingDecomposition: missionsNeedingWork,
      activeWorkflows: Array.from(this.activeWorkflows.values()).filter(
        w => w.agentName === agentName
      )
    };
  }

  async processAutonomousAction(agentName, action) {
    const result = {
      action: action.type,
      status: 'processed',
      timestamp: new Date().toISOString()
    };

    try {
      switch (action.type) {
        case 'decompose_mission': {
          // Project Manager decomposes mission into tasks
          const tasks = action.tasks;
          const missionId = action.missionId;

          for (const task of tasks) {
            const taskId = await this.taskQueue.addDirective({
              ...task,
              missionId,
              createdBy: agentName
            });
            await this.missionManager.addTaskToMission(missionId, taskId);
          }

          result.tasksCreated = tasks.length;
          break;
        }

        case 'complete_task': {
          // Developer completes implementation
          await this.taskQueue.addSubmission({
            ...action.submission,
            submittedBy: agentName
          });
          result.taskId = action.submission.taskId;
          break;
        }

        case 'review_submission': {
          // CTO reviews submission
          await this.taskQueue.addReview({
            ...action.review,
            reviewedBy: agentName
          });
          
          if (action.review.status === 'approved' && action.missionId) {
            // Check if this completes the mission
            await this.missionManager.checkMissionProgress(action.missionId);
          }
          
          result.reviewStatus = action.review.status;
          break;
        }

        case 'ask_clarification': {
          // Any role can ask questions
          const questionId = await this.taskQueue.addQuestion({
            ...action.question,
            askedBy: agentName
          });
          result.questionId = questionId;
          break;
        }

        case 'make_decision': {
          // Record architectural or strategic decisions
          await this.missionManager.recordDecision(action.missionId, {
            ...action.decision,
            madeBy: agentName
          });
          result.decisionRecorded = true;
          break;
        }

        default:
          result.status = 'unknown_action';
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
    }

    this.emit('autonomousAction', { agentName, action, result });
    return result;
  }

  async stopMission(missionId, reason) {
    const workflow = this.activeWorkflows.get(missionId);
    if (workflow) {
      workflow.status = 'stopped';
      workflow.stoppedAt = new Date().toISOString();
      workflow.stopReason = reason;
    }

    await this.missionManager.updateMissionStatus(missionId, 'stopped', reason);
    
    this.emit('missionStopped', { missionId, reason });
  }

  getAllActiveWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }

  async getAutonomousStatus() {
    const activeWorkflows = this.getAllActiveWorkflows();
    const activeMissionIds = activeWorkflows.map(w => w.missionId);
    
    const missionDetails = await Promise.all(
      activeMissionIds.map(id => this.missionManager.getMissionById(id))
    );

    return {
      isRunning: this.isRunning,
      activeWorkflows: activeWorkflows.length,
      missions: missionDetails,
      pollingInterval: this.pollingInterval
    };
  }
}