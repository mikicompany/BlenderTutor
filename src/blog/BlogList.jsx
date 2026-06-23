import { Link } from "react-router-dom"
import { posts } from "./posts"
import Navbar from "../navbar/Navbar"

const BlogList = () => {
  return (
    <div className="relative w-full min-h-screen bg-black">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-24 text-white">
        <h1 className="text-4xl font-bold mb-10">Blog</h1>
        {posts.map((post) => (
          <Link
            to={`/blog/${post.slug}`}
            key={post.slug}
            className="group flex gap-5 mb-8 rounded-xl border border-white/10 p-4 transition hover:border-orange-400/40 hover:bg-white/5"
          >
            {post.thumbnail && (
              <img
                src={post.thumbnail}
                alt=""
                className="h-24 w-32 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold transition group-hover:text-orange-400">
                {post.title}
              </h2>
              <p className="mt-1 text-sm text-gray-400">{post.date}</p>
              <p className="mt-2 text-gray-300">{post.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default BlogList