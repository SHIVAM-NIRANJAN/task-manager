// server.js - Complete version with all routes
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors({
    origin: ['https://task-manager-vjnd.onrender.com', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Task Schema
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'], 
        default: 'medium' 
    },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth Middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ 
                message: existingUser.email === email ? 
                    'Email already registered' : 
                    'Username already taken' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });
        
        await user.save();
        
        // Create token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Create token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email
        }
    });
});

// ==================== TASK ROUTES ====================

// Get all tasks with filters
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { completed, priority, sort = '-createdAt' } = req.query;
        
        let query = { userId: req.user._id };
        
        if (completed !== undefined) {
            query.completed = completed === 'true';
        }
        
        if (priority) {
            query.priority = priority;
        }
        
        const tasks = await Task.find(query)
            .sort(sort)
            .select('-__v');
        
        res.json(tasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
});

// Get single task
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            userId: req.user._id
        });
        
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        res.json(task);
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ message: 'Error fetching task' });
    }
});

// Create task
app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, description, priority, dueDate } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Task title is required' });
        }
        
        const task = new Task({
            title: title.trim(),
            description: description?.trim() || '',
            priority: priority || 'medium',
            dueDate: dueDate ? new Date(dueDate) : undefined,
            userId: req.user._id
        });
        
        await task.save();
        
        res.status(201).json(task);
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ message: 'Error creating task' });
    }
});

// Update task (full update)
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { title, description, priority, dueDate } = req.body;
        
        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Task title is required' });
        }
        
        const task = await Task.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user._id
            },
            {
                title: title.trim(),
                description: description?.trim() || '',
                priority: priority || 'medium',
                dueDate: dueDate ? new Date(dueDate) : null
            },
            { new: true }
        );
        
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        res.json(task);
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ message: 'Error updating task' });
    }
});

// Update task completion (partial update)
app.patch('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { completed } = req.body;
        
        if (typeof completed !== 'boolean') {
            return res.status(400).json({ message: 'Completed status is required' });
        }
        
        const updateData = {
            completed,
            completedAt: completed ? new Date() : null
        };
        
        const task = await Task.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user._id
            },
            updateData,
            { new: true }
        );
        
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        res.json(task);
    } catch (error) {
        console.error('Patch task error:', error);
        res.status(500).json({ message: 'Error updating task' });
    }
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });
        
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ message: 'Error deleting task' });
    }
});

// Handle client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
});