const mongoose = require('mongoose');
const Schema = mongoose.Schema;


// ---------------------------------------------------------- //

function validate_gmail(email) {
    var re = /[a-z]([1-9]?)+@gmail\.com/ // my specific constraints for what the service email can look like
    return re.test(email)
}

// ---------------------------------------------------------- //

const smtpcredSchema = new Schema({

    email: {
        type: String,
        required: true,

        validate: {
            validator: validate_gmail,
            message: props => `${props.value} is an invalid gmail for the smtp server`
        }
    },

    api_key: {
        type: String,
        required: true
    }
    
})

module.exports = mongoose.model("smtpcreds_model", smtpcredSchema)


