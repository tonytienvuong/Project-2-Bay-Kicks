/* AccountView.jsx — rubric #3 (login) plus the dashboard her project page asks for.

   Two screens, chosen by whether someone is signed in:

     no profile  -> the sign-in form, with a link to create an account
     profile     -> the dashboard: who you are, Edit account, View orders, Log out

   The password is never kept in the browser after a successful sign-in. POST
   /api/login puts the user in the Express session, and the session cookie identifies
   that session from then on — so a refresh is answered by GET /api/account, not by
   anything this component remembers.

   Props: setView (used to reach the Create Account page and the shop).
*/

import { useEffect, useState } from 'react'
import { fetchAccount, fetchOrders, login, logout, updateAccount } from '../api'

// The edit form starts as a copy of the profile, so every field arrives filled in.
function editFrom(user) {
  const address = user.shippingAddress || {}
  return {
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    shippingAddress: {
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zip: address.zip || '',
    },
  }
}

// $1,234.56 — used by the order history.
function money(value) {
  return '$' + Number(value || 0).toFixed(2)
}

function AccountView({ setView }) {
  // The signed-in user, as /api/account returned them. null means signed out.
  const [profile, setProfile] = useState(null)

  // Which dashboard panel is open: 'profile', 'edit' or 'orders'.
  const [panel, setPanel] = useState('profile')

  /* ---------- sign-in form ---------- */
  const [values, setValues] = useState({ login: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /* ---------- edit form ---------- */
  const [edit, setEdit] = useState(null)
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  /* ---------- order history ---------- */
  const [orders, setOrders] = useState(null)
  const [ordersError, setOrdersError] = useState('')

  // On first paint, ask the server who this session belongs to. A refresh keeps the
  // cookie, so a signed-in user lands back on the dashboard instead of the login form.
  useEffect(() => {
    fetchAccount()
      .then(({ ok, data }) => {
        if (ok) setProfile(data.user)
      })
      .catch(() => {})
  }, [])

  /* ---------- signing in ---------- */

  function handleChange(e) {
    const { name, value } = e.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  function validate() {
    const found = {}

    if (!values.login.trim()) found.login = 'Login is required.'

    if (!values.password) {
      found.password = 'Password is required.'
    } else if (values.password.length < 8) {
      found.password = 'Password must be at least 8 characters.'
    }

    return found
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    setServerError('')
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const { ok, data } = await login(values)
      if (!ok) {
        // 401 covers both "no such login" and "wrong password", on purpose.
        setServerError(data.error || 'Could not sign in.')
        return
      }

      // The login answer carries only login + email. The dashboard needs the whole
      // profile, so ask for it — the session cookie is already set by now.
      const account = await fetchAccount()
      if (!account.ok) {
        setServerError(account.data.error || 'Signed in, but the profile could not be read.')
        return
      }

      setProfile(account.data.user)
      setPanel('profile')
      setValues({ login: '', password: '' })
    } catch {
      setServerError('Could not reach the server. Is it running?')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- dashboard actions ---------- */

  async function handleLogout() {
    // The server destroys the session; this component just forgets the profile.
    await logout().catch(() => {})
    setProfile(null)
    setPanel('profile')
    setOrders(null)
    setEdit(null)
  }

  function openEdit() {
    setEdit(editFrom(profile))
    setEditError('')
    setPanel('edit')
  }

  function handleEditChange(e) {
    const { name, value } = e.target

    // Address fields sit one level down inside shippingAddress, so they get their
    // own branch; everything else is a top-level key.
    if (['street', 'city', 'state', 'zip'].includes(name)) {
      setEdit((current) => ({
        ...current,
        shippingAddress: { ...current.shippingAddress, [name]: value },
      }))
    } else {
      setEdit((current) => ({ ...current, [name]: value }))
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    setEditError('')
    try {
      const { ok, data } = await updateAccount(edit)
      if (!ok) {
        setEditError(data.error || 'Could not save those changes.')
        return
      }
      // PUT answers with the updated document — no second GET needed.
      setProfile(data.user)
      setPanel('profile')
    } catch {
      setEditError('Could not reach the server. Is it running?')
    } finally {
      setSaving(false)
    }
  }

  async function openOrders() {
    setPanel('orders')
    setOrdersError('')
    try {
      const { ok, data } = await fetchOrders()
      if (!ok) {
        setOrdersError(data.error || 'Could not load your orders.')
        return
      }
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrdersError('Could not reach the server. Is it running?')
    }
  }

  /* ---------- signed out: the sign-in form ---------- */

  if (!profile) {
    return (
      <section className="bk-section">
        <div className="container">
          <div className="bk-form-card">
            <h2 className="bk-section-title">Sign in</h2>
            <p className="bk-section-sub">Welcome back to Bay Kicks.</p>

            {serverError && <p className="bk-error">{serverError}</p>}

            <form onSubmit={handleSubmit} noValidate>
              <label className="form-label" htmlFor="ac-login">
                Login
              </label>
              <input
                id="ac-login"
                name="login"
                className="form-control"
                value={values.login}
                onChange={handleChange}
              />
              {errors.login && <p className="bk-error">{errors.login}</p>}

              <label className="form-label mt-3" htmlFor="ac-password">
                Password
              </label>
              <input
                id="ac-password"
                name="password"
                type="password"
                className="form-control"
                value={values.password}
                onChange={handleChange}
              />
              {errors.password && <p className="bk-error">{errors.password}</p>}

              <button type="submit" className="btn btn-bk w-100 mt-3" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="bk-form-alt">
              No account yet?{' '}
              <button className="bk-link" onClick={() => setView('createAccount')}>
                Create one
              </button>
            </p>
          </div>
        </div>
      </section>
    )
  }

  /* ---------- signed in: the dashboard ---------- */

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
  const address = profile.shippingAddress || {}

  return (
    <section className="bk-section">
      <div className="container">
        <h2 className="bk-section-title">My account</h2>
        <p className="bk-section-sub">
          Signed in as <strong>{profile.login}</strong>
          {fullName ? ' · ' + fullName : ''}
        </p>

        {/* Each button takes the filled class while its own panel is open, and the
            outline class otherwise — the same active-link idea as the nav bar. */}
        <div className="bk-account-nav">
          <button
            className={panel === 'profile' ? 'btn btn-bk' : 'btn btn-bk-outline'}
            onClick={() => setPanel('profile')}
          >
            My information
          </button>
          <button
            className={panel === 'edit' ? 'btn btn-bk' : 'btn btn-bk-outline'}
            onClick={openEdit}
          >
            Edit account
          </button>
          <button
            className={panel === 'orders' ? 'btn btn-bk' : 'btn btn-bk-outline'}
            onClick={openOrders}
          >
            View orders
          </button>
          <button className="btn btn-bk-outline" onClick={handleLogout}>
            Log out
          </button>
        </div>

        {/* ---- panel: the profile, read-only ---- */}
        {panel === 'profile' && (
          <div className="bk-form-card bk-card-wide">
            <h3 className="h6 mb-3">Your information</h3>
            <div className="row">
              <div className="col-md-6">
                <p className="mb-1">
                  <span className="text-muted">Login</span>
                  <br />
                  {profile.login}
                </p>
                <p className="mb-1">
                  <span className="text-muted">Name</span>
                  <br />
                  {fullName || '—'}
                </p>
                <p className="mb-1">
                  <span className="text-muted">Email</span>
                  <br />
                  {profile.email}
                </p>
                <p className="mb-0">
                  <span className="text-muted">Phone</span>
                  <br />
                  {profile.phone || '—'}
                </p>
              </div>
              <div className="col-md-6">
                <p className="mb-1">
                  <span className="text-muted">Shipping address</span>
                  <br />
                  {address.street ? (
                    <>
                      {address.street}
                      <br />
                      {address.city}, {address.state} {address.zip}
                    </>
                  ) : (
                    '—'
                  )}
                </p>
                <p className="mb-0 mt-3">
                  <span className="text-muted">Member since</span>
                  <br />
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---- panel: the edit form ---- */}
        {panel === 'edit' && edit && (
          <form className="bk-form-card bk-card-wide" onSubmit={saveEdit} noValidate>
            <h3 className="h6 mb-3">Edit account</h3>

            {editError && <p className="bk-error">{editError}</p>}

            <label className="form-label" htmlFor="ed-email">
              Email
            </label>
            <input
              id="ed-email"
              name="email"
              className="form-control"
              value={edit.email}
              onChange={handleEditChange}
            />

            <div className="row mt-3">
              <div className="col-6">
                <label className="form-label" htmlFor="ed-first">
                  First name
                </label>
                <input
                  id="ed-first"
                  name="firstName"
                  className="form-control"
                  value={edit.firstName}
                  onChange={handleEditChange}
                />
              </div>
              <div className="col-6">
                <label className="form-label" htmlFor="ed-last">
                  Last name
                </label>
                <input
                  id="ed-last"
                  name="lastName"
                  className="form-control"
                  value={edit.lastName}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            <label className="form-label mt-3" htmlFor="ed-phone">
              Phone
            </label>
            <input
              id="ed-phone"
              name="phone"
              className="form-control"
              value={edit.phone}
              onChange={handleEditChange}
            />

            <h4 className="h6 mt-4">Shipping address</h4>
            <label className="form-label" htmlFor="ed-street">
              Street
            </label>
            <input
              id="ed-street"
              name="street"
              className="form-control"
              value={edit.shippingAddress.street}
              onChange={handleEditChange}
            />

            <div className="row mt-3">
              <div className="col-6">
                <label className="form-label" htmlFor="ed-city">
                  City
                </label>
                <input
                  id="ed-city"
                  name="city"
                  className="form-control"
                  value={edit.shippingAddress.city}
                  onChange={handleEditChange}
                />
              </div>
              <div className="col-3">
                <label className="form-label" htmlFor="ed-state">
                  State
                </label>
                <input
                  id="ed-state"
                  name="state"
                  className="form-control"
                  maxLength={2}
                  value={edit.shippingAddress.state}
                  onChange={handleEditChange}
                />
              </div>
              <div className="col-3">
                <label className="form-label" htmlFor="ed-zip">
                  Zip
                </label>
                <input
                  id="ed-zip"
                  name="zip"
                  className="form-control"
                  value={edit.shippingAddress.zip}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-bk w-100 mt-4" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn btn-bk-outline w-100 mt-2"
              onClick={() => setPanel('profile')}
            >
              Cancel
            </button>
          </form>
        )}

        {/* ---- panel: the order history ---- */}
        {panel === 'orders' && (
          <div className="bk-form-card bk-card-wide">
            <h3 className="h6 mb-3">Your orders</h3>

            {ordersError && <p className="bk-error">{ordersError}</p>}
            {!ordersError && orders === null && <p className="text-muted">Loading…</p>}

            {!ordersError && orders !== null && orders.length === 0 && (
              <p className="text-muted">
                No orders yet.{' '}
                <button className="bk-link" onClick={() => setView('shop')}>
                  Shop the collection
                </button>
              </p>
            )}

            {orders &&
              orders.map((order) => (
                <div className="bk-order" key={order._id}>
                  <div className="bk-order-head">
                    <strong>Order {String(order._id).slice(-6).toUpperCase()}</strong>
                    <span className="text-muted">
                      {new Date(order.orderDate).toLocaleString()} · {order.status}
                    </span>
                  </div>

                  <ul className="bk-order-items">
                    {order.items.map((item) => (
                      <li key={item.productId + '-' + item.size + '-' + item.color}>
                        {item.quantity} × {item.name} · {item.size} · {item.color} ·{' '}
                        {money(item.lineTotal)}
                      </li>
                    ))}
                  </ul>

                  <div className="bk-order-total">
                    Subtotal {money(order.subtotal)} · Tax {money(order.tax)} ·{' '}
                    <strong>Total {money(order.total)}</strong>
                  </div>

                  <div className="text-muted small">
                    Shipped to {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
                    {order.shippingAddress.state} {order.shippingAddress.zip}
                    {order.payment
                      ? ' · Paid with ' + order.payment.cardType + ' ending ' + order.payment.last4
                      : ''}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default AccountView
