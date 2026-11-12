import { useParams, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { posts } from "./posts"
import Navbar from "../navbar/Navbar"
import Footer from "../footer/Footer"
import { useState } from "react"
import { subscribeToNewsletter, isValidEmail } from "../lib/newsletter"
import { IMAGE_DIMS } from "./image-dims"

// Render markdown images with explicit width/height (from the build-time
// dimension map) so the browser reserves space and the page doesn't jump as
// images load, plus lazy/async loading to keep the initial render light.
const mdComponents = {
  img({ node, src = "", alt = "", ...props }) {
    const dims = IMAGE_DIMS[src]
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={dims && dims[0]}
        height={dims && dims[1]}
        style={{ height: "auto", maxWidth: "100%" }}
        {...props}
      />
    )
  },
}

const Subscribe = () => {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | success | error

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setStatus("error")
      return
    }

    const result = await subscribeToNewsletter(email, { tags: "blog" })
    setStatus(result.ok ? "success" : "error")
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
          ✓ You're in! Thanks for subscribing.
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

// A gated download: the reader gets the PDF in exchange for an email, which
// joins the newsletter (double opt-in, same as the plain Subscribe box). The
// in-article "download" links point at this box's id, so the one on the page
// is the only way to the file — that is the whole point of a lead magnet.
//
// Email gate: the download is revealed once a valid email is submitted, not
// before — so the PDF stays behind the signup, which is what the offer
// promises. Delivery is decoupled from the mailing-list API: the signup fires
// in the background, but a reader who gave a valid email always gets the file,
// even if that API is slow or temporarily rejecting (e.g. sender-domain
// verification still pending). The alternative — gating on the API's success —
// silently withholds the promised guide whenever the API hiccups.
const LeadMagnet = ({ file, tag = "guide", title, blurb }) => {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | loading | success | error
  const [msg, setMsg] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setStatus("error")
      setMsg("Please enter a valid email address.")
      return
    }
    // Reveal the promised guide the instant a valid email is submitted. The
    // download must not hinge on the mailing-list API's round-trip, which can
    // be slow, rate-limited, or (while the sender domain is being verified)
    // reject the request — a reader who typed their email has done their part
    // and should get the file. The signup still fires in the background so the
    // address is added to the list whenever the API accepts it.
    setStatus("success")
    subscribeToNewsletter(email, { tags: tag }).catch(() => {})
  }

  const DownloadButton = () => (
    <a
      href={file}
      download
      className="inline-flex items-center gap-2 bg-orange-400 hover:bg-orange-300 text-black font-bold text-sm px-6 py-3 rounded-lg transition-colors"
    >
      Download the PDF →
    </a>
  )

  return (
    <div
      id="get-the-guide"
      className="scroll-mt-24 mt-16 border border-orange-400/25 rounded-xl p-8 bg-orange-400/[0.06]"
    >
      <p className="text-orange-400 text-xs font-semibold tracking-widest uppercase mb-3">
        Free PDF
      </p>
      <h3 className="text-2xl font-bold text-white mb-2">
        {title || "Get the Beginner’s Guide"}
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        {blurb ||
          "The whole guide — the 30-day plan, the key-shortcut tables and the troubleshooting index — formatted to print or keep on a second screen. Enter your email and it’s yours, along with the occasional short Blender tip. No spam, unsubscribe any time."}
      </p>

      {status === "success" ? (
        <div>
          <div className="bg-green-500/10 border border-green-500/25 rounded-lg px-4 py-3 text-green-400 text-sm mb-4">
            ✓ Your guide is ready — grab it below. We&rsquo;ll send the
            occasional short Blender tip, too.
          </div>
          <DownloadButton />
          <p className="text-gray-400 text-xs mt-3">
            Thanks for subscribing! If the download doesn&rsquo;t start, click
            the button above. Keep an eye on your inbox for the occasional short
            Blender tip.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status === "error") setStatus("idle")
            }}
            placeholder="your@email.com"
            className={`flex-1 min-w-[200px] bg-black border rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-colors ${
              status === "error"
                ? "border-red-500"
                : "border-white/10 focus:border-orange-400"
            }`}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-orange-400 hover:bg-orange-300 disabled:opacity-60 text-black font-bold text-sm px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            {status === "loading" ? "Sending…" : "Email me the guide"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="text-red-400 text-xs mt-3">{msg}</p>
      )}
    </div>
  )
}

