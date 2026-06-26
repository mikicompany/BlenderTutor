import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Home from './home/Home'
import BlogList from './blog/BlogList'
import BlogPost from './blog/BlogPost'
import Radar from './radar/Radar'

const App = () => {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/radar" element={<Radar />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  )
}

export default App