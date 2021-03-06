const User = require('../models/user')
const { check, validationResult } = require('express-validator')
var jwt = require('jsonwebtoken')
var expressJwt = require('express-jwt')

exports.signup = (req, res) => {
  const errors = validationResult(req)

  console.log('Signup')

  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: errors.array()[0].msg
    })
  }

  //Check if username already existed or not
  User.findOne({ username: req.body.username }, (err, doc) => {
    if (err || doc) {
      return res.status(400).json({
        error: 'Username already existed'
      })
    }

    //Save the user
    const user = new User(req.body)
    user.save((err, user) => {
      if (err) {
        return res.status(400).json({
          err: 'NOT able to save user in DB'
        })
      }
      res.json({
        username: user.username,
        email: user.email,
        id: user._id
      })
    })
  })
}

exports.signin = (req, res) => {
  console.log('Login in')
  const errors = validationResult(req)
  const { email, password } = req.body

  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: errors.array()[0].msg
    })
  }

  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'USER email does not exists'
      })
    }

    if (!user.autheticate(password)) {
      return res.status(400).json({
        error: 'Email and password do not match'
      })
    }

    //create token
    const token = jwt.sign({ _id: user._id }, process.env.SECRET)
    //put token in cookie
    res.cookie('token', token, { expire: new Date() + 9999 })

    //send response to front end
    const { _id, name, email, username, role, calories_per_day, calorie_time } =
      user
    //console.log(user)
    return res.json({
      token,
      user: {
        _id,
        email,
        name,
        username,
        role,
        calories_per_day,
        calorie_time
      }
    })
  })
}

exports.signout = (req, res) => {
  res.clearCookie('token')
  res.json({
    message: 'User signout successfully'
  })
}

//protected routes
exports.isSignedIn = expressJwt({
  secret: process.env.SECRET,
  userProperty: 'auth',
  algorithms: ['HS256']
})

//custom middlewares
exports.isAuthenticated = (req, res, next) => {
  let checker = req.profile && req.auth && req.profile._id == req.auth._id
  if (!checker) {
    return res.status(403).json({
      error: 'ACCESS DENIED'
    })
  }
  next()
}

exports.isAdmin = (req, res, next) => {
  console.log('isAdmin', req.profile.role === 0)
  if (req.profile.role === 0) {
    return res.status(403).json({
      error: 'You are not ADMIN, Access denied'
    })
  }
  next()
}
