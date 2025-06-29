import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, '..', 'logs');

export class CommunicationLogger {
  constructor() {
    this.initializeLogsDir();
  }

  async initializeLogsDir() {
    try {
      await fs.mkdir(LOGS_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize logs directory:', error);
    }
  }

  async getLogFile(type) {
    const date = new Date().toISOString().split('T')[0];
    return path.join(LOGS_DIR, `${type}-${date}.jsonl`);
  }

  async appendLog(type, entry) {
    const logFile = await this.getLogFile(type);
    const logEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      type,
    };
    
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  }

  async logDirective(directive) {
    await this.appendLog('directives', {
      action: 'directive_created',
      taskId: directive.taskId,
      title: directive.title,
      from: 'cto',
      to: 'developer',
      data: directive,
    });
  }

  async logSubmission(submission) {
    await this.appendLog('submissions', {
      action: 'work_submitted',
      taskId: submission.taskId,
      from: 'developer',
      to: 'cto',
      data: submission,
    });
  }

  async logReview(review) {
    await this.appendLog('reviews', {
      action: 'review_submitted',
      taskId: review.taskId,
      status: review.status,
      from: 'cto',
      to: 'developer',
      data: review,
    });
  }

  async logQuestion(question) {
    await this.appendLog('questions', {
      action: 'question_asked',
      taskId: question.taskId,
      from: 'developer',
      to: 'cto',
      data: question,
    });
  }

  async logError(error) {
    await this.appendLog('errors', {
      action: 'error_occurred',
      error: error.message,
      stack: error.stack,
      data: error,
    });
  }

  async getLogs(type = 'all', limit = 100) {
    const logs = [];
    const logTypes = type === 'all' 
      ? ['directives', 'submissions', 'reviews', 'questions', 'errors']
      : [type];
    
    for (const logType of logTypes) {
      try {
        const logFile = await this.getLogFile(logType);
        const content = await fs.readFile(logFile, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean);
        
        for (const line of lines.slice(-limit)) {
          try {
            logs.push(JSON.parse(line));
          } catch (e) {
            console.error('Failed to parse log line:', e);
          }
        }
      } catch (error) {
        // Log file might not exist yet
        if (error.code !== 'ENOENT') {
          console.error(`Failed to read ${logType} logs:`, error);
        }
      }
    }
    
    // Sort by timestamp
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return logs.slice(0, limit);
  }

  async generateReport(startDate, endDate) {
    const allLogs = await this.getLogs('all', 10000);
    
    const filteredLogs = allLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= new Date(startDate) && logDate <= new Date(endDate);
    });
    
    const report = {
      period: { start: startDate, end: endDate },
      summary: {
        totalDirectives: filteredLogs.filter(l => l.action === 'directive_created').length,
        totalSubmissions: filteredLogs.filter(l => l.action === 'work_submitted').length,
        totalReviews: filteredLogs.filter(l => l.action === 'review_submitted').length,
        approvedReviews: filteredLogs.filter(l => l.action === 'review_submitted' && l.status === 'approved').length,
        totalQuestions: filteredLogs.filter(l => l.action === 'question_asked').length,
        totalErrors: filteredLogs.filter(l => l.action === 'error_occurred').length,
      },
      logs: filteredLogs,
    };
    
    return report;
  }
}