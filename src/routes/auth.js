// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const {PrismaClient, Role} = require('@prisma/client');
const router = express.Router();
const passport = require('passport');

const prisma = new PrismaClient();

// POST /auth/login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(400).json({error: info.message || 'Login failed'});
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.json({
                message: 'Logged in successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                }
            });
        });
    })(req, res, next);
});

// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const {email, password, role} = req.body;

        console.log('password');
        console.log(password);

        // (A) Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: {email}
        });
        if (existingUser) {
            return res.status(400).json({error: 'User already exists'});
        }

        // (B) Validate the role (must match our Prisma enum)
        // If the user doesn't specify a valid role, default to PARTICIPANT
        const validatedRole = Object.values(Role).includes(role) ? role : 'PARTICIPANT';

        // (C) Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // (D) Create the user in the database
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: validatedRole
            }
        });

        return res.json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (err) {
        console.error('Error registering user:', err);
        return res.status(500).json({error: 'Something went wrong'});
    }
});

// POST /auth/logout
router.post('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        // Optionally, you can destroy the session as well:
        req.session.destroy((err) => {
            if (err) {
                return next(err);
            }
            // Redirect or send a JSON response after logout.
            // For server-side form submissions, you might use:
            res.redirect('/');
            // Or if you're using AJAX/fetch, you might send:
            // res.json({ message: 'Logged out successfully' });
        });
    });
});

module.exports = router;