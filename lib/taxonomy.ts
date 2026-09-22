/**
 * The controlled vocabulary both sides of a match are normalised into.
 *
 * Matching an opportunity to a client only works if the funding email and the
 * client register describe the world with the same words. Free text on both
 * sides gives you mush, so the model is made to choose from these lists, and
 * the deterministic prefilter in `client-register.ts` scores the overlap.
 *
 * Both lists are meant to be edited. Add a tag when a real opportunity or a
 * real client needs one; the aliases exist so a register written by hand (or
 * an email that says "surface coatings") still lands on the right key.
 */

export interface TaxonomyEntry {
  key: string;
  label: string;
  /** Lower-case terms that should resolve to this key when found in free text. */
  aliases: string[];
}

/**
 * The eight growth-driving sectors of the UK Modern Industrial Strategy, which
 * competitions increasingly gate on ("a named end user operating within one of
 * the 8 IS sectors"). Keep the keys stable: registers reference them.
 */
export const IS_SECTORS: TaxonomyEntry[] = [
  {
    key: 'advanced_manufacturing',
    label: 'Advanced Manufacturing',
    aliases: ['advanced manufacturing', 'manufacturing', 'automotive', 'aerospace', 'industrial', 'factory', 'production line'],
  },
  {
    key: 'clean_energy',
    label: 'Clean Energy Industries',
    aliases: ['clean energy', 'net zero', 'renewables', 'offshore wind', 'hydrogen', 'nuclear', 'solar', 'energy security', 'decarbonisation'],
  },
  {
    key: 'creative_industries',
    label: 'Creative Industries',
    // 'design' is deliberately absent: it matches sub-themes like "Design and
    // Deployment" in engineering competitions that have nothing creative in them.
    aliases: ['creative', 'media', 'games', 'film', 'broadcast', 'advertising'],
  },
  {
    key: 'defence',
    label: 'Defence',
    aliases: ['defence', 'defense', 'dstl', 'mod', 'military', 'dual use'],
  },
  {
    key: 'digital_and_technologies',
    label: 'Digital and Technologies',
    aliases: ['digital', 'software', 'ai', 'artificial intelligence', 'semiconductor', 'telecoms', 'telecommunications', 'connectivity', 'quantum', 'cyber'],
  },
  {
    key: 'financial_services',
    label: 'Financial Services',
    aliases: ['financial services', 'fintech', 'insurance', 'banking', 'payments'],
  },
  {
    key: 'life_sciences',
    label: 'Life Sciences',
    aliases: ['life sciences', 'healthcare', 'medtech', 'medical device', 'pharma', 'biotech', 'diagnostics', 'nhs', 'clinical'],
  },
  {
    key: 'professional_and_business_services',
    label: 'Professional and Business Services',
    aliases: ['professional services', 'business services', 'consultancy', 'legal services', 'accountancy'],
  },
];

/**
 * Technology tags. Broader than any one competition, because the same register
 * has to be matched against every kind of email that lands in the inbox.
 */
