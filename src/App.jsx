import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Home from './home/Home'
import BlogList from './blog/BlogList'
import BlogPost from './blog/BlogPost'
import Radar from './radar/Radar'
import Terms from './terms/Terms'

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
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  )
}

export default App