require("dotenv").config()
const crypto = require('crypto')
const util = require('util')


// functions for the encryption of emails in the database
// unique IV ensures encrptions are different for the same values

function encrypt(plain) {

    const iv = crypto.randomBytes(16)
    let key = process.env.ENCRYPTION_KEY

    let cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(plain, 'utf-8', 'hex') // outputing encrypted hexadecimal
    encrypted += cipher.final('hex') // appends any unciphered contents
    
    return {
        email: encrypted,
        iv: iv
    }

}


function decrypt(encrypt_string, iv) {

    let key = process.env.ENCRYPTION_KEY
    
    let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encrypt_string, 'hex', 'utf8')
    decrypted += decipher.final('utf-8') // appending additional data to the utf-8 output

    return decrypted

}

exports.encrypt = encrypt
exports.decrypt = decrypt