/* accountController.js — all user-account work (rubric #2 createAccount, #3 login).

   Controller functions follow the shape used in the course sample code:

       module.exports.someName = async function (req, res, next) { ... }

   They receive the request, do validation and database work, and answer with JSON.
   No HTML is built here — that is the React client's job.

   Endpoints these serve (project page contract):
     POST /api/accounts   create an account
     POST /api/login      sign in, store the user's _id in the Express session
     POST /api/logout     destroy the session
     GET  /api/account    the signed-in user's information
     PUT  /api/account    update the signed-in user's information
*/

const bcrypt = require('bcryptjs')
const { ObjectId } = require('mongodb')
const { getCollection } = require('../db/databaseConnection')

// How many rounds bcrypt spends on each password. 10 is the usual class default.
const SALT_ROUNDS = 10

// The users collection, looked up per call (the connection is created at startup).
function users() {
  return getCollection('users')
}

// Trim a value that may not be a string at all (curl can post anything).
function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

// Escape a user-supplied string before putting it in a regex, so a login like
// "a.b" cannot match "axb" and cannot inject a pattern.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Case-insensitive exact match, used for login and email lookups.
function exactIgnoreCase(value) {
  return { $regex: '^' + escapeRegExp(value) + '$', $options: 'i' }
}

// Validate the create-account form. Returns every problem at once so the page can
// highlight all of them, plus a cleaned copy of the values.
function validateSignup(body) {
  const source = body || {}
  const errors = {}
  const login = text(source.login)
  const email = text(source.email)
  const password = typeof source.password === 'string' ? source.password : ''
  const firstName = text(source.firstName)
  const lastName = text(source.lastName)
  const street = text(source.street)
  const city = text(source.city)
  const state = text(source.state)
  const zip = text(source.zip)
  const phone = text(source.phone)

  if (!login) errors.login = 'Login is required.'
  if (!email) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email, like name@example.com.'
  }
  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }

  // The address is all-or-nothing, same rule the form applies.
  if (street || city || state || zip) {
    if (!street) errors.street = 'Street is required if an address is given.'
    if (!city) errors.city = 'City is required if an address is given.'
  }
  if (state && !/^[A-Za-z]{2}$/.test(state)) errors.state = 'State must be two letters, like CA.'
  if (zip && !/^\d{5}$/.test(zip)) errors.zip = 'Zip must be 5 digits.'
  if (phone && phone.replace(/\D/g, '').length !== 10) errors.phone = 'Phone must be 10 digits.'

  const clean = {
    login,
    email,
    password,
    firstName,
    lastName,
    street,
    city,
    state: state.toUpperCase(),
    zip,
    phone,
  }
  return { errors, clean }
}

// POST /api/accounts — rubic #2. Server-side validation, login/email uniqueness,
// hashed password, insert, then tell the user to log in.
module.exports.createAccount = async function (req, res, next) {
  try {
    const { errors, clean } = validateSignup(req.body)
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors })
    }

    // One query answers both questions: is the login taken, or is the email taken?
    const existing = await users().findOne({
      $or: [{ login: exactIgnoreCase(clean.login) }, { email: exactIgnoreCase(clean.email) }],
    })
    if (existing) {
      const sameLogin = String(existing.login).toLowerCase() === clean.login.toLowerCase()
      return res.status(409).json({
        error: sameLogin ? 'That login is already taken.' : 'That email is already registered.',
        fields: sameLogin ? { login: 'Already taken.' } : { email: 'Already registered.' },
      })
    }

    // Passwords are never stored as typed: bcrypt adds a salt and a slow hash, so
    // a stolen database dump holds no readable passwords.
    const passwordHash = await bcrypt.hash(clean.password, SALT_ROUNDS)

    const doc = {
      login: clean.login,
      email: clean.email,
      passwordHash,
      firstName: clean.firstName,
      lastName: clean.lastName,
      phone: clean.phone,
      shippingAddress: {
        street: clean.street,
        city: clean.city,
        state: clean.state,
        zip: clean.zip,
      },
      createdAt: new Date(),
    }

    const result = await users().insertOne(doc)

    // The rubric asks for a "please log in" answer — no email verification step.
    res.status(201).json({
      ok: true,
      userId: result.insertedId,
      login: clean.login,
      message: 'Account created. Please log in.',
    })
  } catch (err) {
    // 11000 = duplicate key: two signups raced past the check above.
    if (err.code === 11000) {
      return res.status(409).json({ error: 'That login or email already exists.' })
    }
    next(err)
  }
}

// POST /api/login — rubric #3. Login may be typed as the login name OR the email;
// either way the password is compared against the stored bcrypt hash.
module.exports.login = async function (req, res, next) {
  try {
    const body = req.body || {}
    const identifier = text(body.login || body.email)
    const password = typeof body.password === 'string' ? body.password : ''

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Login and password are both required.' })
    }

    const user = await users().findOne({
      $or: [{ login: exactIgnoreCase(identifier) }, { email: exactIgnoreCase(identifier) }],
    })

    // One message for "no such user" and for "wrong password" — telling them apart
    // would let someone probe for valid accounts.
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false
    if (!user || !passwordOk) {
      return res.status(401).json({ error: 'Login or password is incorrect.' })
    }

    // The session holds the MongoDB _id, exactly as the project page describes.
    // The hash stays in the database.
    req.session.user = {
      userId: user._id.toString(),
      login: user.login,
      email: user.email,
    }

    res.json({ ok: true, user: { login: user.login, email: user.email } })
  } catch (err) {
    next(err)
  }
}

// POST /api/logout — forget the session entirely.
module.exports.logout = function (req, res) {
  req.session.destroy(function () {
    res.json({ ok: true })
  })
}

// GET /api/account — the signed-in user's profile, without the password hash.
module.exports.getAccount = async function (req, res, next) {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'Not signed in.' })

    const user = await users().findOne({ _id: new ObjectId(req.session.user.userId) })
    if (!user) return res.status(404).json({ error: 'Account not found.' })

    res.json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
}

// PUT /api/account — edit the profile. Email changes are checked for uniqueness.
module.exports.updateAccount = async function (req, res, next) {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'Not signed in.' })

    const id = new ObjectId(req.session.user.userId)
    const body = req.body || {}
    const changes = {}

    const email = text(body.email)
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.', fields: { email: 'Invalid.' } })
      }
      const taken = await users().findOne({
        _id: { $ne: id },
        email: exactIgnoreCase(email),
      })
      if (taken) {
        return res.status(409).json({ error: 'That email is already registered.', fields: { email: 'Already registered.' } })
      }
      changes.email = email
    }

    for (const field of ['firstName', 'lastName', 'phone']) {
      if (body[field] !== undefined) changes[field] = text(body[field])
    }

    const address = body.shippingAddress
    if (address && typeof address === 'object') {
      changes.shippingAddress = {
        street: text(address.street),
        city: text(address.city),
        state: text(address.state).toUpperCase(),
        zip: text(address.zip),
      }
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' })
    }

    await users().updateOne({ _id: id }, { $set: changes })
    const updated = await users().findOne({ _id: id })
    res.json({ ok: true, user: publicUser(updated) })
  } catch (err) {
    next(err)
  }
}

// What the client is allowed to see: everything except the password hash.
function publicUser(user) {
  return {
    _id: user._id,
    login: user.login,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    shippingAddress: user.shippingAddress,
    createdAt: user.createdAt,
  }
}
