const mongoose = require('mongoose');
const { decrypt } = require('../encryption');
const Schema = mongoose.Schema;

/*  //! Notes
    
? Look into turning my sync schema validation to async operations by returning a promise

* Next time:
    * make wrapper functions based on the ones made in python
*/

// ---------------------------------------------------------- //
function validate_teachername(name) {
    var re = /(Mrs|Miss|Ms|Mr|Dr) [A-Za-z-]+/;
    return re.test(name) // true if the regex matches name
}

function validate_email(email) {
    var decrypted_email = decrypt(email)
    var re = /[a-z]+@perse\.co\.uk/;
    return re.test(decrypted_email) // true if the regex matches name
}
// ---------------------------------------------------------- //

const teacherSchema = new Schema({

    name: {
        type: String,
        required: true,

        validate: {
            validator: validate_teachername,
            message: props => `${props.value} is an invalid teacher name`
        }
    },

    email: {
        type: String,
        required: true,
        unique: true,

        validate: {
            validator: validate_email,
            message: props => `${props.value} is an invalid teacher email`

        }
    },

    subject: {
        type: String,
        required: true
    },

    iv: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("teacher_model", teacherSchema)