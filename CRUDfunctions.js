const mongoose = require('mongoose')
const teacher_model = require('./models/teacher');
const smtpcreds_model = require('./models/smtpcreds');
const usercreds_model = require('./models/usercreds');
const admincreds_model = require('./models/admincreds')
const usercreds = require('./models/usercreds');
const e = require('connect-flash');
const {decrypt, encrypt} = require('./encryption')
require("dotenv").config()


function connect() {

    const dbURI = process.env.DBURI

    console.log('attempting to connect')
    
    mongoose.connect(dbURI)
        .then(console.log('connected to database'))
        .catch(err => console.log(err))

}

connect()

// ----------------------------------------------------------------- //

async function get_teacher_email(teachername) {

    try {
        var val = await teacher_model.find({'name': teachername})
        if (val.length != 0) {
            return decrypt(val[0].email, val[0].iv)
        } else {
            return `FAILED: ${teachername} not found`
        }
    } catch (err) {
        console.log(err)
    }

}


function get_all_teachers(){

    teacher_model.find()
            .then(result => {
                return new Promise((resolve, reject) => {
                    if (resolve) {
                        return 1
                    }
                })
            })
            .catch((err) => {
                console.log(err)
                return err
            })

        }


function get_admin_creds(username) {

    usercreds_model.find({ // creds where is_admin is true and the entered username is in the db
        $or : [
            {name: username},
            {is_admin: true}
        ]
     })

        .then(result => {
            return result
        })

}


async function add_user(email, name, signoff, code_answer) {

    const user = new usercreds_model({
        email: email,
        name: name,
        signoff: signoff,
        verified: false,
        code_answer: code_answer
    })

    try {
        var result = await user.save()
        console.log('user created');
    } catch (err){
        console.log(err);
    }

}


async function verify_user(email) {
    doc = await usercreds_model.findOne({email: email})
    doc.verified = true
    await doc.save()
    console.log('user verified')
}


async function is_verified(email) {
    doc = await usercreds_model.findOne({email: email})
    try {
        
        if (doc.verified) {
            return true
        } else {
            return false
        }

    } catch (err) {
        if (err instanceof TypeError) {
            return null
        } else {
            console.log(err)
        }
    }
}


async function in_database(email) {
    var val = await usercreds_model.find({'email': email})
    if (val.length == 0) {
        return false
    } else {
        return true
    }

}

async function in_database_name(name) {
    var val = await teacher_model.find({'name': name})
    if (val.length == 0) {
        return false
    } else {
        return true
    }
}

async function get_user(email) {

    var val = await usercreds_model.findOne({'email': email})
    return val

}

async function get_admin(username) {

    var val = await admincreds_model.findOne({'username': username})
    return val

}

async function delete_user(email) {

    var val = await usercreds_model.deleteOne({'email': email})
    return val

}

// ----------------------------------------------------------------- //


exports.get_teacher_email = get_teacher_email
exports.get_all_teachers = get_all_teachers
exports.add_user = add_user
exports.in_database = in_database
exports.in_database_name = in_database_name
exports.get_user = get_user
exports.get_admin = get_admin
exports.delete_user = delete_user
exports.verify_user = verify_user
exports.is_verified = is_verified