import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Home from './home/Home'
import BlogList from './blog/BlogList'
import BlogPost from './blog/BlogPost'
import Radar from './radar/Radar'
import Terms from './terms/Terms'
import Privacy from './privacy/Privacy'
import Pay from './pay/Pay'
import StartHere from './start/StartHere'
import ShareButton from './share/ShareButton'
import ExitOffer from './components/ExitOffer'
import { useBookingTracking } from './booking/useBookingTracking'

// Without this, navigating via links at the bottom of a page (e.g. the
// footer) keeps the scroll position and lands visitors at the bottom of
// the next page.
const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const App = () => {
  // Delegated, so it covers every booking link on every route at once.
  useBookingTracking()

  return (
    <HelmetProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/radar" element={<Radar />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/start" element={<StartHere />} />
          {/* Not linked from anywhere on the site — it is sent directly to
              the person paying. See src/lib/payments.js. */}
          <Route path="/pay" element={<Pay />} />
        </Routes>
        {/* Outside Routes so it is present on every page, including The Radar,
            which does not use the site navbar. */}
        <ShareButton />
        {/* Site-wide exit-intent lead capture. Lives inside the Router so it
            can read the route and skip transactional / utility pages. */}
        <ExitOffer />
      </BrowserRouter>
    </HelmetProvider>
  )
}

export default App