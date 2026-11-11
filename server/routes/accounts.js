/* routes/accounts.js — rubric #2 (createAccount) and #3 (login).

   POST /api/createAccount  -> validates, checks login+email are unused, inserts a
                               user document, answers "now log in"
   POST /api/login          -> checks login+password against the users collection
                               and stores the user in the session
   POST /api/logout         -> forgets the session user
   GET  /api/me             -> who is signed in right now (or null)

   The browser validates too (CreateAccountView.jsx), but the browser's check is
   only a courtesy — anyone can skip it with curl. Every rule is enforced again
   here. The rubric asks for exactly that.
*/

import express from 'express'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { getUsers } from '../db.js'

const router = express.Router()

/* ---------- password helpers ---------- */
// Never store a password as typed. scrypt turns it into a hash that cannot be
// reversed, and a random salt per user means two people with the same password
// still get different hashes. The stored string looks like "salt:hash".
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return salt + ':' + hash
}

// timingSafeEqual compares without leaking how much of the hash matched.
function checkPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const attempt = scryptSync(password, salt, 64)
  const original = Buffer.from(hash, 'hex')
  if (attempt.length !== original.length) return false
  return timingSafeEqual(attempt, original)
}

/* ---------- validation ---------- */
// Same rules as the form, written as a function so the route can return all the
// problems at once instead of stopping at the first one.
function validateSignup(body) {
  const errors = {}
  const login = (body.login || '').trim()
  const email = (body.email || '').trim()
  const password = body.password || ''

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

  // The address block is all-or-nothing, matching the form: if any piece was
  // given, street and city must be there too.
  const street = (body.street || '').trim()
  const city = (body.city || '').trim()
  const state = (body.state || '').trim()
  const zip = (body.zip || '').trim()
  if (street || city || state || zip) {
    if (!street) errors.street = 'Street is required if an address is given.'
    if (!city) errors.city = 'City is required if an address is given.'
  }
  if (state && !/^[A-Za-z]{2}$/.test(state)) errors.state = 'State must be two letters, like CA.'
  if (zip && !/^\d{5}$/.test(zip)) errors.zip = 'Zip must be 5 digits.'

  const phone = (body.phone || '').trim()
  if (phone && phone.replace(/\D/g, '').length !== 10) errors.phone = 'Phone must be 10 digits.'

  return { errors, clean: { login, email, password, street, city, state, zip, phone } }
}

/* ---------- #2 create an account ---------- */
router.post('/createAccount', async (req, res, next) => {
  try {
    const { errors, clean } = validateSignup(req.body)
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors })
    }

    const users = getUsers()

    // One query answers both questions: is the login taken, or the email taken?
    // Case-insensitive so "Tien" and "tien" count as the same account.
    const existing = await users.findOne({
      $or: [
        { login: { $regex: '^' + escapeRegExp(clean.login) + '$', $options: 'i' } },
        { email: { $regex: '^' + escapeRegExp(clean.email) + '$', $options: 'i' } },
      ],
    })

    if (existing) {
      const sameLogin = existing.login.toLowerCase() === clean.login.toLowerCase()
      return res.status(409).json({
        error: sameLogin ? 'That login is already taken.' : 'That email is already registered.',
        fields: sameLogin ? { login: 'Already taken.' } : { email: 'Already registered.' },
      })
    }

    const doc = {
      login: clean.login,
      email: clean.email,
      passwordHash: hashPassword(clean.password), // never the raw password
      address: {
        street: clean.street,
        city: clean.city,
        state: clean.state.toUpperCase(),
        zip: clean.zip,
      },
      phone: clean.phone,
      createdAt: new Date(),
    }

    const result = await users.insertOne(doc)

    // The rubric asks for a response that tells them to log in — no email
    // verification step.
    res.status(201).json({
      ok: true,
      userId: result.insertedId,
      message: 'Account created. Please log in.',
    })
  } catch (err) {
    // 11000 is MongoDB's "duplicate key" code: two signups raced past the check
    // above. The unique index caught it, so report it like any other duplicate.
    if (err.code === 11000) {
      return res.status(409).json({ error: 'That login or email already exists.' })
    }
    next(err)
  }
})

/* ---------- #3 log in ---------- */
router.post('/login', async (req, res, next) => {
  try {
    const login = (req.body.login || '').trim()
    const password = req.body.password || ''

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are both required.' })
    }

    const user = await getUsers().findOne({
      login: { $regex: '^' + escapeRegExp(login) + '$', $options: 'i' },
    })

    // One message for "no such user" and for "wrong password" — telling them
    // apart would let someone probe for valid logins.
    if (!user || !checkPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Login or password is incorrect.' })
    }

    // Only what the pages need goes in the session; the hash stays in the db.
    req.session.user = {
      id: user._id.toString(),
      login: user.login,
      email: user.email,
      address: user.address,
      phone: user.phone,
    }

    res.json({ ok: true, user: req.session.user })
  } catch (err) {
    next(err)
  }
})

/* ---------- optional helpers ---------- */
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

router.get('/me', (req, res) => {
  res.json({ user: req.session.user || null, cartLines: (req.session.cart || []).length })
})

// Escape user text before putting it in a regex, so a login of "a.b" doesn't
// match "axb". Also blocks a malicious pattern from being injected.
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default router
