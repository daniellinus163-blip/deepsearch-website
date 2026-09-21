export type DiscoveryProfile = {
  sourceQuery: string;
  mainService: string;
  category: string;
  subServices: string[];
  buyerTypes: string[];
  useCases: string[];
  matchedCatalog: string | null;
};

export type ServiceCatalogEntry = {
  id: string;
  keywords: string[];
  mainService: string;
  category: string;
  subServices: string[];
  buyerTypes: string[];
  useCases: string[];
};

/**
 * Curated catalogs for rule-based discovery (Phase 3 — no AI).
 * More entries can be added over time without changing the engine.
 */
export const SERVICE_CATALOG: ServiceCatalogEntry[] = [
  {
    id: "roblox-character-design",
    keywords: [
      "roblox",
      "roblox character",
      "roblox avatar",
      "roblox character design",
      "roblox modeling",
      "roblox ugc",
    ],
    mainService: "Roblox Character Design",
    category: "Game Art / Character Design",
    subServices: [
      "Dynamic Head",
      "Furry Avatar",
      "UGC Character",
      "YouTube Character",
      "VTuber Character",
      "Game Character",
    ],
    buyerTypes: [
      "Roblox YouTubers",
      "Roblox game developers",
      "UGC creators",
      "VTubers using Roblox avatars",
      "Players wanting a custom identity",
    ],
    useCases: [
      "Content creator branding",
      "In-game avatar identity",
      "UGC marketplace listing",
      "VTuber / streamer presence",
      "Promotional or thumbnail character art",
    ],
  },
  {
    id: "logo-design",
    keywords: ["logo design", "logo", "brand logo", "logotype"],
    mainService: "Logo Design",
    category: "Branding / Graphic Design",
    subServices: [
      "Wordmark logo",
      "Icon / symbol logo",
      "Mascot logo",
      "Logo redesign",
      "Brand mark + variations",
    ],
    buyerTypes: [
      "Startup founders",
      "Small business owners",
      "Content creators",
      "E-commerce sellers",
    ],
    useCases: [
      "Business branding",
      "Social media identity",
      "Website header",
      "Product packaging",
      "Pitch decks",
    ],
  },
  {
    id: "youtube-thumbnail",
    keywords: [
      "youtube thumbnail",
      "thumbnail design",
      "yt thumbnail",
      "clickbait thumbnail",
    ],
    mainService: "YouTube Thumbnail Design",
    category: "Content Design / Social Media",
    subServices: [
      "Face + text thumbnails",
      "Gaming thumbnails",
      "Tutorial / educational thumbnails",
      "Series / branded thumbnail packs",
      "A/B thumbnail variants",
    ],
    buyerTypes: [
      "YouTubers",
      "Course creators",
      "Gaming creators",
      "Marketing agencies",
    ],
    useCases: [
      "Increase click-through rate",
      "Channel branding consistency",
      "Launch video campaigns",
      "Repurpose for Shorts covers",
    ],
  },
  {
    id: "website-development",
    keywords: [
      "website development",
      "web development",
      "build a website",
      "wordpress website",
      "landing page",
      "web design",
    ],
    mainService: "Website Development",
    category: "Web Development",
    subServices: [
      "Landing page",
      "Business website",
      "Portfolio site",
      "E-commerce storefront",
      "WordPress / no-code site",
      "Website redesign",
    ],
    buyerTypes: [
      "Small businesses",
      "Freelancers & consultants",
      "Local service providers",
      "Online course sellers",
    ],
    useCases: [
      "Lead generation",
      "Online presence",
      "Sell products/services",
      "Portfolio showcase",
      "Event or product launch",
    ],
  },
  {
    id: "copywriting",
    keywords: [
      "copywriting",
      "sales copy",
      "website copy",
      "product description writing",
      "ad copy",
    ],
    mainService: "Copywriting",
    category: "Writing / Marketing",
    subServices: [
      "Website / landing page copy",
      "Product descriptions",
      "Email sequences",
      "Ad copy",
      "About / brand story",
    ],
    buyerTypes: [
      "E-commerce brands",
      "SaaS founders",
      "Coaches & consultants",
      "Marketing teams",
    ],
    useCases: [
      "Convert website visitors",
      "Improve ad performance",
      "Launch a product",
      "Clarify brand messaging",
    ],
  },
  {
    id: "video-editing",
    keywords: [
      "video editing",
      "youtube editing",
      "short form editing",
      "reel editing",
      "tiktok editing",
    ],
    mainService: "Video Editing",
    category: "Video / Content Production",
    subServices: [
      "YouTube long-form editing",
      "Shorts / Reels / TikTok",
      "Podcast video cuts",
      "Promo / ads editing",
      "Thumbnail-synced packaging",
    ],
    buyerTypes: [
      "YouTubers",
      "Podcasters",
      "Brands running ads",
      "Course creators",
    ],
    useCases: [
      "Publish faster with consistent quality",
      "Grow short-form reach",
      "Repurpose long content",
      "Launch campaign creatives",
    ],
  },
  {
    id: "social-media-management",
    keywords: [
      "social media management",
      "social media manager",
      "instagram management",
      "content calendar",
    ],
    mainService: "Social Media Management",
    category: "Marketing / Social Media",
    subServices: [
      "Content calendar planning",
      "Post design + captions",
      "Community replies",
      "Growth reporting",
      "Platform-specific strategy",
    ],
    buyerTypes: [
      "Local businesses",
      "Personal brands",
      "E-commerce shops",
      "Agencies outsourcing execution",
    ],
    useCases: [
      "Stay consistent online",
      "Grow followers and engagement",
      "Support product launches",
      "Build authority in a niche",
    ],
  },
  {
    id: "ui-ux-design",
    keywords: [
      "ui ux",
      "ui/ux",
      "ux design",
      "ui design",
      "app design",
      "figma design",
    ],
    mainService: "UI/UX Design",
    category: "Product Design",
    subServices: [
      "Mobile app UI",
      "Web app dashboard",
      "Wireframes & user flows",
      "Design system / components",
      "Prototype in Figma",
    ],
    buyerTypes: [
      "SaaS founders",
      "Startup product teams",
      "Agencies",
      "Indie app makers",
    ],
    useCases: [
      "Ship a clearer product experience",
      "Prepare investor / beta demos",
      "Redesign confusing flows",
      "Hand off to developers",
    ],
  },
];

