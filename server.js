require('dotenv').config(); // Ensure this is at the top
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io'); // Import socket.io module
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const User = require('./models/User'); // Adjust path as necessary
const bcrypt = require('bcrypt');
const Message = require('./models/Message');

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Initialize socket.io

// Socket.io connection
io.on('connection', socket => {
    console.log('New WebSocket connection');

    // Handle leaving the room
    socket.on('leaveRoom', () => {
        // Implement leaving the room logic here
        // For example:
        socket.leave(room); // room is the name of the current room
    });

    // Handle chat messages
    socket.on('chatMessage', async (message) => {
        // Save the message to MongoDB
        const newMessage = new Message({
            user: socket.username,
            room: room,
            message: message,
            createdAt: new Date()
        });
        await newMessage.save();

        // Broadcast the message to users in the same room
        io.to(room).emit('message', message);
    });

    // Handle typing indicator
    socket.on('typing', (isTyping) => {
        // Broadcast typing status to users in the same room
        socket.to(room).emit('typing', isTyping);
    });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    // Removed deprecated options
}).then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EJS for templating
app.set('view engine', 'ejs');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: 'labtestuzma', // Replace 'yourSecretKey' with a strong secret string
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));
app.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ username, password: hashedPassword });
        await user.save();

        // Redirect to login page or another page after successful signup
        res.redirect('/login');
    } catch (error) {
        // Handle errors (e.g., username already exists)
        res.render('signup', { messages: { error: 'Signup failed. Please try again.' } });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (user && await bcrypt.compare(password, user.password)) {
            // Passwords match
            // Here, set up the user session and redirect to another page
            req.session.userId = user._id; // Set up the session
            res.redirect('/dashboard'); // Redirect to the dashboard or home page
        } else {
            // Passwords don't match or user not found
            res.render('login', { messages: { error: 'Invalid credentials' } });
        }
    } catch (error) {
        // Handle errors
        console.error(error);
        res.status(500).send('Error logging in');
    }
});
// Define the list of available rooms
const availableRooms = ['devops', 'cloud computing', 'covid19', 'sports', 'nodeJS'];

// Update the GET route for the dashboard
app.get('/dashboard', (req, res) => {
    // Check if the user is logged in
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    // Render the dashboard page with the available rooms
    res.render('dashboard', { rooms: availableRooms });
});

// POST route to handle joining a room
app.post('/join-room', (req, res) => {
    const { room } = req.body;
    // Redirect the user to the selected room
    res.redirect(`/chat/${room}`);
});
// Handle logout route
app.get('/logout', (req, res) => {
    // Implement logout logic here (e.g., destroy session)
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            res.redirect('/login'); // Redirect to login page after logout
        }
    });
});
app.get('/login', (req, res) => {
    res.render('login', { messages: { error: null } });
});

app.get('/signup', (req, res) => {
    res.render('signup', { messages: { error: null } });
});
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
        // If the user is not logged in, redirect them to the login page
        return res.redirect('/login');
    }

    // If the user is logged in, render the dashboard
    res.render('dashboard');
    // Optionally, you can pass user data to the dashboard view
    // const user = await User.findById(req.session.userId);
    // res.render('dashboard', { user: user });
});

// Route to handle joining a specific room
app.get('/chat/:room', (req, res) => {
    const room = req.params.room;
    // Render the chat room page for the requested room
    res.render('chat', { room: room });
});

const chatRouter = require('./routes/chat'); // Adjust the path as necessary
app.use(chatRouter);

// Routes
app.use('/', authRoutes);
app.use('/chat', chatRoutes);





const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
