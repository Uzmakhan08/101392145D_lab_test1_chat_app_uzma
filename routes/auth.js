const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const User = require('../models/User'); // Assuming you have a User model


// Middleware to parse request body
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Signup Route
router.post('/signup',
    // Validation and sanitization
    [
        body('username').isAlphanumeric().withMessage('Username must be alphanumeric'),
        body('firstname').isAlpha().withMessage('First name must contain only letters'),
        body('lastname').isAlpha().withMessage('Last name must contain only letters'),
        body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long'),
    ],
    async (req, res) => {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Extracting data from request
        const { username, firstname, lastname, password } = req.body;

        try {
            // Check if user already exists
            let user = await User.findOne({ username });
            if (user) {
                return res.status(400).json({ msg: 'User already exists' });
            }

            // Hashing the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Creating a new user
            user = new User({
                username,
                firstname,
                lastname,
                password: hashedPassword,
            });

            await user.save();

            res.status(201).send('User registered successfully');
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

// Login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Here you should create a session/token for the logged-in user
        // But for simplicity, we'll just return a success message
        res.send('Logged in successfully');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