// Picks the next few posts in order, wrapping around. Deterministic, so the
// link graph is stable between builds, and because every post is somebody's
// neighbour it guarantees each one is both linked from and linking to others
// — most posts previously ended with no onward link at all, which leaves
// readers at a dead end and gives search engines nothing to follow.
function relatedTo(post, count = 3) {
  const i = posts.findIndex((p) => p.slug === post.slug)
  return Array.from({ length: Math.min(count, posts.length - 1) }, (_, n) =>
    posts[(i + n + 1) % posts.length]
  )
}

const RelatedPosts = ({ post }) => {
  const related = relatedTo(post)
  if (!related.length) return null

  return (
    <nav aria-label="More articles" className="mt-16 pt-10 border-t border-white/10">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-orange-400 mb-5">
        Read next
      </h2>
      <ul className="space-y-4">
        {related.map((p) => (
          <li key={p.slug}>
            <Link
              to={`/blog/${p.slug}`}
              className="group flex flex-col gap-1 rounded-lg -mx-3 px-3 py-2 transition hover:bg-white/5"
            >
              <span className="font-semibold text-white group-hover:text-orange-400 transition">
                {p.title}
              </span>
              <span className="text-sm text-gray-400 line-clamp-2">
                {p.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Google truncates around 60 characters. Several post titles are long enough
// that appending the brand pushed them past it, so the headline itself got
// cut in the results — the worst possible thing to lose. The suffix is good
// for recognition but it is the expendable half, so it is only added when it
// fits.
const MAX_TITLE = 60
const SUFFIX = " \u2013 Blender Tutoring"

function titleFor(post) {
  const withBrand = post.title + SUFFIX
  return withBrand.length <= MAX_TITLE ? withBrand : post.title
}

const BlogPost = () => {
  const { slug } = useParams()
  const post = posts.find((p) => p.slug === slug)

  if (!post) return <div className="text-white p-10">Post not found.</div>

  const pageTitle = titleFor(post)
  const url = `https://www.blendertutoring.com/blog/${post.slug}`
  // Breadcrumbs let Google show "blendertutoring.com > Blog > <post>" in the
  // result instead of a bare URL, which reads as a real section of a site
  // rather than a loose page.
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.blendertutoring.com/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.blendertutoring.com/blog" },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": url },
    ],
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.description,
    "datePublished": post.date,
    "url": url,
    "image": post.thumbnail ? `https://www.blendertutoring.com${post.thumbnail}` : "https://www.blendertutoring.com/og-image.jpg",
    "author": { "@type": "Organization", "name": "Blender Tutoring" },
    "publisher": { "@type": "Organization", "name": "Blender Tutoring", "url": "https://www.blendertutoring.com" }
  }

  return (
    <div className="relative w-full min-h-screen bg-black">
      <Helmet>
        {/* Must be a single child — an expression plus adjacent text
            makes react-helmet-async emit an empty <title>. */}
        <title>{pageTitle}</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={post.thumbnail ? `https://www.blendertutoring.com${post.thumbnail}` : "https://www.blendertutoring.com/og-image.jpg"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbs)}</script>
      </Helmet>
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-24 text-white">
        <Link to="/blog" className="text-orange-400 hover:underline text-sm mb-8 block">
          ← Back to Blog
        </Link>
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <p className="text-gray-400 text-sm mb-10">{post.date}</p>
        <div className="prose prose-invert prose-orange max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:text-orange-400 prose-blockquote:border-orange-400 prose-blockquote:bg-orange-400/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-table:text-sm prose-td:border-white/10 prose-th:border-white/10 prose-hr:border-white/10">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{post.content}</ReactMarkdown>
        </div>
        {/* The lead-magnet box doubles as the newsletter signup for posts
            that have a downloadable, so those posts show it in place of the
            generic Subscribe rather than two competing asks. */}
        {post.leadMagnet && (
          <LeadMagnet
            file={post.leadMagnet.file}
            tag={post.leadMagnet.tag}
            title={post.leadMagnet.title}
            blurb={post.leadMagnet.blurb}
          />
        )}
        <RelatedPosts post={post} />
        {!post.leadMagnet && <Subscribe />}
      </div>
      <Footer />
    </div>
  )
}

export default BlogPost
