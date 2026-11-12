/* NavBar.jsx — the navigation bar that sits at the top of every view.

   Props (values passed in from App):
     view       which screen is currently showing, so the right link is highlighted
     setView    the function that switches screens when a link is clicked
     cartCount  how many items are in the cart, shown live in the Cart link

   The important Bootstrap class is 'navbar-expand-lg': on wide screens the links
   sit in a row, and below that breakpoint they collapse behind the hamburger
   button. That horizontal-to-vertical change is the navigation behaviour the
   mobile-ready rubric asks for. */

function NavBar({ view, setView, cartCount }) {
  return (
    <nav className="navbar navbar-expand-lg bk-navbar sticky-top">
      <div className="container">
        <button
          className="navbar-brand btn btn-link text-decoration-none"
          onClick={() => setView('home')}
        >
          BAY KICKS
        </button>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#bkMainNav"
          aria-controls="bkMainNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="bkMainNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <button
                className={'nav-link btn btn-link' + (view === 'home' ? ' active' : '')}
                onClick={() => setView('home')}
              >
                Home
              </button>
            </li>
            <li className="nav-item">
              <button
                className={'nav-link btn btn-link' + (view === 'shop' ? ' active' : '')}
                onClick={() => setView('shop')}
              >
                Shop
              </button>
            </li>
            <li className="nav-item">
              <button
                className={'nav-link btn btn-link' + (view === 'account' ? ' active' : '')}
                onClick={() => setView('account')}
              >
                Account
              </button>
            </li>
            <li className="nav-item">
              <button
                className="nav-link btn btn-link bk-cart-link"
                onClick={() => setView('cart')}
              >
                Cart ({cartCount})
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default NavBar
