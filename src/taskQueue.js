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
    };
    
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

  async getPendingTasks(role) {
    const tasks = await this.loadTasks();
    const pendingTasks = [];
    
    for (const taskId in tasks) {
      const task = tasks[taskId];
      
      if (role === 'developer') {
        // Developer sees pending directives and tasks needing revision
        if (task.status === 'pending' || task.status === 'needs_revision') {
          pendingTasks.push({
            taskId,
            title: task.title,
            status: task.status,
            type: 'directive',
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
      await this.saveTasks(tasks);
    }
  }
}