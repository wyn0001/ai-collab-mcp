import { promises as fs } from 'fs';
import path from 'path';

export class LoopStateManager {
  constructor(dataPath = './data') {
    this.dataPath = dataPath;
    this.loopStatesFile = path.join(dataPath, 'loop-states.json');
    this.loopStates = new Map();
  }

  async init() {
    await this.loadStates();
  }

  async loadStates() {
    try {
      const data = await fs.readFile(this.loopStatesFile, 'utf8');
      const states = JSON.parse(data);
      this.loopStates = new Map(Object.entries(states));
    } catch (error) {
      // File doesn't exist yet, start with empty states
      this.loopStates = new Map();
    }
  }

  async saveStates() {
    const states = Object.fromEntries(this.loopStates);
    await fs.writeFile(this.loopStatesFile, JSON.stringify(states, null, 2));
  }

  async startLoop(agentName, options = {}) {
    const loopState = {
      agentName,
      mode: options.mode || 'continuous',
      checkInterval: options.checkInterval || 30,
      maxIterations: options.maxIterations || 100,
      currentIteration: 0,
      isActive: true,
      startedAt: new Date().toISOString(),
      lastCheckAt: null,
      nextCheckAt: new Date(Date.now() + (options.checkInterval || 30) * 1000).toISOString(),
      tasksCompleted: 0,
      reviewsCompleted: 0,
      errors: []
    };

    this.loopStates.set(agentName, loopState);
    await this.saveStates();
    return loopState;
  }

  async updateLoop(agentName, updates) {
    const state = this.loopStates.get(agentName);
    if (!state) return null;

    const updatedState = { ...state, ...updates };
    this.loopStates.set(agentName, updatedState);
    await this.saveStates();
    return updatedState;
  }

  async stopLoop(agentName) {
    const state = this.loopStates.get(agentName);
    if (!state) return null;

    const stoppedState = {
      ...state,
      isActive: false,
      stoppedAt: new Date().toISOString()
    };

    this.loopStates.set(agentName, stoppedState);
    await this.saveStates();
    return stoppedState;
  }

  getLoopState(agentName) {
    return this.loopStates.get(agentName) || null;
  }

  getAllActiveLoops() {
    return Array.from(this.loopStates.values()).filter(state => state.isActive);
  }

  async incrementIteration(agentName) {
    const state = this.loopStates.get(agentName);
    if (!state || !state.isActive) return null;

    const updatedState = {
      ...state,
      currentIteration: state.currentIteration + 1,
      lastCheckAt: new Date().toISOString(),
      nextCheckAt: new Date(Date.now() + state.checkInterval * 1000).toISOString()
    };

    // Check if we've reached max iterations
    if (updatedState.currentIteration >= state.maxIterations) {
      updatedState.isActive = false;
      updatedState.stoppedAt = new Date().toISOString();
      updatedState.stopReason = 'Max iterations reached';
    }

    this.loopStates.set(agentName, updatedState);
    await this.saveStates();
    return updatedState;
  }
}