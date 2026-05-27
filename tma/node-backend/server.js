const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'node_taskflow_secret';

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;
if (!MONGO_URI) {
    console.error('Missing MongoDB connection string. Set MONGO_URI (or MONGO_URL) in .env');
    process.exit(1);
}

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));


// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Task Schema
const taskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO' },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    dueDate: Date,
    createdAt: { type: Date, default: Date.now },
});

const Task = mongoose.model('Task', taskSchema);

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// API Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        res.status(201).json({ token, user: { id: user._id, name, email } });
    } catch (err) {
        // Mongo duplicate key error (email already exists)
        if (err && err.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }

        console.error('Signup error:', err);
        return res.status(400).json({ message: 'Unable to sign up' });
    }
});


app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        res.json({ token, user: { id: user._id, name: user.name, email } });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
    const task = new Task({ ...req.body, userId: req.user.id });
    await task.save();
    res.status(201).json(task);
});

app.patch('/api/tasks/:id', authenticateToken, async (req, res) => {
    const allowed = ['title', 'description', 'status', 'priority', 'dueDate'];
    const updates = {};
    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) updates[key] = req.body[key];
    }

    const task = await Task.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        updates,
        { new: true }
    );

    if (!task) return res.status(404).json({ message: 'Task not found' });
    return res.json(task);
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    const result = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ message: 'Task not found' });
    return res.json({ success: true });
});


// Start Server
app.listen(PORT, () => {
    console.log(`Node.js/Express server running on port ${PORT}`);
});
