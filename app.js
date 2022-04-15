const express = require('express');
const bcrypt = require('bcrypt')
const path = require('path')
const body_parser = require('body-parser')
const {body, validationResult} = require('express-validator');
const {send_text_email, send_smtp_code, send_smtp_absence} = require('./smtp');
const {get_teacher_email, get_all_teachers, add_user, in_database, get_user, delete_user, verify_user, in_database_name, is_verified} = require('./CRUDfunctions');
const bodyParser = require('body-parser');
const session = require('express-session')
const cookieParser = require('cookie-parser')
const flash = require('connect-flash')
const passport = require('passport')
const initialise_passport = require('./passport-config')
const admincreds_model = require('./models/admincreds');
const { initialize } = require('passport');
const {encrypt, decrypt} = require('./encryption')
require("dotenv").config()


app = express();


initialise_passport(passport)

app.use(express.json())
const urlencodedParser = body_parser.urlencoded({ extended: false })
app.use(express.urlencoded({ extended: false }))
app.use(bodyParser.urlencoded({ extended: false }))
// app.use('/api', api)
app.use(cookieParser(process.env.SESSION_SECRET))
app.use(session({
    secret: process.env.SESSION_SECRET, // session key encrypts information
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false
}))

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


app.set('view engine', 'ejs');
app.use("/styles", express.static(__dirname + "/styles"));


app.get('/', (req, res) => {
    res.render('index.ejs')
})


// need to sanitise and validate data
    // sanitising in this context is 'cleaning up' the data (e.g. removing white spaces) and conforming to certain rules (e.g. making it lowercase)
app.post('/', async (req, res) => {

        // check if the teacher inputted exists
        var teacher_exists = await in_database_name(req.body['teacher-input'])

        if (!teacher_exists) { // teacher doesn't exist

            req.session.message = {
                type: 'danger',
                intro: 'Invalid Teacher',
                message: `${req.body['teacher-input']} is not in the database`
            }

            req.flash(req.session.message)
            return res.redirect('/')

        } else {

            var verif_result = await is_verified(req.body['user-email-input']) // could be unverified but in the database (hasn't typed the code in)
            var exists_result = await in_database(req.body['user-email-input']) // could not be in the database

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
            teacher_email = await get_teacher_email(req.body['teacher-input'])
    
            console.log(`sending email to ${teacher_email}`)
            // send_text_email('Music Lesson', 'persemusiclesson@gmail.com')

            // get user's name from the database:
            var user = await get_user(req.body['user-email-input'])
            console.log(user)
            send_smtp_absence(teacher_email, req.body['teacher-input'], req.body['day-input'], req.body['amount-missing'], user.signoff, user.name)
            console.log('email sent!')
    
            req.session.message = {
                type: 'success',
                intro: 'Email Sent!',
                message: ''
            }
    
            req.flash(req.session.message)
            return res.redirect('/')

        }

}

)



// app.post('/', urlencodedParser, [

//     body('teacher-input').trim()
//         .matches(/(Mrs|Miss|Ms|Mr|Dr) [A-Za-z-]+/).withMessage('Not a Valid Teacher Name Format')
//         .notEmpty().withMessage("Please provide a teacher name"),

//     body('day-input').trim()
//         .notEmpty().withMessage('Please include a date input'),

//     body('amount-missing').trim()
//         .notEmpty().withMessage('Please provide the amount being missed')

// ], (req, res) => {

//     const errors_obj = validationResult(req)
//     if (!errors_obj.isEmpty()) {

//         // initially assume no errors
//         var teacherInputError = false;
//         var dayInputError = false;
//         var amountInputError = false;

//         // look to see which fields had errors --> set these variables to true
//         for (let i of errors_obj['errors']) {

//             switch (i['param']) {

//                 case 'teacher-input':
//                     const teacherInputError = true;

//                 case 'day-input':
//                     const dayInputError = true;

//                 case 'amount-missing':
//                     const amountInputError = true;
//             }
//         }

//         console.log(errors_obj)

//         const error_results = {
//             teacherInputError: teacherInputError,
//             dayInputError: dayInputError,
//             amountInputError: amountInputError
//         }

//         // ! use AJAX
//         res.render('index.ejs', { errors: error_results })

//     } else {
//         // CONTINUE with program...



//         teacher_email = get_teacher(req.body['teacher-input'])
//         console.log(teacher_email)

