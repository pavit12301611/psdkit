const DEFAULTS = {
  title: 'PSDKIT Pro — 175 Free Online Tools for Daily Life, Internet & Coding',
  description: 'PSDKIT Pro is a free toolkit with 175 practical tools — daily calculators, internet tools, everyday essentials and coding helpers, plus guides, a glossary, AI assistant and community toolbox.',
  image: '/logo.png',
};

function ensureMeta(name, attr = 'name') {
  let tag = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.append(tag);
  }
  return tag;
}

export function setJsonLd(data) {
  let script = document.getElementById('psdkit-jsonld');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'psdkit-jsonld';
    document.head.append(script);
  }
  script.textContent = data ? JSON.stringify(data) : '';
}

export function applyMeta({ title, description, image = DEFAULTS.image, ld = null }) {
  document.title = title || DEFAULTS.title;
  const desc = description || DEFAULTS.description;
  ensureMeta('description').setAttribute('content', desc);
  ensureMeta('og:title', 'property').setAttribute('content', title || DEFAULTS.title);
  ensureMeta('og:description', 'property').setAttribute('content', desc);
  ensureMeta('og:image', 'property').setAttribute('content', image);
  ensureMeta('twitter:card', 'name').setAttribute('content', 'summary_large_image');
  ensureMeta('twitter:title', 'name').setAttribute('content', title || DEFAULTS.title);
  ensureMeta('twitter:description', 'name').setAttribute('content', desc);
  setJsonLd(ld);
}

export function homeLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PSDKIT Pro',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: DEFAULTS.description,
    url: '/',
  };
}

export function faqLd(faqs = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}