export const TECH_TAGS: TaxonomyEntry[] = [
  // Materials
  { key: 'advanced_materials', label: 'Advanced materials', aliases: ['advanced materials', 'materials innovation', 'novel material', 'materials science', 'structural material', 'structural materials', 'material innovation'] },
  { key: 'composites', label: 'Composites', aliases: ['composite', 'carbon fibre', 'carbon fiber', 'laminate', 'fibre reinforced'] },
  { key: 'coatings_surface', label: 'Coatings and surface engineering', aliases: ['coating', 'coatings', 'surface engineering', 'surface treatment', 'thin film', 'anti-corrosion', 'tribology', 'low friction'] },
  { key: 'polymers', label: 'Polymers and plastics', aliases: ['polymer', 'plastic', 'resin', 'elastomer', 'bioplastic'] },
  { key: 'metals_alloys', label: 'Metals and alloys', aliases: ['alloy', 'steel', 'titanium', 'metallurgy', 'casting', 'forging'] },
  { key: 'ceramics', label: 'Ceramics and glass', aliases: ['ceramic', 'glass', 'refractory', 'sintering'] },
  { key: 'nanomaterials', label: 'Nanomaterials', aliases: ['nanomaterial', 'nanotechnology', 'graphene', 'nanoparticle', '2d material'] },
  { key: 'metamaterials', label: 'Metamaterials and metasurfaces', aliases: ['metamaterial', 'metasurface', 'photonic crystal', 'acoustic metamaterial'] },
  { key: 'biomaterials', label: 'Biomaterials and regenerative materials', aliases: ['biomaterial', 'biocompatible', 'regenerative', 'scaffold', 'tissue engineering', 'implant'] },
  { key: 'sustainable_materials', label: 'Sustainable and circular materials', aliases: ['recyclable', 'circular economy', 'bio-based', 'biodegradable', 'recycled content', 'sustainable material', 'sustainability'] },

  // Manufacturing and process
  { key: 'additive_manufacturing', label: 'Additive manufacturing', aliases: ['additive manufacturing', '3d printing', '3d print', 'am process'] },
  { key: 'automation_robotics', label: 'Automation and robotics', aliases: ['robotics', 'robot', 'automation', 'cobot', 'autonomous system'] },
  { key: 'process_engineering', label: 'Process and production engineering', aliases: ['process engineering', 'scale up', 'pilot line', 'production process', 'throughput'] },
  { key: 'digital_manufacturing', label: 'Digital manufacturing', aliases: ['digital twin', 'industry 4.0', 'smart factory', 'iiot'] },

  // Energy and environment
  { key: 'batteries_storage', label: 'Batteries and energy storage', aliases: ['battery', 'energy storage', 'cell chemistry', 'anode', 'cathode', 'solid state battery'] },
  { key: 'hydrogen', label: 'Hydrogen', aliases: ['hydrogen', 'electrolyser', 'fuel cell'] },
  { key: 'renewables', label: 'Renewable generation', aliases: ['wind turbine', 'offshore wind', 'solar pv', 'photovoltaic', 'tidal', 'marine energy'] },
  { key: 'carbon_capture', label: 'Carbon capture and emissions', aliases: ['carbon capture', 'ccus', 'emissions reduction', 'carbon accounting'] },
  { key: 'water_waste', label: 'Water and waste', aliases: ['water treatment', 'wastewater', 'waste processing', 'recycling technology'] },

  // Electronics, photonics, connectivity
  { key: 'semiconductors', label: 'Semiconductors', aliases: ['semiconductor', 'wide bandgap', 'ultra wide bandgap', 'gallium nitride', 'gan', 'silicon carbide', 'sic', 'wafer'] },
  { key: 'power_electronics', label: 'Power electronics', aliases: ['power electronics', 'inverter', 'converter', 'power module'] },
  { key: 'photonics', label: 'Photonics and optics', aliases: ['photonic', 'optics', 'laser', 'optical', 'lidar'] },
  { key: 'sensors', label: 'Sensors and instrumentation', aliases: ['sensor', 'instrumentation', 'metrology', 'measurement system'] },
  { key: 'bioelectronics', label: 'Bioelectronics', aliases: ['bioelectronic', 'neural interface', 'wearable sensor', 'biosensor', 'electroceutical'] },
  { key: 'connectivity_rf', label: 'Connectivity and RF', aliases: ['antenna', 'rf', '5g', '6g', 'satcom', 'radio frequency', 'wireless'] },

  // Digital
  { key: 'ai_ml', label: 'AI and machine learning', aliases: ['machine learning', 'artificial intelligence', 'neural network', 'llm', 'computer vision'] },
  { key: 'software_platform', label: 'Software and platforms', aliases: ['saas', 'software platform', 'web app', 'mobile app', 'api platform'] },
  { key: 'data_analytics', label: 'Data and analytics', aliases: ['data analytics', 'big data', 'data platform', 'dashboard'] },
  { key: 'cyber_security', label: 'Cyber security', aliases: ['cyber security', 'cybersecurity', 'encryption', 'secure by design'] },
  { key: 'quantum', label: 'Quantum technologies', aliases: ['quantum', 'qubit', 'quantum sensing'] },

  // Life sciences and health
  { key: 'medical_devices', label: 'Medical devices', aliases: ['medical device', 'medtech', 'ce mark', 'mhra', 'class ii device'] },
  { key: 'diagnostics', label: 'Diagnostics', aliases: ['diagnostic', 'assay', 'point of care', 'in vitro'] },
  { key: 'therapeutics', label: 'Therapeutics and pharma', aliases: ['therapeutic', 'drug development', 'clinical trial', 'pharmaceutical'] },
  { key: 'digital_health', label: 'Digital health', aliases: ['digital health', 'health app', 'remote monitoring', 'telehealth'] },

  // Sector applications
  { key: 'aerospace', label: 'Aerospace and space', aliases: ['aerospace', 'aviation', 'aircraft', 'space', 'satellite'] },
  { key: 'automotive', label: 'Automotive', aliases: ['automotive', 'vehicle', 'ev', 'electric vehicle'] },
  { key: 'marine', label: 'Marine and offshore', aliases: ['marine', 'offshore', 'subsea', 'vessel', 'maritime'] },
  { key: 'construction', label: 'Construction and built environment', aliases: ['construction', 'built environment', 'building material', 'retrofit'] },
  { key: 'agrifood', label: 'Agriculture and food', aliases: ['agritech', 'agriculture', 'food production', 'food processing'] },
  { key: 'rail', label: 'Rail and transport', aliases: ['rail', 'railway', 'rolling stock', 'transport infrastructure'] },
];

