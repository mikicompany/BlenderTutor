import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './home/Home'
import BlogList from './blog/BlogList'
import BlogPost from './blog/BlogPost'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App