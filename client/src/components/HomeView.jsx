/* HomeView.jsx — the entrance to the site.

   A centred hero: the button sits at the top middle, then the eyebrow line, the
   headline and a short description of the store.

   Prop: setView — called with 'shop' when the button is clicked. */

function HomeView({ setView }) {
  return (
    <section className="bk-hero">
      <div className="container text-center">
        <button
          className="btn btn-bk btn-lg bk-hero-cta"
          onClick={() => setView('shop')}
        >
          Shop the collection
        </button>

        <p className="bk-eyebrow">Oakland inspired · Everyday style</p>
        <h1>Step into Bay Kicks.</h1>
        <p className="bk-hero-copy">
          A fictional sneaker shop carrying 25 pairs built for real life — trail days,
          skate sessions, long walks and fast miles. Pick a size, pick a color, build your
          cart.
        </p>

        <img
          className="bk-hero-img"
          src="./images/shoe-11.jpg"
          alt="Dolores Skate — from the Bay Kicks collection"
        />
      </div>
    </section>
  )
}

export default HomeView
