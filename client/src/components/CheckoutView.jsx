/* CheckoutView.jsx — rubric #6: the checkout page, plus the confirmation after it.

   Two screens live in this one component, chosen by `placedOrder`:
     placedOrder === null  -> the form: summary, shipping, billing, payment
     placedOrder set       -> the confirmation for the order the server just wrote

   Where the numbers come from:
     GET  /api/checkout  cart lines, subtotal, tax rate, tax, shipping, total.
                         The server calculates them from the products collection, so
                         the page never adds up money on its own.
     POST /api/orders    the order itself. The answer contains the stored document,
                         which is what the confirmation displays.

   What is NOT sent to the server:
     the card number and the CVV. The project page says only the card type and the
     last four digits may be stored, so this page slices the last four off the number
     and the number and CVV never leave the browser.

   Props:
     setView         switch screens (the empty-cart button uses it)
     onOrderPlaced   told after a successful order, so App can empty the cart badge
*/

import { useEffect, useState } from 'react'
import { fetchAccount, fetchCheckout, placeOrder } from '../api'

const CARD_TYPES = ['Visa', 'Mastercard', 'American Express', 'Discover']

// One place to turn a number into $1,234.56.
function money(value) {
  return '$' + Number(value || 0).toFixed(2)
}

// A blank address, so resetting the form is one call.
function emptyAddress() {
  return { street: '', city: '', state: '', zip: '' }
}

