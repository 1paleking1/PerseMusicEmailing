const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const {encrypt, decrypt} = require('./encryption')
require("dotenv").config()


// router import removed
const teacher_model = require('./models/teacher');
const smtpcreds_model = require('./models/admincreds');
const usercreds_model = require('./models/usercreds');
const send_text_email = require('./smtp');



app = express()
app.use(express.json())
app.use(express.urlencoded({extended:false}));


const dbURI = process.env.DBURI

console.log('attempting to connect')

const PORT = process.env.PORT || 5000

mongoose.connect(dbURI)
  .then((result) => console.log('connected to Database'))
  .then((result) => {
      app.listen(PORT, () => console.log(`live on port ${PORT} --> localhost:${PORT}`))
  })
  .catch((err) => console.log(err))




app.use(api_logger)

function api_logger(req, res, next) {

    var d = new Date();
    var time_now = d.toLocaleTimeString();
    console.log(`API Log --> Request made to ${req.originalUrl} at ${time_now}`)
    next();

}


// ! CRUD API routes

// * Create (add teacher)
app.post('/add-teacher', (req, res) => {

    var encryption_obj = encrypt(req.body.email)
    console.log(encryption_obj);
    const teacher = new teacher_model({
        name: req.body.name,
        email: encryption_obj.email,
        subject: req.body.subject,
        iv: encryption_obj.iv
    })

    // 201 status code for successful resource creation
    teacher.save()
        .then((result) => res.status(201).json({msg: 'teacher successfully added to database'}))
        .catch((err) => {
            console.log(err)
            res.status(400).json({msg: 'Failed to add teacher', reason: "doesn't conform to validation"})
        })
        
})


// * Read (get teacher)
app.get('/get-teacher/:name', (req, res) => {
    
    teacher_model.find({'name': req.params.name})
        .then(result => {

            if (result.length != 0) {
                res.status(200).json(result)
            } else {
                res.status(404).json({msg: `FAILED ${req.params.name} not found`})
            }

        })

        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })

})


// * Read (get all teachers)
app.get('/get-all-teachers', (req, res) => {
    
    teacher_model.find()
        .then(result => res.status(200).json(result))
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })

})


// * Update (change a teacher document)
app.put('/update-teacher/:name', async (req, res) => {

    teacher_model.updateOne({'name': req.params.name}, {
        'name': req.body.name,
        'email': req.body.email,
        'subject': req.body.subject
    }, { runValidators: true })

        .then((result) => {
            console.log(result)
            if (result.matchedCount) {
                // update successful
                res.status(201).json({msg: `${req.params.name} document info succsfully updated`})
                console.log(result)

            } else {
                // couldn't find the teacher
                res.status(404).json({msg: `FAILED ${req.params.name} document not found`})
            }
        })

        // validator trips (and other server issues) happen in the .catch()
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })
    
})


// * Delete (delete teacher document)
app.delete('/delete-teacher/:name', (req, res) => {

    teacher_model.deleteOne({'name': req.params.name})

        .then((result) => {

            if (result.deletedCount) { // if something was deleted
                res.status(200).json({msg: `document for ${req.params.name} successfully deleted`})
            } else {
                res.status(404).json({msg: `FAILURE ${req.params.name} document not found`})
            }
        })

        .catch(err => {
            console.log(err)
            res.status(500).send(err)
        })
})


// * add smtp gmail login credentials (hashed pwd) to the database
// * the post request body takes an email address and password
app.post('/add-admin-creds', async (req, res) => {

    try {

        const salt = await bcrypt.genSalt()
        const hashedpwd = await bcrypt.hash(req.body.password, salt)

        const admin_creds = new admincreds_model({
            username: req.body.username,
            password: req.body.password
        })
        
        admin_creds.save()
            .then(() => {
                return res.status(201).json({msg: 'Successfully added smtp gmail credentials to the database'})
            })
            .catch(() => {
                return res.status(400).send(err)
            })
        
    } catch {
        res.status(500).json({msg: 'Internal server error'})
    }

})


// * update smtp gmail login credentials (hashed pwd) to the database --> TODO change updates to just update some fields
app.put('/update-smtp-creds', async (req, res) => {
    
    try {

        var salt = await bcrypt.genSalt()
        var hashedKey = await bcrypt.hash(req.body.api_key, salt)

    } catch {
        res.status(500).send('Error in hashing smtp credentials')
    }

    smtpcreds_model.updateOne({'email': req.body.oldemail}, {

        email: req.body.email,
        api_key: hashedKey

    }, { runValidators: true})

        .then((result) => {
            console.log(result)
            if (result.matchedCount) { // found a match
                // update successful
                res.status(201).json({msg: `${req.body.email} smtp gmail cred info succsfully updated`})
                console.log(result)

            } else {
                // couldn't find the teacher
                res.status(404).json({msg: `FAILED ${req.body.email} smtp gmail cred document not found`})
            }
        })

        // validator trips (and other server issues) happen in the .catch()
        .catch((err) => {
            console.log(err)
            res.status(500).send(err)
        })

})


app.post('/send-teacher-email', async (req, res) => {

    smtpcreds_result = await smtpcreds_model.findOne()
    console.log(smtpcreds_result)
    try {
        if (await bcrypt.compare(req.body.api_key, smtpcreds_result.api_key)) {
            // creds match database creds
            teacher_result = await teacher_model.find({'name': req.body.teachername})

            if (teacher_result.length != 0) {  // teacher found

                console.log('attempting to send...')
                // send email
                await send_text_email({
                    api_key: req.body.api_key,
                    msg: 'test text again',
                    to: 'persemusiclesson@gmail.com'

                })

                res.status(200).json({ msg: `Email successfully sent to ${teacher_result[0].name}` })
    

            } else {
                res.status(404).json({ msg: `${req.body.teachername} not found` })
            }

        } else {
            res.status(400).json({ msg: 'Invalid API key' })
        }
    } catch (err) {
        res.status(500).send(err)
    }

})
