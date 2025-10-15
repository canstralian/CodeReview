# Sales Funnel — Canstralian / CodeReview Inspired

> Purpose: Static sales funnel pages designed for GitHub Pages, inspired by the Canstralian/CodeReview visual style. Includes analysis, wireframes, UX flow, copy, responsive plan, implementation files (ready-to-deploy `index.html`, `product.html`, `lead.html`, `thankyou.html`, `assets/styles.css`, `assets/script.js`), and QA/analytics guidance.

---

## 1) Style Analysis (Canstralian / CodeReview)

**Visual DNA**

* Minimalist, developer-focused aesthetic with GitHub-like cues.
* Clear hierarchy: bold headline, concise subhead, mono/tech fonts for code snippets.
* High contrast call-to-actions (CTAs) with GitHub-blue accent and green success accents.
* Generous whitespace, card-based sections, subtle shadows and rounded corners.

**Unique elements to adopt**

* Dark-grey primary (#2D2D2D) for headings and nav.
* GitHub-blue (#0366D6) as primary accent for links and CTAs.
* Light background (#F6F8FA) and near-black body text (#24292E).
* Accent green (#28A745) for positive microcopy (success, badges).
* Fonts: JetBrains Mono for monospace snippets, Inter for UI text (fallbacks included).
* Layout: split-pane hero (left copy, right code/visual), 3-column feature cards, testimonial/code snippet cards.

---

## 2) Sales Funnel Structure

Pages:

1. `index.html` — Landing / Hero (primary entrance, SEO-friendly)
2. `product.html` — Product / Service Details (features, pricing, social proof)
3. `lead.html` — Lead Capture (form integrated with Formspree / static provider)
4. `thankyou.html` — Post-conversion confirmation with next steps & upsell

Each page follows the same header/footer, consistent design tokens, and progressive disclosure of information.

---

## 3) Page-by-page Plan

### index.html — Landing

**Goal:** Communicate value quickly and push to lead capture or product page.

Wireframe:

* Top nav (logo, product, pricing, sign up CTA)
* Hero split (headline + subcopy + CTA | code image / mock terminal)
* Trust row (logos / stats)
* Features (3 cards)
* Social proof (testimonials + GitHub stars badge)
* Footer (links, copyright)

Copy (hero):

> Headline: "Code review, faster — ship with confidence."
> Subheadline: "Automated insights, human-like reasoning — built for devs who move fast."
> CTA primary: "Start free trial" (links to `lead.html`)

UX notes:

* CTA in hero scrolls to features on small screens and opens lead capture on CTA click.
* Use inline code snippet in hero to validate developer persona.

### product.html — Product Details

**Goal:** Explain features and pricing; remove friction to convert.

Wireframe:

* Breadcrumbs, H1
* Feature breakdown (problem → solution → outcome)
* Pricing cards with clear CTA per tier
* FAQ accordion
* CTA sticky bar at bottom on mobile

Copy sample (pricing):

> "Free for personal projects — Starter for teams — Pro for enterprises"

UX notes:

* Pricing toggles monthly/annual (visual switch)
* Each pricing CTA anchors to `lead.html` with query params to indicate plan

### lead.html — Lead Capture

**Goal:** Collect name, email, company, role, and interest; integrate with static form handler.

Wireframe:

* Small hero with reassurance copy
* Short form (4 fields + hidden utm + plan)
* Social proof + privacy line

Form behavior:

* Client-side validation (HTML5 + JS)
* On submit, POST to Formspree (or configurable webhook) and redirect to `thankyou.html` with UTM-preserved params

Privacy copy: "We'll never sell your data. We'll only email about product updates and resources."

### thankyou.html — Confirmation

**Goal:** Confirm submission, set expectations, offer next steps (docs, demo booking)

Wireframe:

* Success hero (green accent)
* Next steps: check inbox, join Slack/community, view docs
* Secondary CTA: "Explore product docs" or "Schedule demo"

---

## 4) Design Tokens

* **Primary:** `#2D2D2D` (dark grey)
* **Accent Blue:** `#0366D6` (primary CTA)
* **Background:** `#F6F8FA`
* **Body Text:** `#24292E`
* **Accent Green:** `#28A745` (success)
* **Radius:** `8px`
* **Shadow:** `0 6px 18px rgba(45,45,45,0.06)`
* **Spacing scale:** 8 / 16 / 24 / 32 / 48
* **Fonts:** `Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial`; `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco` for code

---

## 5) Accessibility & UX

* Color contrast checked for text-heavy areas. CTA color uses bold backgrounds with white text.
* Forms use `label` + `aria-*` attributes.
* Buttons keyboard-accessible and visible focus states.
* Images include `alt` text.

---

## 6) Responsive Strategy

* Mobile-first CSS
* Grid/flex breakpoints: `<=640px` (mobile), `641–1024px` (tablet), `>1024px` (desktop)
* Hero stack: vertical on mobile, split on desktop
* Sticky CTA on mobile for long pages

---

## 7) Conversion Copywriting — Short Examples

**Hero CTA microcopy:** "Start free — no card required"

**Feature card headline:** "Find bugs before CI does"

**Form submit button:** "Get early access"

**Privacy microcopy:** "We respect your inbox — unsubscribe anytime."

---

## 8) Analytics & Testing Plan

* Add Google Analytics / GA4 or Plausible for privacy-friendly tracking.
* Use UTM parameters on external links
* Heatmaps & recordings (Hotjar / Microsoft Clarity) to observe form friction.
* A/B test hero headline and CTA color/label. Measure: CTR → Form conversion rate → Thank-you retention.
* KPIs: CTR (hero), Lead conversion rate, Bounce rate, Time on page.

---

## 9) QA & Launch Checklist

* [ ] HTML validation (W3C)
* [ ] Lighthouse performance >= 90 (mobile & desktop)
* [ ] Accessibility audit (axe-core) no critical violations
* [ ] Forms tested with sample submissions and redirect flows
* [ ] Cross-browser check: Chromium, Firefox, Safari

---

## 10) Implementation — Files (ready-to-deploy)

Below are the primary static files. Drop them into a GitHub Pages repo root (`index.html`, `product.html`, `lead.html`, `thankyou.html`, `assets/styles.css`, `assets/script.js`).

---

### `index.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CodeReview — Ship with Confidence</title>
  <meta name="description" content="Automated code review and developer insights — faster feedback, fewer regressions.">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <header class="nav">
    <div class="container nav-inner">
      <a class="logo" href="/">CodeReview</a>
      <nav class="nav-links">
        <a href="/product.html">Product</a>
        <a href="/lead.html" class="btn btn-ghost">Get Early Access</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero container">
      <div class="hero-copy">
        <h1>Code review, faster — ship with confidence.</h1>
        <p class="lead">Automated insights, human-like reasoning, and actionable reports tailored for busy engineering teams.</p>
        <div class="hero-ctas">
          <a class="btn btn-primary" href="/lead.html">Start free — no card required</a>
          <a class="btn btn-outline" href="/product.html">See features</a>
        </div>
        <ul class="trust-row">
          <li>Trusted by teams — 1.2k+ repos</li>
          <li>2m+ lines analyzed</li>
        </ul>
      </div>
      <div class="hero-visual">
        <pre class="code-mock"><code>function review(code) {
  return analyze(code).withContext('security, style, tests')
}</code></pre>
      </div>
    </section>

    <section class="features container">
      <div class="feature-card">
        <h3>Automated feedback</h3>
        <p>Instant PR checks with prioritized findings.</p>
      </div>
      <div class="feature-card">
        <h3>Integrates with CI</h3>
        <p>Runs in your pipeline and blocks risky merges.</p>
      </div>
      <div class="feature-card">
        <h3>Explainable results</h3>
        <p>Human-readable suggestions and fix examples.</p>
      </div>
    </section>

    <section class="testimonials container">
      <blockquote>
        "Cut our code review time by 40% — the tool surfaces the right issues fast."
        <cite>— S. Developer, Platform</cite>
      </blockquote>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; <span id="year"></span> CodeReview — Built by Canstralian</p>
    </div>
  </footer>

  <script src="/assets/script.js"></script>
</body>
</html>
```

---

### `product.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Features — CodeReview</title>
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <header class="nav">
    <div class="container nav-inner">
      <a class="logo" href="/">CodeReview</a>
      <nav class="nav-links">
        <a href="/lead.html" class="btn btn-ghost">Get Early Access</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <section class="page-hero">
      <h1>Features that make code review painless</h1>
      <p class="lead">From security checks to maintainability insights — actionable findings that integrate into your workflow.</p>
    </section>

    <section class="feature-list">
      <article>
        <h3>Security & SAST</h3>
        <p>Find vulnerabilities and suggest fixes with context-aware recommendations.</p>
      </article>
      <article>
        <h3>Style & Lint</h3>
        <p>Enforce team style guides with runnable autofixes.</p>
      </article>
      <article>
        <h3>Tests & Coverage</h3>
        <p>Detect brittle tests and missing assertions before merge.</p>
      </article>
    </section>

    <section class="pricing">
      <h2>Pricing</h2>
      <div class="pricing-cards">
        <div class="card">
          <h4>Free</h4>
          <p>For open-source and personal projects</p>
          <a class="btn btn-outline" href="/lead.html?plan=free">Get started</a>
        </div>
        <div class="card">
          <h4>Pro</h4>
          <p>Small teams, private repos</p>
          <a class="btn btn-primary" href="/lead.html?plan=pro">Start trial</a>
        </div>
        <div class="card">
          <h4>Enterprise</h4>
          <p>Custom SLAs, SSO</p>
          <a class="btn btn-ghost" href="/lead.html?plan=enterprise">Contact sales</a>
        </div>
      </div>
    </section>

  </main>
  <footer class="site-footer"><div class="container"><p>&copy; <span id="year2"></span> CodeReview</p></div></footer>
  <script src="/assets/script.js"></script>
</body>
</html>
```

---

### `lead.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Get Early Access — CodeReview</title>
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <header class="nav">
    <div class="container nav-inner">
      <a class="logo" href="/">CodeReview</a>
    </div>
  </header>

  <main class="container lead-page">
    <section class="lead-hero">
      <h1>Get early access</h1>
      <p class="lead">Join the waitlist and get notified when we open private trials.</p>
    </section>

    <form id="leadForm" class="lead-form" action="https://formspree.io/f/yourformid" method="POST">
      <label for="name">Full name</label>
      <input id="name" name="name" required minlength="2">

      <label for="email">Work email</label>
      <input id="email" name="email" type="email" required>

      <label for="company">Company</label>
      <input id="company" name="company">

      <input type="hidden" id="plan" name="plan" value="">

      <button type="submit" class="btn btn-primary">Request access</button>
      <p class="privacy">We respect your privacy. No spam.</p>
    </form>

  </main>

  <footer class="site-footer"><div class="container"><p>&copy; <span id="year3"></span> CodeReview</p></div></footer>
  <script src="/assets/script.js"></script>
</body>
</html>
```

---

### `thankyou.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Thanks — CodeReview</title>
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <main class="container thankyou">
    <section class="success-hero">
      <h1>Thanks — you're on the list.</h1>
      <p>We've emailed a confirmation. While you wait, explore the docs or book a quick demo.</p>
      <div class="ctas">
        <a class="btn btn-outline" href="/product.html">Read docs</a>
        <a class="btn btn-primary" href="#">Book a demo</a>
      </div>
    </section>
  </main>
  <footer class="site-footer"><div class="container"><p>&copy; <span id="year4"></span> CodeReview</p></div></footer>
  <script src="/assets/script.js"></script>
</body>
</html>
```

---

### `assets/styles.css`

```css
:root{
  --primary:#2D2D2D;
  --accent:#0366D6;
  --bg:#F6F8FA;
  --text:#24292E;
  --success:#28A745;
  --radius:8px;
}
*{box-sizing:border-box}
html,body{height:100%;margin:0;padding:0;font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
.container{max-width:1200px;margin:0 auto;padding:0 24px}

/* Nav */
.nav{background:#fff;border-bottom:1px solid #E1E4E8;position:sticky;top:0;z-index:10}
.nav-inner{display:flex;align-items:center;justify-content:space-between;padding:16px 24px}
.logo{font-size:18px;font-weight:700;color:var(--primary);text-decoration:none}
.nav-links{display:flex;gap:16px;align-items:center}
.nav-links a{color:var(--text);text-decoration:none;font-size:14px}

/* Buttons */
.btn{display:inline-block;padding:10px 20px;border-radius:var(--radius);font-weight:600;font-size:14px;text-decoration:none;cursor:pointer;border:none;transition:all .2s}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:#0256c7}
.btn-outline{border:1px solid var(--accent);color:var(--accent);background:#fff}
.btn-outline:hover{background:var(--accent);color:#fff}
.btn-ghost{color:var(--accent)}
.btn-ghost:hover{background:rgba(3,102,214,0.1)}

/* Hero */
.hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;padding:80px 24px;align-items:center}
.hero h1{font-size:48px;font-weight:700;margin:0 0 16px;color:var(--primary)}
.hero .lead{font-size:20px;color:#586069;margin:0 0 32px}
.hero-ctas{display:flex;gap:12px}
.trust-row{list-style:none;padding:24px 0 0;margin:0;display:flex;gap:24px;font-size:13px;color:#586069}
.code-mock{background:#1E1E1E;color:#D4D4D4;padding:24px;border-radius:var(--radius);font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;font-size:14px;overflow-x:auto}

/* Features */
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:48px 24px}
.feature-card{background:#fff;padding:32px;border-radius:var(--radius);box-shadow:0 6px 18px rgba(45,45,45,0.06)}
.feature-card h3{margin:0 0 8px;font-size:20px;color:var(--primary)}
.feature-card p{margin:0;color:#586069}

/* Testimonials */
.testimonials{padding:48px 24px}
.testimonials blockquote{background:#fff;padding:32px;border-radius:var(--radius);border-left:4px solid var(--accent);font-size:18px;font-style:italic;margin:0}
.testimonials cite{display:block;margin-top:16px;font-size:14px;font-style:normal;color:#586069}

/* Footer */
.site-footer{background:var(--primary);color:#fff;padding:32px 0;margin-top:80px;text-align:center}
.site-footer p{margin:0}

/* Product page */
.page-hero{padding:48px 24px;text-align:center}
.page-hero h1{font-size:40px;margin:0 0 16px;color:var(--primary)}
.page-hero .lead{font-size:18px;color:#586069}
.feature-list{display:grid;gap:24px;padding:32px 24px}
.feature-list article{background:#fff;padding:24px;border-radius:var(--radius)}
.feature-list h3{margin:0 0 8px;color:var(--primary)}
.feature-list p{margin:0;color:#586069}

/* Pricing */
.pricing{padding:48px 24px}
.pricing h2{text-align:center;font-size:32px;margin:0 0 32px;color:var(--primary)}
.pricing-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.pricing-cards .card{background:#fff;padding:32px;border-radius:var(--radius);text-align:center;box-shadow:0 6px 18px rgba(45,45,45,0.06)}
.pricing-cards h4{font-size:24px;margin:0 0 8px;color:var(--primary)}
.pricing-cards p{color:#586069;margin:0 0 24px}

/* Lead page */
.lead-page{max-width:600px;margin:0 auto;padding:48px 24px}
.lead-hero{text-align:center;margin-bottom:32px}
.lead-hero h1{font-size:36px;margin:0 0 16px;color:var(--primary)}
.lead-form{background:#fff;padding:32px;border-radius:var(--radius);box-shadow:0 6px 18px rgba(45,45,45,0.06)}
.lead-form label{display:block;margin:0 0 8px;font-weight:600;color:var(--primary)}
.lead-form input{width:100%;padding:12px;border:1px solid #E1E4E8;border-radius:var(--radius);margin-bottom:16px;font-size:14px}
.lead-form button{width:100%;margin-top:8px}
.privacy{font-size:12px;color:#586069;text-align:center;margin:16px 0 0}

/* Thank you page */
.thankyou{padding:80px 24px;text-align:center}
.success-hero h1{font-size:40px;color:var(--success);margin:0 0 16px}
.success-hero p{font-size:18px;color:#586069;margin:0 0 32px}
.success-hero .ctas{display:flex;gap:12px;justify-content:center}

/* Responsive */
@media (max-width:768px){
  .hero{grid-template-columns:1fr;padding:48px 24px}
  .hero h1{font-size:32px}
  .features,.pricing-cards{grid-template-columns:1fr}
  .trust-row{flex-direction:column;gap:8px}
}
```

---

### `assets/script.js`

```javascript
// Set copyright year dynamically
document.addEventListener('DOMContentLoaded', () => {
  const year = new Date().getFullYear();
  const yearElements = document.querySelectorAll('#year, #year2, #year3, #year4');
  yearElements.forEach(el => {
    if (el) el.textContent = year;
  });

  // Extract plan from URL params and populate hidden field
  const urlParams = new URLSearchParams(window.location.search);
  const plan = urlParams.get('plan');
  const planInput = document.getElementById('plan');
  if (planInput && plan) {
    planInput.value = plan;
  }

  // Form submission handler (optional enhancement)
  const leadForm = document.getElementById('leadForm');
  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      // Add any pre-submit validation or tracking here
      console.log('Form submitted', {
        name: leadForm.name.value,
        email: leadForm.email.value,
        company: leadForm.company.value,
        plan: leadForm.plan.value
      });
      // Form will submit normally to Formspree
    });
  }
});
```
