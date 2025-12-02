class TasksManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentPriorityFilter = '';
        this.editingTaskId = null;
        this.initEventListeners();
    }

    // In TasksManager constructor, replace the current initEventListeners with:
initEventListeners() {
    document.getElementById('taskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (this.editingTaskId) {
            this.updateTask();
        } else {
            this.createTask();
        }
    });

    // Use event delegation for dynamic buttons
    document.getElementById('tasksList').addEventListener('click', (e) => {
        const target = e.target;
        
        // Complete/Incomplete button
        if (target.classList.contains('complete-btn') || target.closest('.complete-btn')) {
            const taskItem = target.closest('.task-item');
            const taskId = taskItem?.dataset.taskId;
            const completed = taskItem?.classList.contains('completed');
            if (taskId) this.toggleTaskCompletion(taskId, completed);
        }
        
        // Edit button
        if (target.classList.contains('edit-btn') || target.closest('.edit-btn')) {
            const taskItem = target.closest('.task-item');
            const taskId = taskItem?.dataset.taskId;
            if (taskId) this.editTask(taskId);
        }
        
        // Delete button
        if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
            const taskItem = target.closest('.task-item');
            const taskId = taskItem?.dataset.taskId;
            if (taskId) this.deleteTask(taskId);
        }
    });

    // Rest of your existing event listeners...
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            this.setFilter(e.target.dataset.filter);
        });
    });

    document.getElementById('priorityFilter').addEventListener('change', (e) => {
        this.setPriorityFilter(e.target.value);
    });

    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        this.cancelEdit();
    });

    document.getElementById('updateTaskBtn').addEventListener('click', () => {
        this.updateTask();
    });
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
                this.tasks = await response.json();
                this.renderTasks();
            } else {
                throw new Error('Failed to load tasks');
            }
        } catch (error) {
            this.showNotification('Error loading tasks: ' + error.message, 'error');
        }
    }

    async createTask() {
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    title,
                    description,
                    priority,
                    dueDate: dueDate || undefined
                })
            });

            if (response.ok) {
                this.showNotification('Task created successfully! 🎉', 'success');
                document.getElementById('taskForm').reset();
                this.loadTasks();
            } else {
                throw new Error('Failed to create task');
            }
        } catch (error) {
            this.showNotification('Error creating task: ' + error.message, 'error');
        }
    }

    async updateTask() {
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;

        try {
            const response = await fetch(`/api/tasks/${this.editingTaskId}`, {
                method: 'PUT',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    title,
                    description,
                    priority,
                    dueDate: dueDate || undefined
                })
            });

            if (response.ok) {
                this.showNotification('Task updated successfully! 🎉', 'success');
                this.cancelEdit();
                this.loadTasks();
            } else {
                throw new Error('Failed to update task');
            }
        } catch (error) {
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
            } else {
                throw new Error('Failed to delete task');
            }
        } catch (error) {
            this.showNotification('Error deleting task: ' + error.message, 'error');
        }
    }

    async toggleTaskCompletion(taskId, currentlyCompleted) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({ completed: !currentlyCompleted })
            });

            if (response.ok) {
                const action = !currentlyCompleted ? 'completed' : 'marked incomplete';
                this.showNotification(`Task ${action} successfully! 🎉`, 'success');
                this.loadTasks();
            } else {
                throw new Error('Failed to update task');
            }
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    async editTask(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            headers: window.authManager.getAuthHeaders()
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
        }

        if (response.ok) {
            const task = await response.json();
            this.populateEditForm(task);
        } else {
            // Handle specific HTTP errors
            if (response.status === 404) {
                throw new Error('Task not found');
            } else if (response.status === 401) {
                throw new Error('Please log in again');
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        }
    } catch (error) {
        this.showNotification('Error loading task: ' + error.message, 'error');
        console.error('Edit task error:', error);
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
        
        this.showNotification('Editing task: ' + task.title, 'info');
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

    tasksList.innerHTML = this.tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''} ${task.priority}-priority" data-task-id="${task._id}">
            <div class="task-header">
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                <span class="task-priority priority-${task.priority}">
                    ${task.priority === 'high' ? '🚨' : task.priority === 'medium' ? '🔄' : '📌'} ${task.priority}
                </span>
            </div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                <div class="task-dates">
                    ${task.dueDate ? `
                        <span class="due-date ${new Date(task.dueDate) < new Date() && !task.completed ? 'overdue' : ''}">
                            📅 ${new Date(task.dueDate).toLocaleDateString()}
                        </span>
                    ` : ''}
                    <span class="created-date">
                        Created: ${new Date(task.createdAt || new Date()).toLocaleDateString()}
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
    `).join('');

    this.updateAnalytics();
}

    updateAnalytics() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        
        document.getElementById('totalTasksStat').textContent = total;
        document.getElementById('completedTasksStat').textContent = completed;
        document.getElementById('progressStat').textContent = Math.round(progress) + '%';
        document.getElementById('progressText').textContent = Math.round(progress) + '%';
        
        const circle = document.querySelector('.progress-ring-circle');
        const radius = 50;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (progress / 100) * circumference;
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;
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
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
    }

    escapeHtml(unsafe) {
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}