function CheckoutView({ setView, onOrderPlaced }) {
  // The answer from GET /api/checkout: { user, cart, count, subtotal, tax, total }.
  const [summary, setSummary] = useState(null)

  // Anything that stopped the page from loading the summary at all.
  const [loadError, setLoadError] = useState('')

  // The form's own values. Addresses are objects so each field is one key.
  const [shipping, setShipping] = useState(emptyAddress())
  const [billing, setBilling] = useState(emptyAddress())
  const [sameAsShipping, setSameAsShipping] = useState(true)

  // cardNumber / expiry / cvv stay in the browser; only cardType and last4 travel.
  const [payment, setPayment] = useState({ cardType: 'Visa', cardNumber: '', expiry: '', cvv: '' })

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // The order document the server returned after a successful POST.
  const [placedOrder, setPlacedOrder] = useState(null)

  // On first paint: the money summary, and the account so the address fields can be
  // pre-filled instead of typed again.
  useEffect(() => {
    fetchCheckout()
      .then(({ ok, data }) => {
        if (!ok) {
          setLoadError(data.error || 'Could not load your cart.')
          return
        }
        setSummary(data)
      })
      .catch(() => setLoadError('Could not reach the server. Is it running?'))

    fetchAccount()
      .then(({ ok, data }) => {
        if (!ok) return
        const address = data.user.shippingAddress || {}
        setShipping({
          street: address.street || '',
          city: address.city || '',
          state: address.state || '',
          zip: address.zip || '',
        })
      })
      .catch(() => {})
  }, [])

  // One handler for every text input: the field's `name` says which state key it is.
  // `form` is either 'shipping', 'billing' or 'payment'.
  function handleChange(form, e) {
    const { name, value } = e.target
    if (form === 'shipping') setShipping((current) => ({ ...current, [name]: value }))
    else if (form === 'billing') setBilling((current) => ({ ...current, [name]: value }))
    else setPayment((current) => ({ ...current, [name]: value }))
  }

  // The same rules the server applies, checked here first so the user sees the
  // problem under the field instead of as one server error at the bottom.
  function validate() {
    const found = {}
    const address = (values, prefix) => {
      if (!values.street.trim()) found[prefix + 'Street'] = 'Street is required.'
      if (!values.city.trim()) found[prefix + 'City'] = 'City is required.'
      if (!/^[A-Za-z]{2}$/.test(values.state.trim())) found[prefix + 'State'] = 'Two letters, like CA.'
      if (!/^\d{5}$/.test(values.zip.trim())) found[prefix + 'Zip'] = 'Five digits.'
    }

    address(shipping, 'ship')
    if (!sameAsShipping) address(billing, 'bill')

    // Card numbers are 13–19 digits; this only checks the shape, it is not a real
    // card check and the project does not charge anything.
    const digits = payment.cardNumber.replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19) found.cardNumber = 'Enter the card number.'
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(payment.expiry.trim())) found.expiry = 'Use MM/YY.'
    if (!/^\d{3,4}$/.test(payment.cvv.trim())) found.cvv = 'Three or four digits.'

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
      const digits = payment.cardNumber.replace(/\D/g, '')

      // The body the server expects. Billing falls back to shipping when the box is
      // ticked, and payment carries exactly two fields — type and last four.
      const payload = {
        shippingAddress: shipping,
        billingAddress: sameAsShipping ? shipping : billing,
        payment: {
          cardType: payment.cardType,
          last4: digits.slice(-4),
        },
      }

      const { ok, data } = await placeOrder(payload)

      if (!ok) {
        setServerError(data.error || 'Could not place the order.')
        return
      }

      // data.order is the document that now sits in the orders collection.
      setPlacedOrder(data.order)
      onOrderPlaced()
      window.scrollTo({ top: 0 })
    } catch {
      setServerError('Could not reach the server. Is it running?')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- the confirmation, once the order exists ---------- */

  if (placedOrder) {
    const order = placedOrder
    return (
      <section className="bk-section">
        <div className="container">
          <h2 className="bk-section-title">Order confirmed</h2>
          <p className="bk-section-sub">
            Thank you. Order {String(order._id).slice(-6).toUpperCase()} is saved and your cart is
            now empty.
          </p>
          <p className="bk-success">
            {money(order.total)} charged to your {order.payment ? order.payment.cardType : 'card'}
            {order.payment ? ' ending ' + order.payment.last4 : ''}.
          </p>

          <div className="row g-4 mt-2">
            <div className="col-md-6">
              <div className="bk-form-card bk-card-wide">
                <h3 className="h6">Customer</h3>
                <p className="mb-1">
                  {order.customer.firstName} {order.customer.lastName}
                </p>
                <p className="mb-1">{order.customer.email}</p>
                <p className="mb-0">{order.customer.phone}</p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="bk-form-card bk-card-wide">
                <h3 className="h6">Payment</h3>
                <p className="mb-1">
                  {order.payment ? order.payment.cardType : 'No card'} ····{' '}
                  {order.payment ? order.payment.last4 : '----'}
                </p>
                <p className="mb-0 text-muted">
                  Only the card type and last four digits are stored.
                </p>
              </div>
            </div>

            <div className="col-md-6">
              <div className="bk-form-card bk-card-wide">
                <h3 className="h6">Shipping to</h3>
                <p className="mb-0">
                  {order.shippingAddress.street}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.zip}
                </p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="bk-form-card bk-card-wide">
                <h3 className="h6">Billing address</h3>
                <p className="mb-0">
                  {order.billingAddress.street}
                  <br />
                  {order.billingAddress.city}, {order.billingAddress.state}{' '}
                  {order.billingAddress.zip}
                </p>
              </div>
            </div>
          </div>

          {/* One table row per product, the same .map() pattern as the cart. */}
          <div className="table-responsive mt-4">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Product ID</th>
                  <th>Qty</th>
                  <th className="text-end">Unit</th>
                  <th className="text-end">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.productId + '-' + item.size + '-' + item.color}>
                    <td>
                      {item.name}
                      <div className="text-muted small">
                        {item.size} · {item.color}
                      </div>
                    </td>
                    <td>{item.productId}</td>
                    <td>{item.quantity}</td>
                    <td className="text-end">{money(item.unitPrice)}</td>
                    <td className="text-end">{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bk-cart-total">
            <div className="bk-cart-total-row">
              <span>Subtotal</span>
              <strong>{money(order.subtotal)}</strong>
            </div>
            <div className="bk-cart-total-row">
              <span>Tax ({Math.round((order.tax / order.subtotal) * 10000) / 100}%)</span>
              <strong>{money(order.tax)}</strong>
            </div>
            <div className="bk-cart-total-row">
              <span>Shipping</span>
              <strong>{order.shippingCost === 0 ? 'Free' : money(order.shippingCost)}</strong>
            </div>
            <div className="bk-cart-total-row">
              <span>Total paid</span>
              <strong>{money(order.total)}</strong>
            </div>

            <button className="btn btn-bk w-100 mt-3" onClick={() => setView('shop')}>
              Keep shopping
            </button>
            <button className="btn btn-bk-outline w-100 mt-2" onClick={() => setView('account')}>
              View my orders
            </button>
          </div>
        </div>
      </section>
    )
  }

  /* ---------- the two states before the form ---------- */

  if (loadError) {
    return (
      <section className="bk-section">
        <div className="container text-center">
          <h2 className="bk-section-title">Checkout</h2>
          <p className="bk-error">{loadError}</p>
          <button className="btn btn-bk" onClick={() => setView('account')}>
            Sign in
          </button>
        </div>
      </section>
    )
  }

  if (!summary) {
    return (
      <section className="bk-section">
        <div className="container">
          <p className="text-muted">Loading your checkout…</p>
        </div>
      </section>
    )
  }

  if (summary.cart.length === 0) {
    return (
      <section className="bk-section">
        <div className="container text-center">
          <h2 className="bk-section-title">Nothing to check out</h2>
          <p className="bk-section-sub">Your cart is empty, so there is no order to place.</p>
          <button className="btn btn-bk" onClick={() => setView('shop')}>
            Shop the collection
          </button>
        </div>
      </section>
    )
  }

  /* ---------- the form ---------- */

  // A tiny helper so each optional address block is written once per field group.
  const addressFields = (formName, values, prefix) => (
    <>
      <label className="form-label" htmlFor={formName + '-street'}>
        Street
      </label>
      <input
        id={formName + '-street'}
        name="street"
        className="form-control"
        value={values.street}
        onChange={(e) => handleChange(formName, e)}
      />
      {errors[prefix + 'Street'] && <p className="bk-error">{errors[prefix + 'Street']}</p>}

      <div className="row mt-3">
        <div className="col-6">
          <label className="form-label" htmlFor={formName + '-city'}>
            City
          </label>
          <input
            id={formName + '-city'}
            name="city"
            className="form-control"
            value={values.city}
            onChange={(e) => handleChange(formName, e)}
          />
          {errors[prefix + 'City'] && <p className="bk-error">{errors[prefix + 'City']}</p>}
        </div>
        <div className="col-3">
          <label className="form-label" htmlFor={formName + '-state'}>
            State
          </label>
          <input
            id={formName + '-state'}
            name="state"
            className="form-control"
            maxLength={2}
            value={values.state}
            onChange={(e) => handleChange(formName, e)}
          />
          {errors[prefix + 'State'] && <p className="bk-error">{errors[prefix + 'State']}</p>}
        </div>
        <div className="col-3">
          <label className="form-label" htmlFor={formName + '-zip'}>
            Zip
          </label>
          <input
            id={formName + '-zip'}
            name="zip"
            className="form-control"
            value={values.zip}
            onChange={(e) => handleChange(formName, e)}
          />
          {errors[prefix + 'Zip'] && <p className="bk-error">{errors[prefix + 'Zip']}</p>}
        </div>
      </div>
    </>
  )

  return (
    <section className="bk-section">
      <div className="container">
        <h2 className="bk-section-title">Checkout</h2>
        <p className="bk-section-sub">
          {summary.count} {summary.count === 1 ? 'pair' : 'pairs'} ready to ship.
        </p>

        {serverError && <p className="bk-error">{serverError}</p>}

        <div className="row g-4">
          {/* ---- left column: the forms ---- */}
          <div className="col-lg-7">
            <form onSubmit={handleSubmit} noValidate>
              <div className="bk-form-card bk-card-wide mb-4">
                <h3 className="h6 mb-3">Shipping address</h3>
                {addressFields('shipping', shipping, 'ship')}
              </div>

              <div className="bk-form-card bk-card-wide mb-4">
                <h3 className="h6 mb-3">Billing address</h3>
                <div className="form-check mb-3">
                  <input
                    id="same-as-shipping"
                    className="form-check-input"
                    type="checkbox"
                    checked={sameAsShipping}
                    onChange={(e) => setSameAsShipping(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="same-as-shipping">
                    Same as shipping
                  </label>
                </div>

                {!sameAsShipping && addressFields('billing', billing, 'bill')}
              </div>

              <div className="bk-form-card bk-card-wide mb-4">
                <h3 className="h6 mb-3">Payment</h3>
                <p className="text-muted small">
                  This is a class project — nothing is charged. Only the card type and the last
                  four digits are saved with the order.
                </p>

                <label className="form-label" htmlFor="pay-type">
                  Card type
                </label>
                <select
                  id="pay-type"
                  name="cardType"
                  className="form-control"
                  value={payment.cardType}
                  onChange={(e) => handleChange('payment', e)}
                >
                  {CARD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <label className="form-label mt-3" htmlFor="pay-number">
                  Card number
                </label>
                <input
                  id="pay-number"
                  name="cardNumber"
                  className="form-control"
                  inputMode="numeric"
                  placeholder="4111 1111 1111 1111"
                  value={payment.cardNumber}
                  onChange={(e) => handleChange('payment', e)}
                />
                {errors.cardNumber && <p className="bk-error">{errors.cardNumber}</p>}

                <div className="row mt-3">
                  <div className="col-6">
                    <label className="form-label" htmlFor="pay-expiry">
                      Expiry
                    </label>
                    <input
                      id="pay-expiry"
                      name="expiry"
                      className="form-control"
                      placeholder="MM/YY"
                      value={payment.expiry}
                      onChange={(e) => handleChange('payment', e)}
                    />
                    {errors.expiry && <p className="bk-error">{errors.expiry}</p>}
                  </div>
                  <div className="col-6">
                    <label className="form-label" htmlFor="pay-cvv">
                      CVV
                    </label>
                    <input
                      id="pay-cvv"
                      name="cvv"
                      className="form-control"
                      placeholder="123"
                      value={payment.cvv}
                      onChange={(e) => handleChange('payment', e)}
                    />
                    {errors.cvv && <p className="bk-error">{errors.cvv}</p>}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-bk w-100" disabled={submitting}>
                {submitting ? 'Placing order…' : 'Place order · ' + money(summary.total)}
              </button>
            </form>
          </div>

          {/* ---- right column: what is being bought ---- */}
          <div className="col-lg-5">
            <div className="bk-form-card bk-card-wide">
              <h3 className="h6 mb-3">Order summary</h3>

              <div className="bk-cart-list">
                {summary.cart.map((line) => (
                  <div className="bk-cart-item" key={line.productId + '-' + line.size + '-' + line.color}>
                    <div>
                      <div className="bk-cart-name">{line.name}</div>
                      <div className="bk-cart-options">
                        {line.size} · {line.color} · ×{line.qty}
                      </div>
                    </div>
                    <div className="bk-cart-line-total">
                      {money(line.price * line.qty)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bk-cart-total">
                <div className="bk-cart-total-row">
                  <span>Subtotal</span>
                  <strong>{money(summary.subtotal)}</strong>
                </div>
                <div className="bk-cart-total-row">
                  <span>Tax ({Math.round(summary.taxRate * 10000) / 100}%)</span>
                  <strong>{money(summary.tax)}</strong>
                </div>
                <div className="bk-cart-total-row">
                  <span>Shipping</span>
                  <strong>{summary.shippingCost === 0 ? 'Free' : money(summary.shippingCost)}</strong>
                </div>
                <div className="bk-cart-total-row">
                  <span>Total</span>
                  <strong>{money(summary.total)}</strong>
                </div>
              </div>

              <button className="btn btn-bk-outline w-100 mt-3" onClick={() => setView('cart')}>
                Back to cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CheckoutView
