import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

export class MissionManager {
  constructor(taskQueue, roleManager) {
    this.taskQueue = taskQueue;
    this.roleManager = roleManager;
    this.missionsFile = path.join(DATA_DIR, 'missions.json');
    this.initializeMissions();
  }

  async initializeMissions() {
    try {
      // Ensure data directory exists
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      // Check if missions file exists
      await fs.access(this.missionsFile);
    } catch {
      await this.saveMissions({});
    }
  }

  async loadMissions() {
    try {
      const data = await fs.readFile(this.missionsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async saveMissions(missions) {
    await fs.writeFile(this.missionsFile, JSON.stringify(missions, null, 2));
  }

  async createMission(mission) {
    const missions = await this.loadMissions();
    
    const missionId = `MISSION-${Date.now()}`;
    missions[missionId] = {
      id: missionId,
      title: mission.title,
      objective: mission.objective,
      initiator: mission.initiator,
      assignedTo: mission.assignedTo || 'all',
      acceptanceCriteria: mission.acceptanceCriteria || [],
      constraints: mission.constraints || [],
      status: 'active',
      createdAt: new Date().toISOString(),
      tasks: [],
      decisions: [],
      iterations: 0,
      maxIterations: mission.maxIterations || 50,
      autoDecompose: mission.autoDecompose !== false,
      requiresApproval: mission.requiresApproval || false
    };

    await this.saveMissions(missions);

    // If autoDecompose is true, create initial tasks
    if (missions[missionId].autoDecompose) {
      await this.decomposeMission(missionId);
    }

    return missionId;
  }

  async decomposeMission(missionId) {
    const missions = await this.loadMissions();
    const mission = missions[missionId];
    
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    // This is where an AI with project_manager role would analyze the mission
    // and create specific tasks. For now, we'll create a template structure
    const decompositionPrompt = {
      role: 'project_manager',
      action: 'decompose_mission',
      mission: mission,
      instruction: `Break down this mission into specific, actionable tasks. Consider:
        - Technical dependencies
        - Logical progression
        - Acceptance criteria
        - Risk factors
        - Required expertise`
    };

    // Store the decomposition request
    mission.decompositionPending = true;
    mission.decompositionPrompt = decompositionPrompt;
    
    await this.saveMissions(missions);
    
    return decompositionPrompt;
  }

  async addTaskToMission(missionId, taskId) {
    const missions = await this.loadMissions();
    const mission = missions[missionId];
    
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    if (!mission.tasks.includes(taskId)) {
      mission.tasks.push(taskId);
      mission.lastUpdated = new Date().toISOString();
      await this.saveMissions(missions);
    }
  }

  async updateMissionStatus(missionId, status, reason) {
    const missions = await this.loadMissions();
    const mission = missions[missionId];
    
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    mission.status = status;
    mission.statusReason = reason;
    mission.lastUpdated = new Date().toISOString();
    
    if (status === 'completed') {
      mission.completedAt = new Date().toISOString();
    }

    await this.saveMissions(missions);
  }

  async checkMissionProgress(missionId) {
    const missions = await this.loadMissions();
    const mission = missions[missionId];
    
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    // Get all tasks associated with this mission
    const taskStatuses = await Promise.all(
      mission.tasks.map(taskId => this.taskQueue.getTask(taskId))
    );

    const progress = {
      totalTasks: mission.tasks.length,
      completedTasks: taskStatuses.filter(t => t && t.status === 'completed').length,
      inProgressTasks: taskStatuses.filter(t => t && t.status === 'in_review').length,
      pendingTasks: taskStatuses.filter(t => t && (t.status === 'pending' || t.status === 'needs_revision')).length,
      blockedTasks: taskStatuses.filter(t => t && t.blocked).length
    };

    progress.percentComplete = mission.tasks.length > 0 
      ? Math.round((progress.completedTasks / progress.totalTasks) * 100)
      : 0;

    // Check if mission is complete
    if (progress.completedTasks === progress.totalTasks && progress.totalTasks > 0) {
      // Verify acceptance criteria
      const criteriaCheck = await this.checkAcceptanceCriteria(missionId);
      if (criteriaCheck.allMet) {
        await this.updateMissionStatus(missionId, 'completed', 'All tasks completed and acceptance criteria met');
      } else {
        progress.acceptanceCriteriaStatus = criteriaCheck;
      }
    }

    mission.iterations++;
    await this.saveMissions(missions);

    return {
      mission,
      progress,
      shouldContinue: mission.status === 'active' && mission.iterations < mission.maxIterations
    };
  }

  async checkAcceptanceCriteria(missionId) {
    const missions = await this.loadMissions();
    const mission = missions[missionId];
    
    // This would typically involve more complex checking
    // For now, we'll create a structure for AI evaluation
    return {
      allMet: false,
      criteria: mission.acceptanceCriteria.map(criterion => ({
        criterion,
        status: 'pending_evaluation',
        evidence: []
      })),
      requiresEvaluation: true
    };
  }

  async getActiveMissions(role) {
    const missions = await this.loadMissions();
    
    return Object.values(missions).filter(mission => 
      mission.status === 'active' && 
      (mission.assignedTo === 'all' || mission.assignedTo === role)
    );
  }

  async getMissionById(missionId) {
    const missions = await this.loadMissions();
    return missions[missionId] || null;
  }

  async recordDecision(missionId, decision) {
    const missions = await this.loadMissions();
    const mission = missions[missionId];
    
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    mission.decisions.push({
      ...decision,
      timestamp: new Date().toISOString(),
      id: `DEC-${Date.now()}`
    });

    await this.saveMissions(missions);
  }
}