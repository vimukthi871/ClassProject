const express = require('express')
const connection = require('../../connection')
const router = express.Router()

const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
require('dotenv').config()
var auth = require('../../services/authentication')
var checkRole = require('../../services/checkRole')



//add users
router.post('/signup', (req, res) => {
    let user = req.body
    var query = "select email,password,role,status from user where email=?"
    connection.query(query, [user.email], (err, results) => {
        if (!err) {
            if (results.length <= 0) {
                var query = "insert into user(name,contactNumber,email,password,status,role)values(?,?,?,?,'false','user')"
                connection.query(query, [user.name, user.contactNumber, user.email, user.password], (err, results) => {
                    if (!err) {
                        return res.status(200).json({ message: "Successfully Registered" })
                    } else {
                        return res.status(500).json(err)
                    }
                })
            } else {
                return res.status(400).json({ message: "Email Already Exist." })
            }
        }
        else {
            return res.status(500).json(err)
        }
    })
})

//login users data
router.post('/login', (req, res) => {
    const user = req.body
    var query = "select email,password,role,status from user where email=?"
    connection.query(query, [user.email], (err, results) => {
        if (!err) {
            if (results.length <= 0 || results[0].password != user.password) {
                return res.status(401).json({ message: "Incorrect Username or Password" })
            } else if (results[0].status === 'false') {
                return res.status(401).json({ message: "Wait for Admin Approval" })
            } else if (results[0].password == user.password) {//> require('crypto').randomBytes(64).toString('hex')
                const response = { email: results[0].email, role: results[0].role }
                const accessToken = jwt.sign(response, process.env.ACCESS_TOKEN, { expiresIn: '8h' })
                res.status(200).json({ token: accessToken })

            } else {
                return res.status(400).json({ message: "Something went wrong.Please try again later" })
            }
        } else {
            return res.status(500).json(err)
        }
    })
})

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
})

//forgot password sending to mail
router.post('/forgotPassword', (req, res) => {
    const user = req.body
    var query = "select email,password from user where email=?"
    connection.query(query, [user.email], (err, results) => {
        if (!err) {
            if (results.length <= 0) {
                return res.status(200).json({ message: "Password sent successfully to your email." })
            } else {
                var mailOptions = {
                    from: process.env.EMAIL,
                    to: results[0].email,
                    subject: "Password by Suhasra",
                    html: '<p><b>Your Login details for Suhasra</b><br><b>Email: </b>' + results[0].email + '<br><b>Password: </b>' + results[0].password + '<br><a href="http://localhost:4200/">Click here to Login</a></p>'
                }
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error)
                    } else {
                        console.log('Email sent: ' + info.response)
                    }
                })
                return res.status(200).json({ message: "Password sent successfully to your email." })

            }
        } else {
            return res.status(500).json(err)
        }
    })
})


//get all 
router.get('/get', auth.authenticationToken, checkRole.checkRole, (req, res) => {
    var query = "select id,name,email,contactNumber,status from user where role='user'"
    connection.query(query, (err, results) => {
        if (!err) {
            return res.status(200).json(results)
        } else {
            return res.status(500).json(err)
        }
    })
})


//update user
router.patch('/update', auth.authenticationToken, checkRole.checkRole, (req, res) => {
    let user = req.body
    var query = "update user set status=? where id=?"
    connection.query(query, [user.status, user.id], (err, results) => {
        if (!err) {
            if (results.affectedRows == 0) {
                return res.status(404).json({ message: "User ID does not exist" })
            }
            return res.status(200).json({ message: "User Updated Successfully" })
        } else {
            return res.status(500).json(err)
        }
    })
})

//get token
router.get('/checkToken', auth.authenticationToken, (req, res) => {
    return res.status(200).json({ message: "true" })
})

//change password
router.post('/changePassword',auth.authenticationToken,(req, res) => {
    const user = req.body
    const email = res.locals.email
    var query = "select * from user where email=? and password=?"
    connection.query(query, [email, user.oldPassword], (err, results) => {
        if (!err) {
            if (results.length <= 0) {
                return res.status(400).json({ message: "Incorrect old password" })
            } else if (results[0].password == user.oldPassword) {
                var query = "update user set password=? where email =?"
                connection.query(query, [user.newPassword, email], (err, results) => {
                    if (!err) {
                        return res.status(200).json({ message: "Password Updated Successfully" })
                    } else {
                        return res.status(500).json(err)
                    }
                })
            } else {
                return res.status(400).json({ message: "Something went wrong.Please try again later" })
            }
        } else {
            return res.status(500).json(err)
        }
    })
})

module.exports = router