const ALL_ENTRIES = [...IS_SECTORS, ...TECH_TAGS];

export const IS_SECTOR_KEYS = IS_SECTORS.map((entry) => entry.key);
export const TECH_TAG_KEYS = TECH_TAGS.map((entry) => entry.key);

const BY_KEY = new Map(ALL_ENTRIES.map((entry) => [entry.key, entry]));

/** Human label for a taxonomy key, falling back to the key itself. */
export function labelForKey(key: string): string {
  return BY_KEY.get(key)?.label ?? key;
}

export function isSectorKey(value: unknown): value is string {
  return typeof value === 'string' && IS_SECTORS.some((entry) => entry.key === value);
}

export function isTechTagKey(value: unknown): value is string {
  return typeof value === 'string' && TECH_TAGS.some((entry) => entry.key === value);
}

/** Escape a term for use inside a RegExp. */
function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find every taxonomy key whose label or aliases appear in the text. Used to
 * rescue a hand-written register whose records carry notes but no tags, so a
 * client is still shortlisted on the strength of what the coach wrote.
 */
export function tagsInText(text: string, entries: TaxonomyEntry[] = ALL_ENTRIES): string[] {
  if (!text) return [];
  const haystack = text.toLowerCase();
  const found: string[] = [];

  for (const entry of entries) {
    const terms = [entry.label.toLowerCase(), ...entry.aliases];
    const hit = terms.some((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`).test(haystack));
    if (hit) found.push(entry.key);
  }

  return found;
}

/** The taxonomy, rendered for a prompt so the model picks keys rather than prose. */
export function taxonomyForPrompt(): string {
  const sectors = IS_SECTORS.map((entry) => `  ${entry.key} - ${entry.label}`).join('\n');
  const tags = TECH_TAGS.map((entry) => `  ${entry.key} - ${entry.label}`).join('\n');
  return `Industrial Strategy sectors (use these keys only):\n${sectors}\n\nTechnology tags (use these keys only):\n${tags}`;
}
