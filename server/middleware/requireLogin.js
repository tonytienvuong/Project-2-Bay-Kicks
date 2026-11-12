/* requireLogin.js — middleware that blocks a route until someone is signed in.

   Applied to the routes that need a known user: the account page and checkout.
   The Express session is where login lives (req.session.user, set by
   accountController.login), so this is a three-line guard rather than a token
   check of any kind.
*/

module.exports = function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Please log in first.' })
  }
  next()
}
