const mongoose = require('mongoose')
const Schema = mongoose.Schema

const admincredsSchema = new Schema({

    username: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },
    
})

module.exports = mongoose.model("admincreds_model", admincredsSchema)


// code my own version of 2FA??