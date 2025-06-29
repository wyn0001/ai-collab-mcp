import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const TICKETS_DIR = path.join(DATA_DIR, 'tickets');
const CONFIG_DIR = path.join(__dirname, '..', 'config');

export class TicketManager {
  constructor() {
    this.ticketsFile = path.join(TICKETS_DIR, 'tickets.json');
    this.templatesFile = path.join(CONFIG_DIR, 'ticket-templates.json');
    this.initializeTicketsDir();
  }

  async initializeTicketsDir() {
    try {
      await fs.mkdir(TICKETS_DIR, { recursive: true });
      
      // Initialize tickets file if it doesn't exist
      try {
        await fs.access(this.ticketsFile);
      } catch {
        await this.saveTickets({
          bugs: {},
          enhancements: {},
          techDebt: {},
          implementationPlans: {},
          metadata: {
            nextId: 1,
            createdAt: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize tickets directory:', error);
    }
  }

  async loadTickets() {
    try {
      const data = await fs.readFile(this.ticketsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return {
        bugs: {},
        enhancements: {},
        techDebt: {},
        implementationPlans: {},
        metadata: { nextId: 1 }
      };
    }
  }

  async saveTickets(tickets) {
    await fs.writeFile(this.ticketsFile, JSON.stringify(tickets, null, 2));
  }

  async loadTemplates() {
    try {
      const data = await fs.readFile(this.templatesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load ticket templates:', error);
      return {};
    }
  }

  generateTicketId(type) {
    const prefixes = {
      bug: 'BUG',
      enhancement: 'ENH',
      techDebt: 'DEBT',
      implementationPlan: 'IMPL'
    };
    return `${prefixes[type] || 'TICKET'}`;
  }

  async createTicket(type, data, createdBy) {
    const tickets = await this.loadTickets();
    const templates = await this.loadTemplates();
    
    if (!templates[type]) {
      throw new Error(`Unknown ticket type: ${type}`);
    }

    // Generate ticket ID
    const ticketId = `${this.generateTicketId(type)}-${String(tickets.metadata.nextId).padStart(4, '0')}`;
    tickets.metadata.nextId++;

    // Create ticket
    const ticket = {
      id: ticketId,
      type,
      status: 'open',
      createdBy,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      data,
      history: [{
        action: 'created',
        by: createdBy,
        at: new Date().toISOString(),
        changes: { status: 'open' }
      }],
      watchers: [createdBy],
      linkedItems: {
        tickets: [],
        tasks: [],
        missions: []
      }
    };

    // Store in appropriate category
    const category = type === 'implementationPlan' ? 'implementationPlans' : type + 's';
    tickets[category][ticketId] = ticket;

    await this.saveTickets(tickets);
    return ticketId;
  }

  async updateTicket(ticketId, updates, updatedBy) {
    const tickets = await this.loadTickets();
    
    // Find the ticket
    let ticket = null;
    let category = null;
    
    for (const cat of ['bugs', 'enhancements', 'techDebt', 'implementationPlans']) {
      if (tickets[cat][ticketId]) {
        ticket = tickets[cat][ticketId];
        category = cat;
        break;
      }
    }

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    // Record changes
    const changes = {};
    for (const [key, value] of Object.entries(updates)) {
      if (ticket[key] !== value) {
        changes[key] = { from: ticket[key], to: value };
        ticket[key] = value;
      }
    }

    if (Object.keys(changes).length > 0) {
      ticket.lastUpdated = new Date().toISOString();
      ticket.history.push({
        action: 'updated',
        by: updatedBy,
        at: new Date().toISOString(),
        changes
      });
    }

    await this.saveTickets(tickets);
    return ticket;
  }

  async linkTickets(ticketId, linkedTicketId, linkType = 'related') {
    const tickets = await this.loadTickets();
    
    // Find both tickets
    let ticket = null;
    for (const cat of ['bugs', 'enhancements', 'techDebt', 'implementationPlans']) {
      if (tickets[cat][ticketId]) {
        ticket = tickets[cat][ticketId];
        break;
      }
    }

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    // Add link
    if (!ticket.linkedItems.tickets.some(link => link.id === linkedTicketId)) {
      ticket.linkedItems.tickets.push({
        id: linkedTicketId,
        type: linkType,
        linkedAt: new Date().toISOString()
      });
    }

    await this.saveTickets(tickets);
  }

  async linkToMission(ticketId, missionId) {
    const tickets = await this.loadTickets();
    
    let ticket = null;
    let category = null;
    
    for (const cat of ['bugs', 'enhancements', 'techDebt', 'implementationPlans']) {
      if (tickets[cat][ticketId]) {
        ticket = tickets[cat][ticketId];
        category = cat;
        break;
      }
    }

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    if (!ticket.linkedItems.missions.includes(missionId)) {
      ticket.linkedItems.missions.push(missionId);
    }

    await this.saveTickets(tickets);
  }

  async getTicketsByStatus(status, type = null) {
    const tickets = await this.loadTickets();
    const results = [];

    const categories = type ? [type + 's'] : ['bugs', 'enhancements', 'techDebt', 'implementationPlans'];
    
    for (const category of categories) {
      if (tickets[category]) {
        for (const ticket of Object.values(tickets[category])) {
          if (ticket.status === status) {
            results.push(ticket);
          }
        }
      }
    }

    return results;
  }

  async getTicketsByPriority(priority, type = null) {
    const tickets = await this.loadTickets();
    const results = [];

    const categories = type ? [type + 's'] : ['bugs', 'enhancements', 'techDebt', 'implementationPlans'];
    
    for (const category of categories) {
      if (tickets[category]) {
        for (const ticket of Object.values(tickets[category])) {
          if (ticket.data.priority === priority || ticket.data.severity === priority) {
            results.push(ticket);
          }
        }
      }
    }

    return results;
  }

  async getTicket(ticketId) {
    const tickets = await this.loadTickets();
    
    for (const category of ['bugs', 'enhancements', 'techDebt', 'implementationPlans']) {
      if (tickets[category][ticketId]) {
        return tickets[category][ticketId];
      }
    }
    
    return null;
  }

  async getAllTickets() {
    const tickets = await this.loadTickets();
    const allTickets = [];

    for (const category of ['bugs', 'enhancements', 'techDebt', 'implementationPlans']) {
      if (tickets[category]) {
        allTickets.push(...Object.values(tickets[category]));
      }
    }

    return allTickets;
  }

  async generateTicketReport() {
    const tickets = await this.loadTickets();
    
    const report = {
      summary: {
        total: 0,
        byType: {},
        byStatus: {},
        byPriority: {}
      },
      details: {
        openBugs: [],
        criticalItems: [],
        recentlyCreated: [],
        recentlyUpdated: []
      }
    };

    // Analyze all tickets
    for (const category of ['bugs', 'enhancements', 'techDebt', 'implementationPlans']) {
      const typeName = category.replace(/s$/, '');
      report.summary.byType[typeName] = 0;
      
      if (tickets[category]) {
        for (const ticket of Object.values(tickets[category])) {
          report.summary.total++;
          report.summary.byType[typeName]++;
          
          // By status
          report.summary.byStatus[ticket.status] = (report.summary.byStatus[ticket.status] || 0) + 1;
          
          // By priority
          const priority = ticket.data.priority || ticket.data.severity || 'unset';
          report.summary.byPriority[priority] = (report.summary.byPriority[priority] || 0) + 1;
          
          // Collect details
          if (ticket.type === 'bug' && ticket.status === 'open') {
            report.details.openBugs.push(ticket);
          }
          
          if (priority === 'critical' || priority === 'high') {
            report.details.criticalItems.push(ticket);
          }
          
          // Recent items (last 7 days)
          const createdDate = new Date(ticket.createdAt);
          const updatedDate = new Date(ticket.lastUpdated);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          
          if (createdDate > sevenDaysAgo) {
            report.details.recentlyCreated.push(ticket);
          }
          
          if (updatedDate > sevenDaysAgo && updatedDate > createdDate) {
            report.details.recentlyUpdated.push(ticket);
          }
        }
      }
    }

    // Sort details
    report.details.openBugs.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.data.severity] || 4) - (priorityOrder[b.data.severity] || 4);
    });

    return report;
  }
}