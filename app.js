const express = require('express');
const bcrypt = require('bcrypt')
const path = require('path')
const body_parser = require('body-parser')
const {body, validationResult} = require('express-validator');
const smtp = require('./smtp');
const crud = require('./CRUDfunctions')
const bodyParser = require('body-parser');
const session = require('express-session')
const MongoDBSession = require('connect-mongodb-session')(session)
//const store = new session.MemoryStore() // storing session data in server memory
const cookieParser = require('cookie-parser')
const flash = require('connect-flash')
const passport = require('passport')
const initialise_passport = require('./passport-config')
const admincreds_model = require('./models/admincreds');
const { initialize } = require('passport');
const {encrypt, decrypt} = require('./encryption')
require("dotenv").config()


app = express();
crud.db_connect()

//------------------------- Middleware ------------------------- //

// create session store in database:
const store = new MongoDBSession({
    uri: process.env.DBURI,
    collection: 'Sessions'
})


// initialise_passport(passport)

app.use(express.json())
const urlencodedParser = body_parser.urlencoded({ extended: false })
app.use(express.urlencoded({ extended: false }))
app.use(bodyParser.urlencoded({ extended: false }))
// app.use('/api', api)
app.use(cookieParser(process.env.SESSION_SECRET))

// sessions used for logging in admin users and flash messages
app.use(session({
    secret: process.env.SESSION_SECRET, // session key encrypts information
    cookie: { maxAge: 60000 }, // cookie expiration time --> after 1 min of being off the admin page they have to re-login
    resave: false,
    saveUninitialized: false, // so you don't generate a new session id for every request
    store: store
}))
// session is just an object of data

app.use(passport.initialize())
app.use(passport.session())
app.use(flash())

app.use((req, res, next) => {
    res.locals.message = req.session.message // lets the variable be used across views
    delete req.session.message // so everytime the page is reloaded the session is not stored
    next()
})


app.use(app_logger)

function app_logger(req, res, next) {

    var d = new Date();
    var time_now = d.toLocaleTimeString();
    console.log(`Website Log --> Request made to ${req.originalUrl} at ${time_now}`)
    next();

}

// prevents access to the admin page without logging in
function validate_cookie(req, res, next) {
    if (req.session.isAuth) {
        next()
    } else {
        res.redirect('/admin-login')
    }
}

// If an admin is already logged in, they can bypass the login page
function logged_in(req, res, next) {
    if (req.session.isAuth) {
        res.redirect('/admin-page')
    } else {
        next()
    }
}

app.set('view engine', 'ejs');
app.use("/styles", express.static(__dirname + "/styles"));

//-------------------------------------------------------------- //

// App Routes:


app.get('/', (req, res) => {
    res.render('index.ejs')
})


// need to sanitise and validate data
    // sanitising in this context is 'cleaning up' the data (e.g. removing white spaces) and conforming to certain rules (e.g. making it lowercase)
app.post('/', async (req, res) => {

        // check if the teacher inputted exists
        var teacher_exists = await crud.in_database_name(req.body['teacher-input'])

        if (!teacher_exists) { // teacher doesn't exist

            req.session.message = {
                type: 'danger',
                intro: 'Invalid Teacher',
                message: `${req.body['teacher-input']} is not in the database`
            }

            req.flash(req.session.message)
            return res.redirect('/')

        } else {

            var verif_result = await crud.is_verified(req.body['user-email-input']) // could be unverified but in the database (hasn't typed the code in)
            var exists_result = await crud.in_database(req.body['user-email-input']) // could not be in the database

            if (((verif_result == null) && (exists_result == false)) || (verif_result == false)) { // user not verified or doesn't exist (hasn't signed up)

                req.session.message = {
                    type: 'danger',
                    intro: 'Unverified User',
                    message: 'Please register this email with the "Sign Up" button'
                }
    
                req.flash(req.session.message)
                return res.redirect('/')

            }

            console.log('teacher found')
            teacher_email = await crud.get_teacher_email(req.body['teacher-input'])

            console.log(`sending email to ${teacher_email}`)
            // send_text_email('Music Lesson', 'persemusiclesson@gmail.com')

            // get user's name from the database:
            var user = await crud.get_user(req.body['user-email-input'])
            console.log(user)
            smtp.send_smtp_absence(teacher_email, req.body['teacher-input'], req.body['day-input'], req.body['amount-missing'], user.signoff, user.name)
            console.log('email sent!')
    
            req.session.message = {
                type: 'success',
                intro: 'Email Sent!',
                message: ''
            }
    
            req.flash(req.session.message)
            return res.redirect('/')

        }

})


