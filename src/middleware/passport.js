// config/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

passport.use(
    new LocalStrategy({usernameField: 'email'}, async (email, password, done) => {
        try {
            // 1. Find user by email
            const user = await prisma.user.findUnique({where: {email}});
            if (!user) {
                return done(null, false, {message: 'Incorrect email.'});
            }
            // 2. Compare password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return done(null, false, {message: 'Invalid credentials.'});
            }
            // 3. Return user if okay
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

// For session support, define serialize/deserialize:
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({where: {id}});
        done(null, user);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;