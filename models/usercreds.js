const mongoose = require('mongoose')
const Schema = mongoose.Schema


function validate_email(email) {
    var re = /[a-z1-9]+@perse\.co\.uk/
    return re.test(email) // true if the regex matches name
}


const usercredSchema = new Schema({

    email: {
        type: String,
        required: true,
        validate: {
            validator: validate_email,
            message: props => `${props.value} is an invalid user email --> note it must be @perse.co.uk`
        }
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