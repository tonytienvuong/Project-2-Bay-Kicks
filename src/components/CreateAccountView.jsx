/* CreateAccountView.jsx — the create-account form with JavaScript validation.
   Props: setView (used to get back to the sign-in page).

   Required fields:  login, password, email.
   Optional fields:  street, city, state, zip, phone — each one is validated ONLY
                     when the shopper actually types something into it.

   Rules enforced here:
     login     must not be empty
     password  must not be empty, and must be at least 8 characters
     email     must not be empty, and must look like name@example.com
     street /  the address is all-or-nothing: if ANY of street, city, state or zip
     city      is filled in, then street and city must not be blank
     state     if filled in, exactly two letters (CA)
     zip       if filled in, exactly five digits
     phone     if filled in, exactly ten digits once punctuation is stripped, so
               (510) 555-0100 and 5105550100 both pass

   The form is built from the FIELDS list below, so adding a field means adding one
   row to that list.

   noValidate on the <form> is load-bearing. Without it the browser runs its own
   checks first and pops its own bubble, and these per-field messages never get a
   chance to appear — which would also ruin the three-pass demo video. */

import { useState } from 'react'

const FIELDS = [
  { name: 'login', label: 'Login', required: true },
  { name: 'password', label: 'Password', required: true, type: 'password' },
  { name: 'email', label: 'Email', required: true, type: 'email' },
  { name: 'street', label: 'Street' },
  { name: 'city', label: 'City' },
  { name: 'state', label: 'State' },
  { name: 'zip', label: 'Zip' },
  { name: 'phone', label: 'Phone' },
]

const EMPTY = {
  login: '',
  password: '',
  email: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
}

function CreateAccountView({ setView }) {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [createdAs, setCreatedAs] = useState('')
  // Set by the server, not by the browser validation: duplicate login/email, a
  // network failure, or a rule the browser let through.
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  function validate() {
    const found = {}

    if (!values.login.trim()) {
      found.login = 'Login is required.'
    }

    if (!values.password) {
      found.password = 'Password is required.'
    } else if (values.password.length < 8) {
      found.password = 'Password must be at least 8 characters.'
    }

    if (!values.email.trim()) {
      found.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      found.email = 'Enter a valid email, like name@example.com.'
    }

    const addressStarted =
      values.street.trim() || values.city.trim() || values.state.trim() || values.zip.trim()

    if (addressStarted) {
      if (!values.street.trim()) found.street = 'Street is required if an address is given.'
      if (!values.city.trim()) found.city = 'City is required if an address is given.'
    }

    if (values.state.trim() && !/^[A-Za-z]{2}$/.test(values.state.trim())) {
      found.state = 'State must be two letters, like CA.'
    }

    if (values.zip.trim() && !/^\d{5}$/.test(values.zip.trim())) {
      found.zip = 'Zip must be 5 digits.'
    }

    if (values.phone.trim()) {
      const digits = values.phone.replace(/\D/g, '')
      if (digits.length !== 10) found.phone = 'Phone must be 10 digits.'
    }

    return found
  }

  // Two rounds of validation on purpose: this one gives instant feedback, then
  // the server checks everything again because a browser check is only a
  // courtesy — curl can skip it entirely.
  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    setServerError('')

    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/createAccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await response.json()

      if (response.status === 201) {
        // The rubric wants the user told to log in, not signed in automatically.
        setCreatedAs(data.login || values.login)
        setValues(EMPTY)
      } else {
        // 400 = a field is wrong, 409 = login or email already used. Both come
        // back with a `fields` object keyed by field name.
        setErrors(data.fields || {})
        setServerError(data.error || 'Something went wrong. Try again.')
      }
    } catch {
      // fetch() itself failed: server down, no network, CORS.
      setServerError('Could not reach the server. Is it running?')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="bk-section">
      <div className="container">
        <div className="bk-form-card">
          <h2 className="bk-section-title">Create account</h2>
          <p className="bk-section-sub">Login, password and email are required.</p>

          {createdAs && (
            <p className="bk-success">
              Account created for {createdAs}. <button className="bk-link" onClick={() => setView('account')}>Log in</button>
            </p>
          )}
          {serverError && <p className="bk-error">{serverError}</p>}

          <form onSubmit={handleSubmit} noValidate>
            {FIELDS.map((field) => (
              <div key={field.name} className="mb-3">
                <label className="form-label" htmlFor={'ca-' + field.name}>
                  {field.label}
                  {!field.required && <span className="bk-optional"> (optional)</span>}
                </label>
                <input
                  id={'ca-' + field.name}
                  name={field.name}
                  type={field.type || 'text'}
                  className="form-control"
                  value={values[field.name]}
                  onChange={handleChange}
                />
                {errors[field.name] && <p className="bk-error">{errors[field.name]}</p>}
              </div>
            ))}

            <button type="submit" className="btn btn-bk w-100" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <p className="bk-form-alt">
            Already have an account?{' '}
            <button className="bk-link" onClick={() => setView('account')}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    </section>
  )
}

export default CreateAccountView
