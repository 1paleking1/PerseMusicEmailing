const mongoose = require('mongoose');
const { decrypt } = require('../encryption');
const Schema = mongoose.Schema;


// ---------------------------------------------------------- //
function validate_teachername(name) {
    var re = /(Mrs|Miss|Ms|Mr|Dr) [A-Za-z-]+/;
    return re.test(name) // true if the regex matches name
}

function validate_email(email) {
    var decrypted_email = decrypt(email, this.iv)
    console.log(decrypted_email);
    var re = /[a-z]+@perse\.co\.uk/;
    return re.test(decrypted_email) // true if the regex matches name
}
// ---------------------------------------------------------- //

const teacherSchema = new Schema({

    name: {
        type: String,
        required: true,
        unique: true,
        dropDups: true,

        validate: {
            validator: validate_teachername,
            message: props => `${props.value} is an invalid teacher name`
        }
    },

    email: {
        type: String,
        required: true,
        unique: true,

        // validate: {
        //     validator: validate_email,
        //     message: props => `${props.value} is an invalid teacher email`

        // }
    },

    subject: {
        type: String,
        required: true
    },

    iv: {
        type: Buffer, // to take the iv Bytes
        required: true
    }
})

module.exports = mongoose.model("teacher_model", teacherSchema)