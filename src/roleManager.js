import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.join(__dirname, '..', 'config');

export class RoleManager {
  constructor() {
    this.roles = null;
    this.agents = null;
    this.loadConfigurations();
  }

  async loadConfigurations() {
    try {
      // Load roles configuration
      const rolesData = await fs.readFile(path.join(CONFIG_DIR, 'roles.json'), 'utf8');
      this.roles = JSON.parse(rolesData);

      // Load agents configuration
      const agentsData = await fs.readFile(path.join(CONFIG_DIR, 'agents.json'), 'utf8');
      this.agents = JSON.parse(agentsData);
    } catch (error) {
      console.error('Failed to load role configurations:', error);
      // Use defaults if config files don't exist
      this.roles = {
        developer: { name: 'Developer', responsibilities: ['Implement features'] },
        cto: { name: 'CTO', responsibilities: ['Review code', 'Make architectural decisions'] }
      };
      this.agents = {
        agents: { claude: { role: 'developer' }, gemini: { role: 'cto' } },
        active_configuration: 'default'
      };
    }
  }

  getRole(roleName) {
    return this.roles[roleName] || null;
  }

  getAgentRole(agentName) {
    const agent = this.agents.agents[agentName.toLowerCase()];
    return agent ? agent.role : null;
  }

  getRoleByAgent(agentName) {
    const roleName = this.getAgentRole(agentName);
    return roleName ? this.getRole(roleName) : null;
  }

  getRoleContext(agentName) {
    const role = this.getRoleByAgent(agentName);
    if (!role) return null;

    return {
      role: role.name,
      description: role.description,
      responsibilities: role.responsibilities,
      capabilities: role.capabilities,
      communication_style: role.communication_style,
      decision_authority: role.decision_authority
    };
  }

  async setAgentRole(agentName, roleName) {
    if (!this.roles[roleName]) {
      throw new Error(`Unknown role: ${roleName}`);
    }

    this.agents.agents[agentName.toLowerCase()] = {
      ...this.agents.agents[agentName.toLowerCase()],
      role: roleName
    };

    // Save updated configuration
    await fs.writeFile(
      path.join(CONFIG_DIR, 'agents.json'),
      JSON.stringify(this.agents, null, 2)
    );
  }

  async switchConfiguration(configName) {
    const config = this.agents.team_configurations[configName];
    if (!config) {
      throw new Error(`Unknown configuration: ${configName}`);
    }

    // Apply the configuration
    for (const [agent, role] of Object.entries(config)) {
      if (agent !== 'additional_agents') {
        this.agents.agents[agent].role = role;
      }
    }

    this.agents.active_configuration = configName;

    // Save updated configuration
    await fs.writeFile(
      path.join(CONFIG_DIR, 'agents.json'),
      JSON.stringify(this.agents, null, 2)
    );
  }

  getAllRoles() {
    return Object.keys(this.roles);
  }

  getActiveConfiguration() {
    return {
      name: this.agents.active_configuration,
      assignments: this.agents.team_configurations[this.agents.active_configuration]
    };
  }
}