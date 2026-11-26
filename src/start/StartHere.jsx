import React from "react"
import { Helmet } from "react-helmet-async"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import Navbar from "../navbar/Navbar"
import Footer from "../footer/Footer"
import { posts } from "../blog/posts"
import { BOOKING_URL, BOOKING_LABEL } from "../lib/links"

// Pillar / hub page: organises the blog into a single learning path. It links
// the key articles into a topic cluster — good for readers (a clear route
// through 50+ posts) and for search (a strong internal-linking hub that points
// authority at the cornerstone posts).
const TITLES = Object.fromEntries(posts.map((p) => [p.slug, p.title]))

const PATH = [
  {
    stage: "1 · Before you start",
    blurb: "Set expectations, learn the right way, and escape tutorial hell early.",
    slugs: [
      "how-long-to-learn-blender",
      "blender-for-beginners",
      "best-free-blender-tutorials",
      "life-beyond-the-donut",
      "blender-keyboard-shortcuts-beginners",
    ],
  },
  {
    stage: "2 · Modeling foundations",
    blurb: "The core skill everything else sits on — from first primitives to hard-surface.",
    slugs: [
      "low-poly-modeling-blender",
      "hard-surface-modeling-blender",
      "blender-mirror-modifier",
      "best-blender-modeling-addons-for-beginners",
    ],
  },
  {
    stage: "3 · Topology — the make-or-break",
    blurb: "Where most beginners quietly go wrong. Get this right and everything downstream is easier.",
    slugs: [
      "quads-vs-triangles-blender",
      "good-vs-bad-topology",
      "blender-subdivision-support-loops",
      "blender-booleans-topology",
      "blender-retopology",
    ],
  },
  {
    stage: "4 · UVs & texturing",
    blurb: "Turn a grey model into a finished asset — unwrapping, texel density, trim sheets and materials.",
    slugs: [
      "uv-unwrapping-blender-beginners",
      "texel-density-blender",
      "trim-sheets-in-blender",
      "ucupaint-texture-painting",
      "blender-materials-look-like-plastic",
      "blender-texture-not-showing",
    ],
  },
  {
    stage: "5 · Lighting & rendering",
    blurb: "Make it look good — the two engines, flat renders, noise, and tricky materials.",
    slugs: [
      "cycles-vs-eevee",
      "blender-render-looks-flat",
      "blender-render-noisy-fix",
      "how-to-make-glass-blender",
      "how-to-make-water-blender",
      "dlss-in-blender",
    ],
  },
  {
    stage: "6 · Baking & the game pipeline",
    blurb: "The jump from pretty renders to engine-ready assets that ship.",
    slugs: [
      "blender-normal-map-baking",
      "blender-to-unity-export",
      "blender-fbx-export-scale-rotation",
      "blender-and-unreal-the-happy-couple",
      "game-art-portfolio-what-studios-want",
    ],
  },
  {
    stage: "7 · Engines, tools & what's new",
    blurb: "Choosing an engine, geometry nodes, AI tooling, and keeping current with Blender.",
    slugs: [
      "godot-vs-unity",
      "godot-vs-unreal",
      "blender-geometry-nodes-explained",
      "whats-new-blender-5-3",
      "blender-5-features",
    ],
  },
  {
    stage: "8 · When something breaks",
    blurb: "The fixes you'll reach for — slow viewports, shading artifacts, bad rig deformation.",
    slugs: [
      "blender-running-slow",
      "blender-shading-artifacts",
      "blender-rig-deforms-badly",
    ],
  },
]

const SITE = "https://www.blendertutoring.com"

const StartHere = () => {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Learn Blender for Game Art — Start Here",
    itemListElement: PATH.flatMap((s) => s.slugs)
      .filter((slug) => TITLES[slug])
      .map((slug, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}/blog/${slug}`,
        name: TITLES[slug],
      })),
  }

  return (
    <div className="relative w-full bg-[#0f1011] min-h-screen text-white">
      <Helmet>
        <title>Learn Blender for Game Art: Start Here — Blender Tutoring</title>
        <meta
          name="description"
          content="A clear, ordered path through learning Blender for game art — from first steps and modeling to topology, UVs, rendering and engine-ready export. Curated free guides from a senior game artist."
        />
        <link rel="canonical" href={`${SITE}/start`} />
        <meta property="og:title" content="Learn Blender for Game Art: Start Here" />
        <meta property="og:description" content="The ordered path through Blender for game art — modeling, topology, UVs, rendering, and shipping to engines." />
        <meta property="og:url" content={`${SITE}/start`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify(itemList)}</script>
      </Helmet>

      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        <p className="uppercase tracking-[0.2em] text-[11px] font-bold text-orange-500 mb-4">
          Start here
        </p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
          Learn Blender for{" "}
          <span className="text-orange-500">game art</span>, in order
        </h1>
        <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-2xl mb-6">
          There are 50+ free guides on this site. This page puts them in the
          order a game artist actually needs them — a clear path from your first
          cube to engine-ready assets. Work down it, or jump to the stage you're
          stuck on.
        </p>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 text-[15px] font-bold text-black rounded-xl bg-orange-500 hover:shadow-[0_0_20px_rgba(255,165,0,0.4)] transition-all mb-14"
        >
          {BOOKING_LABEL} <ArrowRight size={18} />
        </a>

        <div className="space-y-12">
          {PATH.map((group) => {
            const items = group.slugs.filter((slug) => TITLES[slug])
            if (!items.length) return null
            return (
              <section key={group.stage}>
                <h2 className="text-xl md:text-2xl font-bold mb-1">{group.stage}</h2>
                <p className="text-gray-500 text-sm mb-4">{group.blurb}</p>
                <ul className="space-y-2">
                  {items.map((slug) => (
                    <li key={slug}>
                      <Link
                        to={`/blog/${slug}`}
                        className="group flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-orange-500/50 hover:bg-white/[0.05]"
                      >
                        <span className="text-orange-500/70 group-hover:text-orange-400 mt-0.5">→</span>
                        <span className="text-[15px] text-gray-200 group-hover:text-white">
                          {TITLES[slug]}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        <div className="mt-16 border border-orange-400/25 rounded-xl p-8 bg-orange-400/[0.06] text-center">
          <h3 className="text-2xl font-bold mb-2">Want a shortcut through all of this?</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xl mx-auto">
            Reading is great. A senior game artist watching your screen and
            fixing the exact thing you're stuck on is faster. First call is free.
          </p>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-bold text-black rounded-xl bg-orange-500 hover:shadow-[0_0_20px_rgba(255,165,0,0.5)] transition-all"
          >
            {BOOKING_LABEL} <ArrowRight size={18} />
          </a>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default StartHere
