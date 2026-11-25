// "About · Privacy · Terms" links, shown on Welcome and in Settings.
//
// These pages are plain HTML files in the public/ folder, not app screens, so
// they're ordinary links rather than router <Link>s. import.meta.env.BASE_URL
// is filled in by Vite: "/spendsheet/" on GitHub Pages, so the links work
// wherever the app is hosted.
const BASE = import.meta.env.BASE_URL;

function LegalLinks() {
  return (
    <p className="legal-links">
      <a href={`${BASE}about.html`}>About</a>
      <span aria-hidden="true">·</span>
      <a href={`${BASE}privacy.html`}>Privacy policy</a>
      <span aria-hidden="true">·</span>
      <a href={`${BASE}terms.html`}>Terms of use</a>
    </p>
  );
}

export default LegalLinks;