app.get('/admin-login', logged_in, (req, res) => {
    res.render('admin_login.ejs')
})


app.post('/admin-login', async (req, res) => {

    admin_creds = await crud.get_admin(req.body['admin-username']) // fetch specified creds from database

    if (admin_creds == null) {
        // creds not found
        req.session.message = {
            type: 'danger',
            intro: 'Error: ',
            message: `${req.body['admin-username']} not found`
        }
        req.flash(req.session.message)
        return res.redirect('/admin-login')
    }

    try {
        if (await bcrypt.compare(req.body['admin-password'], admin_creds.password)) { // check if the hashes match
            // success
            req.session.isAuth = true // create cookie
            return res.redirect('/admin-page')

        } else {
            // Incorrect password
            req.session.message = {
                type: 'danger',
                intro: 'Error: ',
                message: 'Incorrect Password'
            }
            req.flash(req.session.message)
            return res.redirect('/admin-login')
        }

    } catch {
        // server error
        res.status(500).send()
    }
})


app.get('/admin-page', validate_cookie, (req, res) => {
    res.render('admin.ejs')
})

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err
        res.redirect('/')
    })
})


app.post('/modal-receive/code', async(req, res) => {

    console.log('server received')
    console.log(req.body)

    var result = await crud.in_database(req.body.form['email-input'])
    if (result === true) { // email already in the database --> so create a brand new document
        console.log('exists');
        await crud.delete_user(req.body.form['email-input'])
        console.log('deleting old...');
        await crud.add_user(req.body.form['email-input'], req.body.form['name-input'], req.body.form['signoff-input'], req.body['reg_code'])
        console.log('making new...');
    } else {
        await crud.add_user(req.body.form['email-input'], req.body.form['name-input'], req.body.form['signoff-input'], req.body['reg_code'])
    }

    smtp.send_smtp_code(req.body.form['email-input'], req.body['reg_code'])
    // smtp.send_text_email(`Your regestration code is: ${req.body['reg_code']}`, req.body.form['email-input'])

})


app.post('/modal-receive/submit', (req, res) => {

    console.log(req.body)
    var user = crud.get_user(req.body['email-input'])
        .then(result => {
            console.log(result.code_answer)
            console.log(req.body['code-input'])
            if (result.code_answer == req.body['code-input']) {

                console.log('Code is correct!')
                // verify user:
                crud.verify_user(req.body['email-input'])

                // send success flash message:
                req.session.message = {
                    type: 'success',
                    intro: 'Registration Successful',
                    message: 'Thank you for registering'
                }

                req.flash(req.session.message)
                res.redirect('/')

            } else {
                console.log('Incorrect code')

                // send error flash message
                req.session.message = {
                    type: 'danger',
                    intro: 'Invalid Code',
                    message: 'Please enter the code sent by email'
                }
                res.redirect('/')
            }
        })

})


    // add to database
        // only if it doesn't already exist
    // send success or error flash message

app.post('/modal-receive/del-stored', async(req, res) => {

    var result = await crud.delete_user(req.body['email-input'])
    if (result.deletedCount != 0) {

        req.session.message = {
            type: 'success',
            intro: 'Success',
            message: 'Your data has been deleted'
        }

        req.flash(req.session.message)
        res.redirect('/')

    } else {
        req.session.message = {
            type: 'danger',
            intro: 'Failed',
            message: `No stored data for ${req.body['email-input']}`
        }

        req.flash(req.session.message)
        res.redirect('/')
    }
    
})


// 404 Error page:
app.get('*', (req, res) => {
    res.status(404).render('404.ejs');
});



const PORT = process.env.PORT || 5000 // in production it will by an environment variable
app.listen(PORT, () => console.log(`live on port ${PORT} --> localhost:${PORT}`))