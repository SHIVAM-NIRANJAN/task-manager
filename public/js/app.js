// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Initialize theme FIRST
    initTheme();
    
    // Initialize auth manager
    window.authManager = new AuthManager();
    
    // Initialize tasks manager
    window.tasksManager = new TasksManager();
    
    console.log('App initialized successfully');
});

// Theme functionality
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    
    if (!themeToggle) {
        console.error('Theme toggle button not found');
        return;
    }
    
    // Get theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply the saved theme immediately
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);
    
    // Add click event listener
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Apply new theme
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeButton(newTheme);
    });
}

function updateThemeButton(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        themeToggle.title = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`;
    }
}

// Debug function to test if buttons work
window.testButtons = function() {
    console.log('Testing buttons...');
    const taskItems = document.querySelectorAll('.task-item');
    console.log(`Found ${taskItems.length} tasks`);
    
    taskItems.forEach((item, index) => {
        const taskId = item.getAttribute('data-id');
        console.log(`Task ${index + 1}: ID = ${taskId}`);
        
        const completeBtn = item.querySelector('.complete-btn');
        const editBtn = item.querySelector('.edit-btn');
        const deleteBtn = item.querySelector('.delete-btn');
        
        console.log(`  Complete button: ${completeBtn ? 'Found' : 'Missing'}`);
        console.log(`  Edit button: ${editBtn ? 'Found' : 'Missing'}`);
        console.log(`  Delete button: ${deleteBtn ? 'Found' : 'Missing'}`);
    });
};