export const CATEGORY_FALLBACKS: Array<{
  keywords: string[];
  category: string;
  subServiceTemplates: string[];
  buyerTemplates: string[];
  useCaseTemplates: string[];
}> = [
  {
    keywords: ["design", "illustrat", "graphic", "brand"],
    category: "Design / Creative",
    subServiceTemplates: [
      "Core deliverable",
      "Revision pack",
      "Rush delivery",
      "Brand-aligned variations",
      "Source files included",
    ],
    buyerTemplates: [
      "Small business owners",
      "Creators needing visuals",
      "Startups building brand assets",
    ],
    useCaseTemplates: [
      "Brand presence",
      "Marketing assets",
      "Product or channel packaging",
    ],
  },
  {
    keywords: ["code", "develop", "program", "software", "app", "script"],
    category: "Development / Technical",
    subServiceTemplates: [
      "MVP build",
      "Feature add-on",
      "Bug fix / maintenance",
      "Integration setup",
      "Documentation handoff",
    ],
    buyerTemplates: [
      "Founders with a product idea",
      "Businesses needing automation",
      "Teams missing engineering capacity",
    ],
    useCaseTemplates: [
      "Launch a working product",
      "Automate a workflow",
      "Fix or improve an existing tool",
    ],
  },
  {
    keywords: ["write", "writ", "content", "blog", "article", "script"],
    category: "Writing / Content",
    subServiceTemplates: [
      "Long-form piece",
      "Short-form posts",
      "Script writing",
      "Editing / rewriting",
      "SEO-focused draft",
    ],
    buyerTemplates: [
      "Content marketers",
      "Creators needing scripts",
      "Businesses needing clear messaging",
    ],
    useCaseTemplates: [
      "Publish consistently",
      "Explain an offer clearly",
      "Support SEO or social growth",
    ],
  },
  {
    keywords: ["market", "seo", "ads", "ads ", "growth", "funnel"],
    category: "Marketing / Growth",
    subServiceTemplates: [
      "Strategy setup",
      "Campaign execution",
      "Audit + recommendations",
      "Creative testing pack",
      "Monthly retainership",
    ],
    buyerTemplates: [
      "E-commerce brands",
      "Local service businesses",
      "Online educators",
    ],
    useCaseTemplates: [
      "Get more qualified leads",
      "Improve conversion",
      "Test a new channel",
    ],
  },
];
