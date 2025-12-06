# Rendering Strategies: Static, SSR, CSR, ISR, and PPR

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Status:** Active

## Quick Navigation

- [1. Overview](#1-overview)
- [2. Core Concepts](#2-core-concepts)
- [3. Static Generation (SSG)](#3-static-generation-ssg)
- [4. Server-Side Rendering (SSR)](#4-server-side-rendering-ssr)
- [5. Client-Side Rendering (CSR)](#5-client-side-rendering-csr)
- [6. Incremental Static Regeneration (ISR)](#6-incremental-static-regeneration-isr)
- [7. Partial Pre-Rendering (PPR)](#7-partial-pre-rendering-ppr)
- [8. Comparison Matrix](#8-comparison-matrix)
- [9. Real-World Examples](#9-real-world-examples)
- [10. Decision Guide](#10-decision-guide)

---

## 1. Overview

Rendering strategy determines **when and where** your HTML is generated:

- **Build time?** (Static)
- **Request time on server?** (SSR)
- **Request time in browser?** (CSR)
- **Hybrid?** (ISR, PPR)

Each has trade-offs in **performance, cost, scalability, and freshness**. This guide helps you
choose the right approach.

---

## 2. Core Concepts

### Server vs. Client Components

**Server Component (default in Next.js):**

```tsx
// Runs ONLY on server (build or request time)
// Cannot use: useState, useEffect, useSearchParams, event handlers
// CAN use: databases, APIs, secrets

export default async function Dashboard() {
  const data = await db.query(); // Direct DB access
  return <div>{data.title}</div>;
}
```

**Client Component (`'use client'`):**

```tsx
// Runs in the BROWSER
// CAN use: useState, useEffect, useSearchParams, onClick handlers
// CANNOT use: direct database access, secrets

'use client';
import { useSearchParams } from 'next/navigation';

export function SearchBar() {
  const params = useSearchParams();
  return <input defaultValue={params.get('q')} />;
}
```

### Key Terms

| Term           | Meaning                                      | Example                                     |
| -------------- | -------------------------------------------- | ------------------------------------------- |
| **TTFB**       | Time to First Byte                           | How long before browser gets first response |
| **FCP**        | First Contentful Paint                       | When user sees something on screen          |
| **Hydration**  | React attaching interactivity to static HTML | Button becomes clickable                    |
| **Cache**      | Storing HTML/data to avoid re-computation    | CDN caching static pages                    |
| **Revalidate** | Refreshing cached content                    | ISR regenerating every 60s                  |

---

## 3. Static Generation (SSG)

**HTML is generated once at build time and served from cache.**

### How It Works

```
$ npm run build
  ↓
Next.js renders all pages to static HTML files
  ↓
Files deployed to CDN (or server)
  ↓
User requests page → CDN returns cached HTML (instant)
```

### Code Example

```tsx
// pages/blog/[slug].tsx
// Generates static pages for all blog posts at build time

export async function generateStaticParams() {
  const posts = await db.posts.all();
  return posts.map((post) => ({ slug: post.slug }));
  // Returns: [{ slug: 'hello-world' }, { slug: 'next-js-tips' }]
}

export const metadata = {
  title: 'Blog Post',
};

export default async function BlogPost({ params }) {
  const post = await db.posts.get(params.slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

**At build time:** Next.js calls `generateStaticParams()`, runs the component for each slug, and
saves as static HTML.

### Pros & Cons

| Pros                      | Cons                                        |
| ------------------------- | ------------------------------------------- |
| ✅ Instant response (CDN) | ❌ Can't update without rebuild             |
| ✅ No server costs        | ❌ Can't personalize per user               |
| ✅ Best SEO               | ❌ Not suitable for real-time data          |
| ✅ Best Lighthouse scores | ❌ Long build times with thousands of pages |

### When to Use

- ✅ Marketing sites (landing pages, pricing, about)
- ✅ Blog posts, documentation
- ✅ E-commerce product pages (thousands of SKUs)
- ✅ Any content that doesn't change frequently
- ❌ Don't use for user-specific or real-time data

---

## 4. Server-Side Rendering (SSR)

**HTML is generated on the server for every request.**

### How It Works

```
User visits: https://mysite.com/?src=upwork
  ↓
Server receives request + params
  ↓
Server queries database based on params
  ↓
Server renders HTML with personalized content
  ↓
HTML sent to browser
  ↓
Browser displays content + hydrates JS
```

### Code Example

```tsx
// Force-dynamic tells Next.js to render this page on every request
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await getUser(); // Fetched on every request
  const recommendations = await getRecommendations(user.id);

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <RecommendationList items={recommendations} />
    </div>
  );
}
```

**Every request:**

1. User visits page
2. Server runs the async function
3. Database query executes
4. HTML renders
5. Response sent to browser

### Pros & Cons

| Pros                             | Cons                              |
| -------------------------------- | --------------------------------- |
| ✅ Always fresh data             | ❌ Slow response time (~500ms+)   |
| ✅ Personalization per user      | ❌ High server load               |
| ✅ Real-time data                | ❌ Doesn't scale cheaply          |
| ✅ Simple (render what you need) | ❌ Requires server infrastructure |

### When to Use

- ✅ **Logged-in user content** (dashboard, profile, settings)
- ✅ **Real-time data** (stock prices, live availability)
- ✅ **Personalized per user** (recommendations, preferences)
- ✅ **Request-dependent logic** (geolocation, A/B testing)
- ❌ Don't use for static marketing pages (wasteful)
- ❌ Don't use at massive scale (expensive)

### Real-World Example: Airbnb

```tsx
export const dynamic = 'force-dynamic';

export default async function SearchResults({ searchParams }) {
  // On every request, query availability for these dates
  const apartments = await db.apartments.search({
    city: searchParams.city,
    checkIn: new Date(searchParams.checkIn),
    checkOut: new Date(searchParams.checkOut),
  });

  return (
    <div>
      <SearchHeader /> {/* Could be static, but renders with SSR */}
      <ApartmentGrid apartments={apartments} />
    </div>
  );
}
```

**Issue:** Every search request requires database query + rendering. Gets expensive at scale.

---

## 5. Client-Side Rendering (CSR)

**Browser downloads JavaScript and renders HTML in the client.**

### How It Works

```
User visits: https://mysite.com
  ↓
Server sends minimal HTML + large JS bundle
  ↓
Browser downloads JS (2-3 seconds on slow network)
  ↓
Browser executes JS
  ↓
Components render in browser
  ↓
(Optionally) JS fetches data from API
```

### Code Example: Naive CSR

```tsx
'use client';
import { useEffect, useState } from 'react';

export function ApartmentList() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch on client
    fetch('/api/apartments?city=SF')
      .then((r) => r.json())
      .then((data) => {
        setApartments(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  return apartments.map((apt) => <ApartmentCard key={apt.id} {...apt} />);
}
```

### Code Example: CSR with Suspense Fallback (Better)

```tsx
import { useEffect, useState } from 'react';

// page.tsx - STATIC, server component
export default function SearchPage() {
  return (
    <div>
      <StaticHeader />
      <StaticFilters />

      {/* Suspense wraps client component */}
      <Suspense fallback={<ApartmentSkeleton />}>
        <ApartmentListClient />
      </Suspense>

      <StaticFooter />
    </div>
  );
}

// components/ApartmentListClient.tsx - CLIENT component
('use client');

export function ApartmentListClient() {
  const [apartments, setApartments] = useState([]);

  useEffect(() => {
    fetch('/api/apartments')
      .then((r) => r.json())
      .then(setApartments);
  }, []);

  return apartments.map((apt) => <ApartmentCard key={apt.id} {...apt} />);
}
```

### Pros & Cons

| Pros                             | Cons                               |
| -------------------------------- | ---------------------------------- |
| ✅ Zero server rendering cost    | ❌ Slow first paint (~3-5 seconds) |
| ✅ Scales infinitely             | ❌ Large JS bundle                 |
| ✅ Real-time data                | ❌ Bad for SEO (JS-dependent)      |
| ✅ Great for apps (Gmail, Figma) | ❌ Not ideal for mobile networks   |

### When to Use

- ✅ **Apps** (Gmail, Slack, Figma)
- ✅ **Real-time dashboards** with high frequency updates
- ✅ **Interactive UIs** with lots of state
- ✅ **Mobile apps** (they're inherently CSR)
- ❌ Don't use for SEO-critical pages
- ❌ Don't use on slow networks (mobile in developing countries)

### LaunchQuay Example: Referral Button

```tsx
import { useSearchParams } from 'next/navigation';

// Layout.tsx - STATIC (no 'use client')
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ContactButton />}>
      <CaseStudyCTA />
    </Suspense>
  );
}

// CaseStudyCTA.tsx - CLIENT component
('use client');

export function CaseStudyCTA() {
  const searchParams = useSearchParams();
  const isUpwork = searchParams.get('src') === 'upwork';

  return <button>{isUpwork ? 'Discuss on Upwork' : 'Schedule Consultation'}</button>;
}
```

**What happens:**

1. Static HTML renders with `<ContactButton />` fallback
2. Browser receives HTML immediately
3. React hydrates, `CaseStudyCTA` mounts
4. `useSearchParams()` reads URL query
5. Renders correct button (imperceptible swap)

---

## 6. Incremental Static Regeneration (ISR)

**Static pages that automatically regenerate on a schedule or on-demand.**

### How It Works

```
Build time: Generate static pages
  ↓
First request: Serve cached HTML (instant)
  ↓
After 60 seconds: Mark as stale
  ↓
Next request: Serve stale HTML, regenerate in background
  ↓
Updated HTML cached for next requests
```

### Code Example

```tsx
// Dynamic page that updates every 60 seconds
export const revalidate = 60;

export async function generateStaticParams() {
  const cities = await db.cities.all();
  return cities.map((city) => ({ slug: city.slug }));
}

export default async function CityPage({ params }) {
  const cityData = await db.cities.get(params.slug);
  const apartments = await db.apartments.search({
    city: params.slug,
  });

  return (
    <div>
      <h1>{cityData.name}</h1>
      <ApartmentList apartments={apartments} />
    </div>
  );
}
```

### On-Demand Revalidation

```tsx
// app/api/revalidate.ts
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request) {
  const secret = request.headers.get('x-revalidate-token');

  if (secret !== process.env.REVALIDATE_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Triggered by webhook when apartment data changes
  revalidatePath('/apartments/[slug]'); // Regenerate all apartment pages

  return new Response('Revalidated', { status: 200 });
}
```

**Usage:** When you update an apartment, call:

```bash
curl -X POST https://mysite.com/api/revalidate \
  -H "x-revalidate-token: secret123"
```

### Pros & Cons

| Pros                      | Cons                                             |
| ------------------------- | ------------------------------------------------ |
| ✅ Instant first requests | ❌ Data can be stale (up to revalidate interval) |
| ✅ Cheap to scale         | ❌ Requires background regeneration              |
| ✅ Fresh data eventually  | ❌ Can't personalize per user                    |
| ✅ Best SEO               | ❌ Complex setup                                 |

### When to Use

- ✅ **E-commerce** (product pages revalidate every hour)
- ✅ **News sites** (articles revalidate every 5 minutes)
- ✅ **Content sites** (pages revalidate on editor save)
- ✅ **Pricing pages** (revalidate when prices change)
- ❌ Don't use for real-time data (stock prices, live availability)
- ❌ Don't use for user-specific content

---

## 7. Partial Pre-Rendering (PPR)

**Next.js 15+: Pre-render static shell, stream dynamic content from server.**

### How It Works

```
Build time: Render static parts (header, footer, layout)
  ↓
Save static shell
  ↓
User requests page
  ↓
Server immediately sends static shell to browser
  ↓
Browser paints instantly (shows UI frame)
  ↓
Server queries database for dynamic data
  ↓
Streams dynamic content as it loads
  ↓
Browser fills in content (apartments, recommendations, etc.)
```

### Code Example

```tsx
import { Suspense } from 'react';

// Page is marked for PPR
export const experimental_ppr = true;

export default function SearchPage({ searchParams }) {
  return (
    <div>
      {/* These pre-render at build time */}
      <StaticHeader />
      <SearchFilters />

      {/* This streams from server on each request */}
      <Suspense fallback={<ApartmentSkeleton />}>
        <ApartmentList searchParams={searchParams} />
      </Suspense>

      <StaticFooter />
    </div>
  );
}

// Server component (runs on server per request)
async function ApartmentList({ searchParams }) {
  const apartments = await db.apartments.search({
    city: searchParams.city,
    checkIn: searchParams.checkIn,
  });

  return apartments.map((apt) => <ApartmentCard key={apt.id} {...apt} />);
}
```

### Timeline

```
t=0ms:    Browser receives static shell + skeleton
t=0ms:    Browser paints header, filters, skeleton
t=200ms:  User sees responsive UI (can scroll, interact)
t=300ms:  Server finishes database query
t=350ms:  Browser streams apartment list
t=350ms:  Skeleton replaced with real apartments
```

### Pros & Cons

| Pros                     | Cons                                  |
| ------------------------ | ------------------------------------- |
| ✅ Instant first paint   | ❌ Requires Next.js 15+               |
| ✅ Fresh dynamic data    | ❌ Complex mental model               |
| ✅ Excellent performance | ❌ Streaming requires modern browsers |
| ✅ Scales well           | ❌ Not suitable for all use cases     |

### When to Use

- ✅ **E-commerce** (static layout + dynamic inventory)
- ✅ **Search results** (static filters + dynamic results)
- ✅ **Social media feed** (static navigation + dynamic posts)
- ✅ **Dashboards** (static sidebar + dynamic data)
- ✅ **Best for Airbnb-style apps**
- ❌ Don't use if everything is dynamic
- ❌ Don't use if everything is static

---

## 8. Comparison Matrix

### Performance (Lower is better)

| Strategy         | TTFB   | FCP     | LCP     | Server Cost |
| ---------------- | ------ | ------- | ------- | ----------- |
| **Static (SSG)** | 10ms   | 50ms    | 100ms   | None        |
| **PPR**          | 50ms   | 100ms   | 500ms   | Low         |
| **ISR**          | 10ms\* | 50ms    | 100ms   | Low         |
| **SSR**          | 500ms  | 600ms   | 700ms   | High        |
| **CSR**          | 50ms   | 2000ms+ | 3000ms+ | None        |

\*First request: fast. Subsequent requests if revalidating: 500ms+

### Data Freshness

| Strategy         | Freshness                 | Update Method        |
| ---------------- | ------------------------- | -------------------- |
| **Static (SSG)** | Weekly/monthly            | Rebuild only         |
| **PPR**          | Per request               | Real-time            |
| **ISR**          | Hourly/daily              | Scheduled or webhook |
| **SSR**          | Per request               | Real-time            |
| **CSR**          | Per request (if fetching) | Real-time            |

### Scalability & Cost

| Strategy   | Server Load | CDN Friendly | Max Scale   | Cost         |
| ---------- | ----------- | ------------ | ----------- | ------------ |
| **Static** | None        | Yes          | Unlimited   | $10/month    |
| **PPR**    | Medium      | Partial      | 10k+ req/s  | $50/month    |
| **ISR**    | Low         | Yes          | 100k+ req/s | $20/month    |
| **SSR**    | High        | No           | 1k req/s    | $1000+/month |
| **CSR**    | None        | Yes          | Unlimited   | $10/month    |

### Personalization

| Strategy   | Per-User        | Per-Request | Per-Session |
| ---------- | --------------- | ----------- | ----------- |
| **Static** | ❌ No           | ❌ No       | ❌ No       |
| **PPR**    | ❌ No           | ✅ Yes      | ❌ No       |
| **ISR**    | ❌ No           | ❌ No       | ❌ No       |
| **SSR**    | ✅ Yes          | ✅ Yes      | ✅ Yes      |
| **CSR**    | ✅ Yes (client) | ✅ Yes      | ✅ Yes      |

---

## 9. Real-World Examples

### LaunchQuay (Marketing Site)

```
Components:
├── Header (Static) - Same for all users
├── Hero (Static) - Same for all users
├── CTA Button (Client-side CSR)
│   └── Shows "Discuss on Upwork" if ?src=upwork
│   └── Shows "Schedule Consultation" otherwise
├── Case Studies (Static) - Pre-rendered
└── Footer (Static) - Same for all users

Strategy: Static + Client-side personalization
Rendering: SSG + CSR
Result: Instant page load, imperceptible button swap on hydration
```

### Airbnb (Marketplace)

```
Components:
├── Navigation (Static) - Pre-rendered
├── Search Filters (Static) - Pre-rendered
├── Apartment Results (Server-streamed) - PPR
│   └── Queries: SELECT * FROM apartments WHERE city = ?
│   └── Revalidates: Per request (real-time availability)
├── Apartment Details (Static + Dynamic)
│   └── Static: Description, photos, reviews
│   └── Dynamic: Current price, availability
└── Footer (Static)

Strategy: Partial Pre-Rendering (PPR)
Rendering: SSG (layout) + SSR (results)
Result: Instant layout, stream results as they load
```

### Medium (Blog Platform)

```
Components:
├── Article (Static) - Pre-rendered from markdown
├── Author Info (Static) - Pre-rendered
├── Recommendation Section (Client-side)
│   └── Fetches recommendations.json on client
├── Comments (Client-side)
│   └── Fetches from API on client
└── Footer (Static)

Strategy: Mostly static, with client-side dynamic sections
Rendering: SSG + CSR
Result: Article loads instantly, comments/recommendations load after
Revalidation: Article revalidated when editor publishes
```

### Netflix (Real-time)

```
Components:
├── Navigation (Client-side) - User-specific
├── Recommendations (Server-rendered)
│   └── Based on logged-in user
├── Watch Progress (Client-side + API)
│   └── Tracks current position
└── New Releases (Server-rendered + cached)
   └── Same for all users

Strategy: Full SSR or PPR
Rendering: SSR per request
Result: Every user gets personalized content
Note: Cache strategically (recommendations every 1 hour)
```

---

## 10. Decision Guide

### Step 1: What is your content?

**Does content change per user?**

- ✅ Yes → Go to Step 2
- ❌ No → Go to Step 3

### Step 2: User-Specific Content (Login Required)

**How often does it change?**

- Real-time (stock prices, live chat) → **Use SSR or CSR**
- Per session (shopping cart) → **Use CSR + API**
- Per day (recommendations) → **Use PPR**

**Example:** Dashboard → SSR

```tsx
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const user = await getUser();
  return <div>Welcome {user.name}</div>;
}
```

### Step 3: Public Content (Same for Everyone)

**How often does it change?**

#### 3a. Never or Very Rarely (Weekly+)

→ **Use Static Generation (SSG)**

```tsx
export default async function AboutPage() {
  const content = await db.pages.get('about');
  return <div>{content.body}</div>;
}
```

#### 3b. Frequently (Daily/Hourly)

→ **Use ISR**

```tsx
export const revalidate = 3600; // 1 hour
export default async function ProductPage({ params }) {
  const product = await db.products.get(params.id);
  return (
    <div>
      {product.name} - ${product.price}
    </div>
  );
}
```

#### 3c. Very Frequently (Per Request)

→ **Use PPR or SSR**

**PPR (Recommended for modern sites):**

```tsx
export const experimental_ppr = true;

export default function SearchPage({ searchParams }) {
  return (
    <div>
      <StaticFilters />
      <Suspense fallback={<Skeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
```

**SSR (Simple but expensive):**

```tsx
export const dynamic = 'force-dynamic';
export default async function SearchPage({ searchParams }) {
  const results = await db.search(searchParams.q);
  return (
    <div>
      {results.map((r) => (
        <Result key={r.id} {...r} />
      ))}
    </div>
  );
}
```

### Step 4: Do You Need Interactivity?

**Does user interaction require server data?**

- ❌ No (theme toggle, local state) → **Use Client Component (CSR)**
- ✅ Yes (fetching recommendations) → **Use client component + API endpoint**

```tsx
'use client';
import { useEffect, useState } from 'react';

export function Recommendations() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('/api/recommendations')
      .then((r) => r.json())
      .then(setItems);
  }, []);

  return items.map((item) => <Item key={item.id} {...item} />);
}
```

---

## Decision Tree

```
Does content change per user?
├─ YES (Login required)
│  └─ How often?
│     ├─ Real-time → SSR (export const dynamic = 'force-dynamic')
│     ├─ Per session → CSR (fetch from /api/...)
│     └─ Per day → PPR (Suspense boundaries)
│
└─ NO (Public)
   └─ How often does it change?
      ├─ Never (weekly+) → SSG (default, no exports)
      ├─ Often (hourly) → ISR (export const revalidate = 3600)
      ├─ Very often (per request) → PPR or SSR
      │  ├─ PPR (recommended): Suspense for dynamic parts
      │  └─ SSR (simple): export const dynamic = 'force-dynamic'
      │
      └─ Needs interactivity?
         ├─ YES (no server data) → Client Component ('use client')
         └─ YES (with server data) → CSR + API endpoint
```

---

## Summary Table

| Scenario                           | Strategy  | Code                                     |
| ---------------------------------- | --------- | ---------------------------------------- |
| Blog post                          | Static    | `export default async function...`       |
| Product page (prices change daily) | ISR       | `export const revalidate = 86400`        |
| Search results (real-time)         | PPR       | `<Suspense><Results /></Suspense>`       |
| Logged-in dashboard                | SSR       | `export const dynamic = 'force-dynamic'` |
| Referral button (?src=upwork)      | CSR       | `'use client'; useSearchParams()`        |
| Shopping cart                      | CSR + API | Fetch from `/api/cart`                   |
| News feed (user-specific)          | PPR       | Pre-render layout, stream feed           |

---

## Best Practices

1. **Default to Static** — Static is fastest and cheapest. Only move to dynamic when necessary.

2. **Use PPR over SSR** — If you need dynamic content, use PPR (streaming) instead of SSR (wait for
   all data).

3. **Extract dynamic parts** — Use `<Suspense>` boundaries to isolate dynamic components instead of
   marking entire pages as dynamic.

4. **Cache strategically** — Use ISR revalidation for content that changes predictably.

5. **Measure** — Use Lighthouse to measure TTFB, FCP, LCP. Optimize based on metrics.

6. **Consider user networks** — CSR is slow on 3G. PPR + SSR better for global audiences.

7. **Avoid unnecessary re-renders** — Don't mark everything as `force-dynamic`. Use selective
   rendering.

---

## References

- [Next.js Rendering Docs](https://nextjs.org/docs/app/building-your-application/rendering)
- [ISR Revalidation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
- [PPR (Experimental)](https://nextjs.org/docs/app/api-reference/next-config-js/partial-prerendering)
- [Web Vitals](https://web.dev/vitals/)
