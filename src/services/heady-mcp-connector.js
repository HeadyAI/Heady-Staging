// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/services/heady-mcp-connector.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * Heady MCP Connector - 100% Heady Service Implementation
 * 
 * Replaces all external MCP connectors (Google Drive, Calendar, etc.)
 * with Heady-native services. All data stays within the Heady ecosystem.
 */

const { getBrainConnector } = require('../brain_connector');
const EventEmitter = require('events');

class HeadyMCPConnector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.brainConnector = getBrainConnector(options);
    this.services = new Map();
    this.initializeServices();
  }

  initializeServices() {
    // Initialize Heady-native services
    this.services.set('drive', {
      name: 'HeadyDrive',
      description: 'Heady native file storage and collaboration',
      endpoint: '/api/mcp/HeadyDrive'
    });
    
    this.services.set('calendar', {
      name: 'HeadyCalendar',
      description: 'Heady native calendar and scheduling',
      endpoint: '/api/mcp/HeadyCalendar'
    });
    
    this.services.set('email', {
      name: 'HeadyMail',
      description: 'Heady native email communication',
      endpoint: '/api/mcp/HeadyMail'
    });
    
    this.services.set('notes', {
      name: 'HeadyNotes',
      description: 'Heady native note-taking and knowledge management',
      endpoint: '/api/mcp/HeadyNotes'
    });
    
    this.services.set('tasks', {
      name: 'HeadyTasks',
      description: 'Heady native task and project management',
      endpoint: '/api/mcp/HeadyTasks'
    });
  }

  /**
   * List available Heady services
   */
  async listServices() {
    return Array.from(this.services.entries()).map(([id, service]) => ({
      id,
      name: service.name,
      description: service.description
    }));
  }

  /**
   * Execute MCP command through HeadyBrain
   */
  async execute(serviceId, command, params = {}) {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Unknown Heady service: ${serviceId}`);
    }

    try {
      const response = await this.brainConnector.request(service.endpoint, {
        method: 'POST',
        data: {
          command,
          params,
          timestamp: Date.now(),
          source: 'heady-mcp-connector'
        }
      });

      return {
        service: serviceId,
        command,
        result: response.data,
        timestamp: Date.now()
      };
    } catch (error) {
      this.emit('error', { service: serviceId, command, error });
      throw new Error(`Heady ${service.name} command failed: ${error.message}`);
    }
  }

  // HeadyDrive methods (replaces Google Drive)
  async driveListFiles(folder = 'root') {
    return this.execute('drive', 'listFiles', { folder });
  }

  async driveUploadFile(file, folder = 'root') {
    return this.execute('drive', 'uploadFile', { file, folder });
  }

  async driveDownloadFile(fileId) {
    return this.execute('drive', 'downloadFile', { fileId });
  }

  async driveShareFile(fileId, users, permissions = 'read') {
    return this.execute('drive', 'shareFile', { fileId, users, permissions });
  }

  // HeadyCalendar methods (replaces Google Calendar)
  async calendarListCalendars() {
    return this.execute('calendar', 'listCalendars');
  }

  async calendarCreateEvent(calendarId, event) {
    return this.execute('calendar', 'createEvent', { calendarId, event });
  }

  async calendarListEvents(calendarId, start, end) {
    return this.execute('calendar', 'listEvents', { calendarId, start, end });
  }

  async calendarUpdateEvent(eventId, updates) {
    return this.execute('calendar', 'updateEvent', { eventId, updates });
  }

  // HeadyMail methods (replaces Gmail/Outlook)
  async mailListMessages(folder = 'inbox', limit = 50) {
    return this.execute('email', 'listMessages', { folder, limit });
  }

  async mailSendMessage(to, subject, body, attachments = []) {
    return this.execute('email', 'sendMessage', { to, subject, body, attachments });
  }

  async mailGetMessage(messageId) {
    return this.execute('email', 'getMessage', { messageId });
  }

  // HeadyNotes methods (replaces Google Keep/Notion)
  async notesListNotes(folder = 'all') {
    return this.execute('notes', 'listNotes', { folder });
  }

  async notesCreateNote(title, content, tags = []) {
    return this.execute('notes', 'createNote', { title, content, tags });
  }

  async notesUpdateNote(noteId, updates) {
    return this.execute('notes', 'updateNote', { noteId, updates });
  }

  async notesSearchNotes(query) {
    return this.execute('notes', 'searchNotes', { query });
  }

  // HeadyTasks methods (replaces Todoist/Asana)
  async tasksListTasks(project = 'all', status = 'all') {
    return this.execute('tasks', 'listTasks', { project, status });
  }

  async tasksCreateTask(title, description, dueDate, project = 'default') {
    return this.execute('tasks', 'createTask', { title, description, dueDate, project });
  }

  async tasksUpdateTask(taskId, updates) {
    return this.execute('tasks', 'updateTask', { taskId, updates });
  }

  /**
   * Get service health status
   */
  async health() {
    const results = new Map();
    
    for (const [serviceId] of this.services) {
      try {
        const response = await this.brainConnector.request(`/api/mcp/${serviceId}/health`, {
          method: 'GET',
          timeout: 3000
        });
        results.set(serviceId, { status: 'healthy', response });
      } catch (error) {
        results.set(serviceId, { status: 'unhealthy', error: error.message });
      }
    }
    
    return {
      services: Object.fromEntries(results),
      total: this.services.size,
      healthy: Array.from(results.values()).filter(r => r.status === 'healthy').length
    };
  }
}

// Singleton instance
let instance = null;

function getHeadyMCPConnector(options) {
  if (!instance) {
    instance = new HeadyMCPConnector(options);
  }
  return instance;
}

module.exports = {
  HeadyMCPConnector,
  getHeadyMCPConnector
};
