import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

export class TaskQueue {
  constructor() {
    this.tasksFile = path.join(DATA_DIR, 'tasks.json');
    this.initializeDataDir();
  }

  async initializeDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      // Initialize tasks file if it doesn't exist
      try {
        await fs.access(this.tasksFile);
      } catch {
        await this.saveTasks({});
      }
    } catch (error) {
      console.error('Failed to initialize data directory:', error);
    }
  }

  async loadTasks() {
    try {
      const data = await fs.readFile(this.tasksFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  async saveTasks(tasks) {
    await fs.writeFile(this.tasksFile, JSON.stringify(tasks, null, 2));
  }

  async addDirective(directive) {
    const tasks = await this.loadTasks();
    
    tasks[directive.taskId] = {
      ...directive,
      type: 'directive',
      submissions: [],
      reviews: [],
      questions: [],
      dependsOn: directive.dependsOn || [],
      blockedBy: directive.blockedBy || [],
      priority: directive.priority || 'medium',
    };
    
    // Update task status based on dependencies
    await this.updateTaskAvailability(tasks, directive.taskId);
    
    await this.saveTasks(tasks);
    return directive.taskId;
  }

  async addSubmission(submission) {
    const tasks = await this.loadTasks();
    const task = tasks[submission.taskId];
    
    if (!task) {
      throw new Error(`Task ${submission.taskId} not found`);
    }
    
    task.submissions.push(submission);
    task.status = 'in_review';
    
    await this.saveTasks(tasks);
  }

  async addReview(review) {
    const tasks = await this.loadTasks();
    const task = tasks[review.taskId];
    
    if (!task) {
      throw new Error(`Task ${review.taskId} not found`);
    }
    
    task.reviews.push(review);
    task.status = review.status === 'approved' ? 'completed' : 'needs_revision';
    
    // If approved, update availability of dependent tasks
    if (review.status === 'approved') {
      task.completedAt = new Date().toISOString();
      await this.updateTaskAvailability(tasks);
    }
    
    await this.saveTasks(tasks);
  }

  async addQuestion(question) {
    const tasks = await this.loadTasks();
    const task = tasks[question.taskId];
    
    if (!task) {
      throw new Error(`Task ${question.taskId} not found`);
    }
    
    const questionId = `Q-${Date.now()}`;
    task.questions.push({
      ...question,
      questionId,
    });
    
    await this.saveTasks(tasks);
    return questionId;
  }

  async answerQuestion(questionId, answer) {
    const tasks = await this.loadTasks();
    
    for (const taskId in tasks) {
      const task = tasks[taskId];
      const question = task.questions.find(q => q.questionId === questionId);
      
      if (question) {
        question.answer = answer;
        question.answeredAt = new Date().toISOString();
        question.status = 'answered';
        
        await this.saveTasks(tasks);
        return;
      }
    }
    
    throw new Error(`Question ${questionId} not found`);
  }

  async updateTaskAvailability(tasks, taskIdToUpdate = null) {
    // Update status for a specific task or all tasks
    const taskIds = taskIdToUpdate ? [taskIdToUpdate] : Object.keys(tasks);
    
    for (const taskId of taskIds) {
      const task = tasks[taskId];
      if (!task) continue;
      
      // Skip if task is already completed or in review
      if (task.status === 'completed' || task.status === 'in_review') continue;
      
      // Check if all dependencies are approved
      const hasUnmetDependencies = task.dependsOn?.some(depId => {
        const depTask = tasks[depId];
        return !depTask || depTask.status !== 'completed';
      });
      
      // Check if blocked by any tasks
      const isBlocked = task.blockedBy?.length > 0;
      
      // Update status based on dependencies
      if (hasUnmetDependencies || isBlocked) {
        task.status = 'blocked';
      } else if (task.status === 'blocked') {
        // If it was blocked but dependencies are now met, make it available
        task.status = 'available';
      } else if (task.status === 'pending') {
        // New tasks with no dependencies should be available
        task.status = task.dependsOn?.length === 0 ? 'available' : 'blocked';
      }
    }
  }

  async getPendingTasks(role) {
    const tasks = await this.loadTasks();
    
    // Update task availability before returning
    await this.updateTaskAvailability(tasks);
    await this.saveTasks(tasks);
    
    const pendingTasks = [];
    
    for (const taskId in tasks) {
      const task = tasks[taskId];
      
      if (role === 'developer') {
        // Developer sees available tasks, in-progress tasks, and tasks needing revision
        if (task.status === 'available' || task.status === 'in_progress' || task.status === 'needs_revision') {
          pendingTasks.push({
            taskId,
            title: task.title,
            status: task.status,
            type: 'directive',
            priority: task.priority || 'medium',
            dependsOn: task.dependsOn || [],
            latestReview: task.reviews[task.reviews.length - 1] || null,
          });
        }
      } else if (role === 'cto') {
        // CTO sees tasks in review
        if (task.status === 'in_review') {
          pendingTasks.push({
            taskId,
            title: task.title,
            status: task.status,
            type: 'review',
            latestSubmission: task.submissions[task.submissions.length - 1] || null,
          });
        }
      }
      
      // Both see unanswered questions
      const unansweredQuestions = task.questions.filter(q => q.status === 'unanswered');
      if (unansweredQuestions.length > 0) {
        pendingTasks.push({
          taskId,
          title: task.title,
          type: 'questions',
          questions: unansweredQuestions,
        });
      }
    }
    
    // Sort by priority for developers
    if (role === 'developer') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      pendingTasks.sort((a, b) => {
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        return aPriority - bPriority;
      });
    }
    
    return pendingTasks;
  }

  async getTask(taskId) {
    const tasks = await this.loadTasks();
    return tasks[taskId] || null;
  }

  async getAllTasks() {
    const tasks = await this.loadTasks();
    // Convert to array format for easier processing
    return Object.entries(tasks).map(([taskId, task]) => ({
      taskId,
      ...task
    }));
  }

  async getUnansweredQuestions() {
    const tasks = await this.loadTasks();
    const unansweredQuestions = [];
    
    for (const taskId in tasks) {
      const task = tasks[taskId];
      const questions = task.questions || [];
      
      questions.forEach(q => {
        if (q.status === 'unanswered') {
          unansweredQuestions.push({
            ...q,
            taskId,
            taskTitle: task.title
          });
        }
      });
    }
    
    return unansweredQuestions;
  }

  async markTaskComplete(taskId) {
    const tasks = await this.loadTasks();
    
    if (tasks[taskId]) {
      tasks[taskId].status = 'completed';
      tasks[taskId].completedAt = new Date().toISOString();
      
      // Update availability of dependent tasks
      await this.updateTaskAvailability(tasks);
      await this.saveTasks(tasks);
    }
  }

  async getNextWorkableTask() {
    const tasks = await this.loadTasks();
    
    // Update task availability
    await this.updateTaskAvailability(tasks);
    await this.saveTasks(tasks);
    
    // First, check if there's already an in-progress task
    for (const taskId in tasks) {
      const task = tasks[taskId];
      if (task.status === 'in_progress') {
        return { taskId, ...task };
      }
    }
    
    // Find the highest priority available task
    let bestTask = null;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    for (const taskId in tasks) {
      const task = tasks[taskId];
      
      // Skip non-workable tasks
      if (task.status !== 'available' && task.status !== 'needs_revision') continue;
      
      // If no best task yet, use this one
      if (!bestTask) {
        bestTask = { taskId, ...task };
        continue;
      }
      
      // Compare priorities
      const currentPriority = priorityOrder[task.priority || 'medium'];
      const bestPriority = priorityOrder[bestTask.priority || 'medium'];
      
      if (currentPriority < bestPriority) {
        bestTask = { taskId, ...task };
      }
    }
    
    return bestTask;
  }

  async unblockTask(taskId, blockerTaskId) {
    const tasks = await this.loadTasks();
    const task = tasks[taskId];
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Remove from blockedBy array
    task.blockedBy = (task.blockedBy || []).filter(id => id !== blockerTaskId);
    
    // Update task availability
    await this.updateTaskAvailability(tasks, taskId);
    await this.saveTasks(tasks);
  }

  async addBatchDirectives(directives) {
    const tasks = await this.loadTasks();
    const addedTaskIds = [];
    
    for (const directive of directives) {
      tasks[directive.taskId] = {
        ...directive,
        type: 'directive',
        submissions: [],
        reviews: [],
        questions: [],
        dependsOn: directive.dependsOn || [],
        blockedBy: directive.blockedBy || [],
        priority: directive.priority || 'medium',
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      addedTaskIds.push(directive.taskId);
    }
    
    // Update task availability for all new tasks
    await this.updateTaskAvailability(tasks);
    await this.saveTasks(tasks);
    
    return addedTaskIds;
  }

  async updateTaskStatus(taskId, newStatus) {
    const tasks = await this.loadTasks();
    
    if (tasks[taskId]) {
      tasks[taskId].status = newStatus;
      if (newStatus === 'in_progress') {
        tasks[taskId].startedAt = new Date().toISOString();
      }
      await this.saveTasks(tasks);
    }
  }
}