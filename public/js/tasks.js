class TasksManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentPriorityFilter = '';
        this.editingTaskId = null;
        this.initEventListeners();
    }

    initEventListeners() {
        // Wait for form to exist
        setTimeout(() => {
            const taskForm = document.getElementById('taskForm');
            if (taskForm) {
                taskForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (this.editingTaskId) {
                        this.updateTask();
                    } else {
                        this.createTask();
                    }
                });
            }
    
            // Filter buttons
            setTimeout(() => {
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.setFilter(e.target.dataset.filter);
                    });
                });
    
                // Priority filter
                const priorityFilter = document.getElementById('priorityFilter');
                if (priorityFilter) {
                    priorityFilter.addEventListener('change', (e) => {
                        this.setPriorityFilter(e.target.value);
                    });
                }
    
                // Edit buttons
                const cancelEditBtn = document.getElementById('cancelEditBtn');
                if (cancelEditBtn) {
                    cancelEditBtn.addEventListener('click', () => {
                        this.cancelEdit();
                    });
                }
    
                const updateTaskBtn = document.getElementById('updateTaskBtn');
                if (updateTaskBtn) {
                    updateTaskBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.updateTask();
                    });
                }
            }, 100);
        }, 100);
    }

    async loadTasks() {
        try {
            let url = '/api/tasks';
            const params = new URLSearchParams();
            
            if (this.currentFilter === 'pending') params.append('completed', 'false');
            if (this.currentFilter === 'completed') params.append('completed', 'true');
            if (this.currentPriorityFilter) params.append('priority', this.currentPriorityFilter);
            
            if (params.toString()) url += '?' + params.toString();

            const response = await fetch(url, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Loaded tasks:', data); // Debug log
                this.tasks = data;
                this.renderTasks();
                this.updateStats();
            } else if (response.status === 401) {
                window.authManager.logout();
                throw new Error('Session expired. Please login again.');
            } else {
                throw new Error(`Failed to load tasks: ${response.status}`);
            }
        } catch (error) {
            console.error('Load tasks error:', error);
            this.showNotification('Error loading tasks: ' + error.message, 'error');
        }
    }

    async createTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;

        if (!title) {
            this.showNotification('Please enter a task title', 'error');
            return;
        }

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    title,
                    description,
                    priority,
                    dueDate: dueDate || null
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.showNotification('Task created successfully! 🎉', 'success');
                document.getElementById('taskForm').reset();
                this.loadTasks();
            } else {
                throw new Error(data.message || 'Failed to create task');
            }
        } catch (error) {
            console.error('Create task error:', error);
            this.showNotification('Error creating task: ' + error.message, 'error');
        }
    }

    async updateTask() {
        if (!this.editingTaskId) return;

        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;

        if (!title) {
            this.showNotification('Please enter a task title', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${this.editingTaskId}`, {
                method: 'PUT',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    title,
                    description,
                    priority,
                    dueDate: dueDate || null
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.showNotification('Task updated successfully! 🎉', 'success');
                this.cancelEdit();
                this.loadTasks();
            } else {
                throw new Error(data.message || 'Failed to update task');
            }
        } catch (error) {
            console.error('Update task error:', error);
            this.showNotification('Error updating task: ' + error.message, 'error');
        }
    }

    async deleteTask(taskId) {
        const task = this.tasks.find(t => t._id === taskId);
        const taskTitle = task ? task.title : 'this task';
        
        if (!confirm(`Are you sure you want to delete "${taskTitle}"?`)) return;

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                this.showNotification(`Task "${taskTitle}" deleted successfully!`, 'success');
                this.loadTasks();
            } else if (response.status === 404) {
                throw new Error('Task not found');
            } else {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete task');
            }
        } catch (error) {
            console.error('Delete task error:', error);
            this.showNotification('Error deleting task: ' + error.message, 'error');
        }
    }

    async toggleTaskCompletion(taskId, currentlyCompleted) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({ 
                    completed: !currentlyCompleted,
                    completedAt: !currentlyCompleted ? new Date().toISOString() : null
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                const action = !currentlyCompleted ? 'completed' : 'marked incomplete';
                this.showNotification(`Task ${action} successfully! 🎉`, 'success');
                this.loadTasks();
            } else {
                throw new Error(data.message || 'Failed to update task');
            }
        } catch (error) {
            console.error('Toggle completion error:', error);
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    async editTask(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Task not found');
                } else if (response.status === 401) {
                    window.authManager.logout();
                    throw new Error('Please log in again');
                } else {
                    throw new Error(`Server error: ${response.status}`);
                }
            }

            const task = await response.json();
            this.populateEditForm(task);
        } catch (error) {
            console.error('Edit task error:', error);
            this.showNotification('Error loading task: ' + error.message, 'error');
        }
    }

    populateEditForm(task) {
        this.editingTaskId = task._id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.dueDate ? task.dueDate.split('T')[0] : '';
        
        document.getElementById('addTaskBtn').classList.add('hidden');
        document.getElementById('updateTaskBtn').classList.remove('hidden');
        document.getElementById('cancelEditBtn').classList.remove('hidden');
        
        document.getElementById('taskTitle').focus();
        
        this.showNotification(`Editing task: ${task.title}`, 'info');
    }

    cancelEdit() {
        this.editingTaskId = null;
        document.getElementById('taskForm').reset();
        document.getElementById('addTaskBtn').classList.remove('hidden');
        document.getElementById('updateTaskBtn').classList.add('hidden');
        document.getElementById('cancelEditBtn').classList.add('hidden');
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
        
        this.loadTasks();
    }

    setPriorityFilter(priority) {
        this.currentPriorityFilter = priority;
        this.loadTasks();
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        
        document.getElementById('totalTasks').textContent = `Total: ${total}`;
        document.getElementById('completedTasks').textContent = `Completed: ${completed}`;
    }

    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        
        if (this.tasks.length === 0) {
            tasksList.innerHTML = `
                <div class="no-tasks">
                    <h3>No tasks yet</h3>
                    <p>Create your first task to get started!</p>
                </div>
            `;
            this.updateAnalytics();
            return;
        }

        tasksList.innerHTML = this.tasks.map(task => {
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const isOverdue = dueDate && dueDate < new Date() && !task.completed;
            
            return `
                <div class="task-item ${task.completed ? 'completed' : ''} ${task.priority}-priority" 
                     data-task-id="${task._id}">
                    <div class="task-header">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        <span class="task-priority priority-${task.priority}">
                            ${task.priority === 'high' ? '🚨' : task.priority === 'medium' ? '🔄' : '📌'} ${task.priority}
                        </span>
                    </div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    <div class="task-meta">
                        <div class="task-dates">
                            ${dueDate ? `
                                <span class="due-date ${isOverdue ? 'overdue' : ''}">
                                    📅 ${dueDate.toLocaleDateString()}
                                    ${isOverdue ? ' (Overdue)' : ''}
                                </span>
                            ` : ''}
                            <span class="created-date">
                                Created: ${new Date(task.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div class="task-actions">
                            <button class="btn-action complete-btn">
                                ${task.completed ? '↩️ Mark Incomplete' : '✅ Mark Complete'}
                            </button>
                            <button class="btn-action edit-btn">
                                ✏️ Edit
                            </button>
                            <button class="btn-action delete-btn">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.updateAnalytics();
    }

    updateAnalytics() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        document.getElementById('totalTasksStat').textContent = total;
        document.getElementById('completedTasksStat').textContent = completed;
        document.getElementById('progressStat').textContent = `${progress}%`;
        document.getElementById('progressText').textContent = `${progress}%`;
        
        const circle = document.querySelector('.progress-ring-circle');
        if (circle) {
            const radius = 50;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (progress / 100) * circumference;
            
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = offset;
        }
    }

    showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-width: 300px;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    animation: slideIn 0.3s ease;
                }
                .notification.success { background: #10b981; }
                .notification.error { background: #ef4444; }
                .notification.info { background: #3b82f6; }
                .notification button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    margin-left: 15px;
                    padding: 0 5px;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize tasks manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tasksManager = new TasksManager();
});