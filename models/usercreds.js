const mongoose = require('mongoose')
const Schema = mongoose.Schema

const usercredSchema = new Schema({

    email: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    signoff: {
        type: String,
        required: true
    },

    verified: {
        type: Boolean,
        required: true,
        default: false
    },

    code_answer: {
        type: Number,
        required: true
    }
    
})

module.exports = mongoose.model("usercreds_model", usercredSchema)