// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme FIRST
    initTheme();
    
    // Initialize auth manager
    window.authManager = new AuthManager();
    
    // DO NOT initialize tasksManager here - it will be initialized after login
    // Only initialize if user is already logged in
    if (localStorage.getItem('token')) {
        initializeTasksManager();
    }
});

function initializeTasksManager() {
    // Check if tasksManager already exists
    if (window.tasksManager) {
        return;
    }
    
    // Initialize tasks manager
    window.tasksManager = new TasksManager();
    
    // Load tasks
    setTimeout(() => {
        if (window.tasksManager && window.tasksManager.loadTasks) {
            window.tasksManager.loadTasks();
        }
    }, 100);
}

// Theme functionality
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Get theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply the saved theme immediately
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
    
    // Add click event listener
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            // Apply new theme
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeButton(newTheme);
        });
    }
}

function updateThemeButton(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        themeToggle.title = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`;
    }
}

// Make initializeTasksManager globally available
window.initializeTasksManager = initializeTasksManager;