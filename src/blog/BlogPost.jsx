import { useParams, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { posts } from "./posts"
import Navbar from "../navbar/Navbar"
import { useState } from "react"

const Subscribe = () => {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | success | error

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !email.includes("@")) {
      setStatus("error")
      return
    }

    // Mailchimp JSONP submission (bypasses CORS)
    const MAILCHIMP_URL = "https://blendertutoring.us8.list-manage.com/subscribe/post-json?u=448c4c0d61ffab1851464e145&id=fcb87c912d&f_id=00e218e1f0"
    const url = `${MAILCHIMP_URL}&EMAIL=${encodeURIComponent(email)}&c=mailchimpCallback`

    window.mailchimpCallback = (data) => {
      if (data.result === "success") {
        setStatus("success")
      } else {
        // Already subscribed is still a win
        if (data.msg && data.msg.includes("already subscribed")) {
          setStatus("success")
        } else {
          setStatus("error")
        }
      }
      delete window.mailchimpCallback
      document.getElementById("mc-jsonp")?.remove()
    }

    const script = document.createElement("script")
    script.id = "mc-jsonp"
    script.src = url
    document.body.appendChild(script)
  }

  return (
    <div className="mt-16 border border-orange-400/20 rounded-xl p-8 bg-orange-400/5">
      <p className="text-orange-400 text-xs font-semibold tracking-widest uppercase mb-3">
        Newsletter
      </p>
      <h3 className="text-2xl font-bold text-white mb-2">
        Get more tips like this
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Short, practical Blender guides for beginners — straight to your inbox.
        No spam. Unsubscribe any time.
      </p>

      {status === "success" ? (
        <div className="bg-green-500/10 border border-green-500/25 rounded-lg px-4 py-3 text-green-400 text-sm">
          ✓ You're in! Check your inbox for a confirmation email.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle") }}
            placeholder="your@email.com"
            className={`flex-1 min-w-[200px] bg-black border rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-colors
              ${status === "error" ? "border-red-500" : "border-white/10 focus:border-orange-400"}`}
          />
          <button
            type="submit"
            className="bg-orange-400 hover:bg-orange-300 text-black font-bold text-sm px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Subscribe
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="text-red-400 text-xs mt-2">Please enter a valid email address.</p>
      )}
    </div>
  )
}

const BlogPost = () => {
  const { slug } = useParams()
  const post = posts.find((p) => p.slug === slug)

  if (!post) return <div className="text-white p-10">Post not found.</div>

  const url = `https://www.blendertutoring.com/blog/${post.slug}`
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.description,
    "datePublished": post.date,
    "url": url,
    "image": post.thumbnail ? `https://www.blendertutoring.com${post.thumbnail}` : "https://www.blendertutoring.com/og-image.png",
    "author": { "@type": "Organization", "name": "BlenderTutor" },
    "publisher": { "@type": "Organization", "name": "BlenderTutor", "url": "https://www.blendertutoring.com" }
  }

  return (
    <div className="relative w-full min-h-screen bg-black">
      <Helmet>
        <title>{post.title} – BlenderTutor</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={post.thumbnail ? `https://www.blendertutoring.com${post.thumbnail}` : "https://www.blendertutoring.com/og-image.png"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-24 text-white">
        <Link to="/blog" className="text-orange-400 hover:underline text-sm mb-8 block">
          ← Back to Blog
        </Link>
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <p className="text-gray-400 text-sm mb-10">{post.date}</p>
        <div className="prose prose-invert prose-orange max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:text-orange-400 prose-blockquote:border-orange-400 prose-blockquote:bg-orange-400/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-table:text-sm prose-td:border-white/10 prose-th:border-white/10 prose-hr:border-white/10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
        <Subscribe />
      </div>
    </div>
  )
}

export default BlogPost
