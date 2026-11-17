// All prices and credit costs live here. Change them in one place.

export const IMAGES_PER_GENERATION = 4;

// Max generations per client per day, so one account can't drain your AI balance.
export const DAILY_GENERATION_LIMIT = 40;

// Two AI models: a fast, cheap one for Drafts and Sunburst for finished work.
// Override either with the OPENAI_DRAFT_MODEL / OPENAI_FINAL_MODEL environment variables.
export const MODELS = {
  draft: 'gpt-image-2',
  final: 'gpt-image-2.6-sunburst',
};

export const QUALITY = {
  draft: { label: 'Draft', credits: 1, model: 'draft', apiQuality: 'low', note: 'Quick ideas' },
  standard: { label: 'Standard', credits: 8, model: 'final', apiQuality: 'medium', note: 'Polished' },
  high: { label: 'High', credits: 12, model: 'final', apiQuality: 'high', note: 'Finest detail' },
};

export const KINDS = {
  logo: {
    label: 'Logo mark',
    guide: 'a clean, simple, scalable logo mark in a flat vector style with solid colors, centered on a plain background, no mockup, no extra text unless requested',
  },
  icon: {
    label: 'Icon',
    guide: 'a single bold icon in a flat vector style, centered on a plain background, consistent line weight',
  },
  badge: {
    label: 'Badge',
    guide: 'a badge or emblem design in a flat vector style, centered on a plain background, crisp edges',
  },
  pattern: {
    label: 'Pattern',
    guide: 'a seamless repeating pattern tile with even spacing, flat colors',
  },
  social: {
    label: 'Social graphic',
    guide: 'a square social media graphic with strong composition and clear hierarchy',
  },
};

export const PACKS = {
  single: { label: '1 Standard image', credits: 8, cents: 100 },
  pack10: { label: '10 Standard images', credits: 80, cents: 500 },
  pack25: { label: '25 Standard images', credits: 200, cents: 1200 },
  pack50: { label: '50 Standard images', credits: 400, cents: 2000 },
};

export const PRO = { label: 'Pro', monthlyCredits: 400, cents: 2900 };

export function money(cents) {
  return '$' + (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));
}
