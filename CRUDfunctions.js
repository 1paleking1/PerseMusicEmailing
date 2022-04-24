const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const teacher_model = require('./models/teacher');
const smtpcreds_model = require('./models/smtpcreds');
const usercreds_model = require('./models/usercreds');
const admincreds_model = require('./models/admincreds')
const usercreds = require('./models/usercreds');
const e = require('connect-flash');
const {decrypt, encrypt} = require('./encryption')
require("dotenv").config()


function db_connect() {

    const dbURI = process.env.DBURI

    console.log('attempting to connect')
    
    mongoose.connect(dbURI)
        .then(console.log('connected to database'))
        .catch(err => console.log(err))

}

// db_connect()

// ----------------------------------------------------------------- //

async function get_teacher_email(teachername) {

    try {
        var val = await teacher_model.find({'name': teachername})
        console.log(val);
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


async function add_teacher(teachername, email, subject) {
    var encryption_obj = encrypt(email)
    console.log(encryption_obj);
    const teacher = new teacher_model({
        name: teachername,
        email: encryption_obj.email,
        subject: subject,
        iv: encryption_obj.iv
    })

    // 201 status code for successful resource creation
    try {
        res = await teacher.save()
        console.log({msg: "Teacher successfuly added"});
    } catch (e){
        console.log(e);
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


async function add_admin(username, password) {

    try {

        const salt = await bcrypt.genSalt()
        const hashedpwd = await bcrypt.hash(password, salt)

        const admin_creds = new admincreds_model({
            username: username,
            password: hashedpwd
        })

        admin_creds.save()
            .then(() => {
                console.log('Admin credentials saved successfully');
            })
            .catch(() => {
                console.log('Error in saving Admin Credentials');
            })


    } catch {
        console.log('Internal Server error in hashing and saving admin credentials');
    }

}

async function delete_user(email) {

    var val = await usercreds_model.deleteOne({'email': email})
    return val

}

// ----------------------------------------------------------------- //


module.exports = {
    get_teacher_email,
    get_all_teachers,
    add_user,
    in_database,
    in_database_name,
    get_user,
    get_admin,
    delete_user,
    verify_user,
    is_verified,
    db_connect
}

// add_teacher(
//     'Mrs Johnson',
//     '1paleking1@gmail.com',
//     'Physics'
// )

// add_teacher(
//     'Dr Test',
//     'skkaranth1@@gmail.com',
//     'Biology'
// )

// get_teacher_email('Mr Q')
//     .then(res => console.log(res))

// get_teacher_email('Mr Q')
//     .then(res => console.log(res))

// add_admin('testin123', 'TESTPASS123')

// get_admin('testin123')
//     .then(res => console.log(res))

// ! validate email whithin the function so it doesn't have to be in the schema when it's already encrypted