//         console.log('sending email...')
//         send_text_email('from website', 'persemusiclesson@gmail.com')
//         console.log('email sent!')

//     }

// })


// !use middleware to check if a user is logged in and has access to the webpage

app.get('/admin-login', (req, res) => {
    res.render('admin_login.ejs')
})


// middleware to handle redirects
// TODO fix error where it always redirects to the failure url
app.post('/admin-login', passport.authenticate('local', {
    successRedirect: '/admin-page',
    failureRedirect: '/admin-login'
}))


app.get('/admin-page', (req, res) => {
    res.render('admin.ejs')
})


app.post('/modal-receive/code', async(req, res) => {

    console.log('server received')
    console.log(req.body)

    var result = await in_database(req.body.form['email-input'])
    if (result === true) { // email already in the database --> so create a brand new document
        console.log('exists');
        await delete_user(req.body.form['email-input'])
        console.log('deleting old...');
        await add_user(req.body.form['email-input'], req.body.form['name-input'], req.body.form['signoff-input'], req.body['reg_code'])
        console.log('making new...');
    } else {
        await add_user(req.body.form['email-input'], req.body.form['name-input'], req.body.form['signoff-input'], req.body['reg_code'])
    }

    send_smtp_code(req.body.form['email-input'], req.body['reg_code'])
    // send_text_email(`Your regestration code is: ${req.body['reg_code']}`, req.body.form['email-input'])

})




// app.post('/modal-receive/code', async(req, res) => {

//     console.log('server received')
//     console.log(req.body)

//     in_database(req.body.form['email-input'])
//         .then(result => {
//             if (result === true) { // email already in the database --> so create a brand new document
//                 console.log('exists');
//                 await delete_user(req.body.form['email-input'])
//                 console.log('deleting old...');
//                 await add_user(req.body.form['email-input'], req.body.form['name-input'], req.body.form['signoff-input'], req.body['reg_code'])
//                 console.log('making new...');
//             }

//             await add_user(req.body.form['email-input'], req.body.form['name-input'], req.body.form['signoff-input'], req.body['reg_code'])

//         })

app.post('/modal-receive/submit', (req, res) => {

    console.log(req.body)
    var user = get_user(req.body['email-input'])
        .then(result => {
            console.log(result.code_answer)
            console.log(req.body['code-input'])
            if (result.code_answer == req.body['code-input']) {

                console.log('Code is correct!')
                // verify user:
                verify_user(req.body['email-input'])

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


    // ! when they sign up, set verified to false and add the code to the database so it can be queried when comparing the inputted code --> then make verified true


    // add to database
        // only if it doesn't already exist
    // send success / error flash message


app.post('/modal-receive/del-stored', async(req, res) => {

    var result = await delete_user(req.body['email-input'])
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





const PORT = process.env.PORT || 5000 // in production it will by an environment variable
app.listen(PORT, () => console.log(`live on port ${PORT} --> localhost:${PORT}`))


    //  TODO ==> send errors to ejs and display errors on the page (is-invalid bootstrap class)

// ! make banner
// ! fix radio buttons on smaller screens
// ! use worker and storage apis to logout admin user after innactivity on the admin page (yet to be built)
    // * https://medium.com/tinyso/how-to-detect-inactive-user-to-auto-logout-by-using-idle-timeout-in-javascript-react-angular-and-b6279663acf2
    // * https://www.youtube.com/watch?v=rVyTjFofok0&ab_channel=iEatWebsites

// ! use local storage to prevent spamming emails on the website
// ! electron app version which communicates with this server over HTTP with fetch api
// ! code admin route

// TODO https://stackoverflow.com/questions/61591519/mongoose-updates-increment-a-counter-and-reset-to-0-on-a-new-date
    // 10 emails per day limit for example
        // prevent flooding
    // increment a field in usercreds_model every time an email is sent
    // but before sending an email check if its not over 10
    // reset the field to 0 at the end of the day (on new date)
    // use worker api to run in the background and keep checking the date

    
// ? Learnt Points

    // postman
    // status codes helping with debugging
    // responsive design --> user experience
    // mainly on one page --> easy access, everything in one place, simplicity
    // GDPR -esque can remove signed up email
    // used API routes throughout development to aid the process
    // encrypted database data and encryption key in .env file --> safer a if .env is compromised the database security still holds

// * Notes

    // dotenv is a dev dependency --> not used in production
    