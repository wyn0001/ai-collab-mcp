import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

export class ProjectState {
  constructor() {
    this.stateFile = path.join(DATA_DIR, 'project-state.json');
    this.initializeState();
  }

  async initializeState() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      // Initialize state file if it doesn't exist
      try {
        await fs.access(this.stateFile);
      } catch {
        await this.saveState({
          components: {},
          architecture: {
            decisions: [],
            patterns: [],
            dependencies: {},
          },
          codeStandards: {
            conventions: [],
            linting: {},
            formatting: {},
          },
          metadata: {
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            version: '1.0.0',
          },
        });
      }
    } catch (error) {
      console.error('Failed to initialize project state:', error);
    }
  }

  async loadState() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        components: {},
        architecture: { decisions: [], patterns: [], dependencies: {} },
        codeStandards: { conventions: [], linting: {}, formatting: {} },
        metadata: {
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    }
  }

  async saveState(state) {
    state.metadata.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
  }

  async updateComponent(componentName, componentState) {
    const state = await this.loadState();
    
    state.components[componentName] = {
      ...state.components[componentName],
      ...componentState,
      lastUpdated: new Date().toISOString(),
    };
    
    await this.saveState(state);
  }

  async getComponent(componentName) {
    const state = await this.loadState();
    return state.components[componentName] || null;
  }

  async getAllComponents() {
    const state = await this.loadState();
    return state.components;
  }

  async addArchitecturalDecision(decision) {
    const state = await this.loadState();
    
    state.architecture.decisions.push({
      ...decision,
      timestamp: new Date().toISOString(),
      id: `AD-${Date.now()}`,
    });
    
    await this.saveState(state);
  }

  async updateDependencies(component, dependencies) {
    const state = await this.loadState();
    
    state.architecture.dependencies[component] = dependencies;
    
    await this.saveState(state);
  }

  async addCodeStandard(standard) {
    const state = await this.loadState();
    
    state.codeStandards.conventions.push({
      ...standard,
      timestamp: new Date().toISOString(),
      id: `CS-${Date.now()}`,
    });
    
    await this.saveState(state);
  }

  async getFullState() {
    return await this.loadState();
  }
}