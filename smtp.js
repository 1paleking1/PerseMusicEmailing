require('dotenv').config();
const sgMail = require('@sendgrid/mail')
const nodemailer = require('nodemailer')


async function send_text_email(msg, to_address) {
    
    sendgrid_key = process.env.SENDGRID_API_KEY
    sgMail.setApiKey(sendgrid_key)
    sgMail.send({
        to: to_address,
        from: 'persemusiclesson@gmail.com',
        subject: 'Music Lesson',
        text: msg,
    })
        .then(response => console.log('success', response))
        .catch(err => console.log(err))

}

async function send_smtp_absence(to_address, teachername, lesson_day, how_much, sign_off, user_name) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'persemusiclesson@gmail.com',
            pass: process.env.EMAIL_PASS
        }
    })
    
    
    var TEXT = 
    `
    Dear ${teachername},

    Please may I be excused from ${how_much} of your lesson ${lesson_day} as I have a music lesson. Sorry for the inconvenience.

    ${sign_off},
    ${user_name}`

    let mailOptions = {
        from: 'persemusiclesson@gmail.com',
        to: to_address,
        subject: 'Music Lesson',
        text: TEXT
    }
    
    transporter.sendMail(mailOptions, (err, success) => {
        if(err) {
            console.log(err)
        } else {
            console.log('email sent successfully')
        }
    })

}


async function send_smtp_code(to_address, reg_code) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'persemusiclesson@gmail.com',
            pass: process.env.EMAIL_PASS
        }
    })
    
    var TEXT = `Your registration code is: ${reg_code}`

    let mailOptions = {
        from: 'persemusiclesson@gmail.com',
        to: to_address,
        subject: 'Music Lesson',
        text: TEXT
    }
    
    transporter.sendMail(mailOptions, (err, success) => {
        if(err) {
            console.log(err)
        } else {
            console.log('email sent successfully')
        }
    })

}


module.exports = {
    send_text_email,
    send_smtp_absence,
    send_smtp_code
}