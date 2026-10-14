import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Download, LockKeyhole, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Gen Earn Hub — Practical Digital Income Tools" },
    { name: "description", content: "Affordable digital kits and planners for launching and growing an online income stream." },
    { property: "og:title", content: "Gen Earn Hub" },
    { property: "og:description", content: "Practical digital income tools. Buy once and keep access in your member vault." },
  ] }), component: Home,
});

const products = [
  { slug: "ai-side-hustle-kit-2026", name: "AI Side Hustle Kit 2026", price: "A$19", featured: true, description: "A practical starter system for choosing, validating and launching an AI-assisted side hustle.", features: ["Step-by-step launch framework", "AI prompts and idea filters", "Simple action plan"] },
  { slug: "creator-blueprint", name: "Creator Blueprint", price: "A$12", description: "A straightforward content and monetisation blueprint for new digital creators.", features: ["Content planning prompts", "Offer-building framework", "Repeatable creator workflow"] },
  { slug: "digital-income-planner", name: "Digital Income Planner", price: "A$9", description: "Plan products, launches, content and revenue goals in one focused system.", features: ["Income goal planner", "Launch and content pages", "Progress tracking"] },
];

function Home() { return <div className="min-h-screen bg-[#fffaf7] text-[#241b1a]">
  <header className="sticky top-0 z-30 border-b border-[#eadfd9] bg-[#fffaf7]/90 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
    <Link to="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#241b1a] text-white"><Sparkles className="h-5 w-5" /></div><div><div className="font-serif font-black">Gen Earn Hub</div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b66f5a]">Digital income vault</div></div></Link>
    <div className="flex items-center gap-2"><Link to="/auth" search={{ next: "/dashboard" }} className="rounded-full px-4 py-2 text-sm font-bold text-[#806e67]">Member login</Link><a href="#products" className="rounded-full bg-[#241b1a] px-4 py-2 text-sm font-bold text-white">Explore tools</a></div>
  </div></header>
  <main><section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-20 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:pt-28"><div>
    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dca895]/40 bg-[#f8e8e1] px-3 py-1.5 text-xs font-bold text-[#9a5947]"><Sparkles className="h-3.5 w-3.5" /> Small tools. Clear next steps. Real momentum.</div>
    <h1 className="max-w-4xl font-serif text-5xl font-black leading-[.98] tracking-[-.045em] sm:text-7xl">Turn an idea into a <span className="text-[#b66f5a]">digital income plan.</span></h1>
    <p className="mt-6 max-w-2xl text-base leading-7 text-[#806e67] sm:text-lg">Practical, affordable guides for people who want to launch a side hustle, build creator income or organise their next digital product—without the overwhelm.</p>
    <div className="mt-8 flex flex-wrap gap-3"><a href="#products" className="inline-flex items-center gap-2 rounded-full bg-[#241b1a] px-5 py-3 text-sm font-black text-white">Choose your toolkit <ArrowRight className="h-4 w-4" /></a><Link to="/auth" search={{ next: "/dashboard" }} className="inline-flex items-center gap-2 rounded-full border border-[#d9cbc5] bg-white px-5 py-3 text-sm font-bold"><LockKeyhole className="h-4 w-4" /> Open member vault</Link></div>
  </div><div className="rounded-[2rem] border border-[#eadfd9] bg-white p-7 shadow-2xl shadow-[#b66f5a]/10 sm:p-9"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1ddd5] text-[#9a5947]"><Download className="h-6 w-6" /></div><h2 className="font-serif text-2xl font-black">Buy once. Keep your access.</h2><div className="mt-6 space-y-4">{["Secure PayPal-hosted checkout", "Downloads tied to your account", "Simple one-time pricing", "Immediate access after verified payment"].map(item => <div key={item} className="flex gap-3 text-sm leading-6 text-[#806e67]"><Check className="mt-1 h-4 w-4 shrink-0 text-[#b66f5a]" />{item}</div>)}</div></div></section>
    <section id="products" className="border-y border-[#eadfd9] bg-white"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="mx-auto max-w-2xl text-center"><div className="text-xs font-black uppercase tracking-[.2em] text-[#b66f5a]">The digital vault</div><h2 className="mt-3 font-serif text-4xl font-black tracking-tight sm:text-5xl">Pick the tool that gets you moving</h2><p className="mt-4 text-[#806e67]">One-time AUD pricing. No subscription.</p></div><div className="mt-10 grid gap-5 lg:grid-cols-3">{products.map(product => <article key={product.slug} className={`relative flex flex-col rounded-[2rem] border p-6 ${product.featured ? "border-[#b66f5a] bg-[#fff7f3] shadow-xl shadow-[#b66f5a]/10" : "border-[#eadfd9] bg-white"}`}>{product.featured && <span className="absolute right-5 top-5 rounded-full bg-[#241b1a] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Best place to start</span>}<h3 className="pr-28 font-serif text-xl font-black">{product.name}</h3><div className="mt-5 text-4xl font-black">{product.price}</div><p className="mt-3 min-h-16 text-sm leading-6 text-[#806e67]">{product.description}</p><div className="mt-5 space-y-3">{product.features.map(feature => <div key={feature} className="flex gap-2 text-sm text-[#5f504b]"><Check className="h-4 w-4 shrink-0 text-[#b66f5a]" />{feature}</div>)}</div><Link to="/checkout" search={{ product: product.slug }} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#241b1a] px-5 py-3 text-sm font-black text-white">Get access <ArrowRight className="h-4 w-4" /></Link></article>)}</div></div></section>
  </main><footer><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-[#9a8a84] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© 2026 Gen Earn Hub</span><span>Secure checkout · Account-based access · Digital downloads</span></div></footer>
</div>; }
