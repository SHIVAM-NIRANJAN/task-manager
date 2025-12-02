// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme FIRST
    initTheme();
    
    // Initialize auth manager
    window.authManager = new AuthManager();
    
    // Initialize tasks manager
    window.tasksManager = new TasksManager();
});

// Theme functionality
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    
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
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    themeToggle.title = `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`;
}
