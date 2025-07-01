import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const PLANS_FILE = path.join(DATA_DIR, 'project-plans.json');

export class ProjectPlanManager {
  constructor() {
    this.initializeDataDir();
  }

  async initializeDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      try {
        await fs.access(PLANS_FILE);
      } catch {
        await this.savePlans({});
      }
    } catch (error) {
      console.error('Failed to initialize project plans directory:', error);
    }
  }

  async loadPlans() {
    try {
      const data = await fs.readFile(PLANS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  async savePlans(plans) {
    await fs.writeFile(PLANS_FILE, JSON.stringify(plans, null, 2));
  }

  async createProjectPlan(planData) {
    const plans = await this.loadPlans();
    const planId = `PLAN-${Date.now()}`;
    
    const plan = {
      id: planId,
      title: planData.title,
      description: planData.description,
      phases: planData.phases || [],
      currentPhase: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: planData.createdBy,
      completedPhases: [],
      totalTasks: 0,
      completedTasks: 0,
      adjustments: [],
      projectRequirements: planData.projectRequirements || null
    };

    // Calculate total tasks
    plan.totalTasks = plan.phases.reduce((total, phase) => 
      total + (phase.tasks ? phase.tasks.length : 1), 0
    );

    plans[planId] = plan;
    await this.savePlans(plans);
    
    return plan;
  }

  async getActivePlan() {
    const plans = await this.loadPlans();
    return Object.values(plans).find(p => p.status === 'active') || null;
  }

  async updatePlanProgress(planId, updates) {
    const plans = await this.loadPlans();
    const plan = plans[planId];
    
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    // Update plan with new progress
    Object.assign(plan, updates, {
      lastUpdated: new Date().toISOString()
    });

    // Check if current phase is complete
    if (updates.currentPhaseComplete) {
      plan.completedPhases.push({
        phaseIndex: plan.currentPhase,
        completedAt: new Date().toISOString(),
        ...plan.phases[plan.currentPhase]
      });
      plan.currentPhase++;
      
      // Check if entire plan is complete
      if (plan.currentPhase >= plan.phases.length) {
        plan.status = 'completed';
        plan.completedAt = new Date().toISOString();
      }
    }

    await this.savePlans(plans);
    return plan;
  }

  async adjustPlan(planId, adjustment) {
    const plans = await this.loadPlans();
    const plan = plans[planId];
    
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    // Record the adjustment
    plan.adjustments.push({
      type: adjustment.type,
      description: adjustment.description,
      madeBy: adjustment.madeBy,
      madeAt: new Date().toISOString(),
      changes: adjustment.changes
    });

    // Apply the adjustment
    if (adjustment.type === 'add_phase') {
      plan.phases.splice(adjustment.insertAfter + 1, 0, adjustment.newPhase);
      plan.totalTasks += adjustment.newPhase.tasks ? adjustment.newPhase.tasks.length : 1;
    } else if (adjustment.type === 'modify_phase') {
      plan.phases[adjustment.phaseIndex] = {
        ...plan.phases[adjustment.phaseIndex],
        ...adjustment.modifications
      };
    } else if (adjustment.type === 'reorder_phases') {
      const [removed] = plan.phases.splice(adjustment.fromIndex, 1);
      plan.phases.splice(adjustment.toIndex, 0, removed);
    }

    await this.savePlans(plans);
    return plan;
  }

  async getNextPhase(planId) {
    const plans = await this.loadPlans();
    const plan = plans[planId];
    
    if (!plan || plan.status !== 'active') {
      return null;
    }

    if (plan.currentPhase < plan.phases.length) {
      return {
        phase: plan.phases[plan.currentPhase],
        phaseNumber: plan.currentPhase + 1,
        totalPhases: plan.phases.length,
        previousPhases: plan.completedPhases
      };
    }

    return null;
  }

  async generatePhaseBreakdown(requirements) {
    // This method should analyze the actual project requirements
    // For now, return empty phases to allow the CTO agent to properly analyze and create phases
    // The CTO should read PROJECT_REQUIREMENTS.md and create appropriate phases
    console.log('generatePhaseBreakdown called - returning empty phases for CTO to populate based on project requirements');
    return [];
  }

  hasCompletedPhase(completedPhases, phaseType) {
    return completedPhases.some(p => 
      p.name.toLowerCase().includes(phaseType.toLowerCase())
    );
  }

  async createAdHocMission(missionData) {
    // Create a single-phase plan for ad-hoc missions
    const plan = await this.createProjectPlan({
      title: missionData.title,
      description: missionData.description,
      createdBy: missionData.createdBy,
      phases: [{
        name: 'Ad-hoc Mission',
        description: missionData.description,
        estimatedDuration: 'Variable',
        tasks: [{
          title: missionData.title,
          type: 'feature',
          priority: 'high',
          specification: missionData.specification,
          requirements: missionData.requirements,
          acceptanceCriteria: missionData.acceptanceCriteria
        }]
      }]
    });

    plan.isAdHoc = true;
    const plans = await this.loadPlans();
    plans[plan.id] = plan;
    await this.savePlans(plans);
    
    return plan;
  }

  async pauseCurrentPlan() {
    const plans = await this.loadPlans();
    const activePlan = Object.values(plans).find(p => p.status === 'active');
    
    if (activePlan) {
      activePlan.status = 'paused';
      activePlan.pausedAt = new Date().toISOString();
      await this.savePlans(plans);
    }
    
    return activePlan;
  }

  async resumePlan(planId) {
    const plans = await this.loadPlans();
    
    // Pause any currently active plans
    Object.values(plans).forEach(p => {
      if (p.status === 'active') {
        p.status = 'paused';
        p.pausedAt = new Date().toISOString();
      }
    });
    
    // Resume the specified plan
    if (plans[planId]) {
      plans[planId].status = 'active';
      plans[planId].resumedAt = new Date().toISOString();
      await this.savePlans(plans);
      return plans[planId];
    }
    
    return null;
  }
}