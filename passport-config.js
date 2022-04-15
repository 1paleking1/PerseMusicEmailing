const passport = require('passport')
const bcrypt = require('bcrypt')
const admincreds_model = require('./models/admincreds');
const { get_admin } = require('./CRUDfunctions')

// using the local Strategy for username and password auth 
const LocalStrategy = require('passport-local').Strategy

function initialise_passport(passport) {

    // function called to check if admin user exists
    // the parameters come form a form
    async function authenticateUser(username, password, done) {

        admincreds_result = await get_admin(username)

        if (admincreds_result == null) {
            // null called first as there is no server error
            return done(null, false, {msg: 'Admin username does not exist'})
        }

        try {
            
            if (await bcrypt.compare(password, admincreds_result.password)) {
                // success
                return done(null, admincreds_result)
            } else {
                return done(null, false, {msg: 'Password incorrect'})
            }
    
        } catch (err) {
            return done(err)
        }
    }

    passport.use(new LocalStrategy({}, authenticateUser))

    // serialising persists data into the session so it can be used to check if authorised
    passport.serializeUser((user, done) => {})
    // receive data from the session
    passport.deserializeUser((user, done) => {})

}

module.exports = initialise_passport