export type KeywordLevel =
  | "core"
  | "primary"
  | "secondary"
  | "long_tail"
  | "buyer_intent";

export type KeywordDraft = {
  term: string;
  level: KeywordLevel;
  parentTerm: string | null;
  relevance: number;
  specificity: number;
  competitionSignal: number;
  buyerIntent: string;
  relationshipToService: string;
  sortOrder: number;
};

export type KeywordBuildInput = {
  mainService: string;
  category?: string | null;
  subServices?: string[];
  buyerTypes?: string[];
  useCases?: string[];
  listingTags?: string[];
  matchedCatalog?: string | null;
};

/** Catalog-specific secondary / long-tail seeds (rule-based). */
export const KEYWORD_CATALOG_SEEDS: Record<
  string,
  {
    core?: string;
    primary?: string[];
    secondary?: string[];
    longTail?: string[];
    buyerIntent?: string[];
  }
> = {
  "roblox-character-design": {
    core: "Roblox character",
    primary: [
      "Custom Roblox character",
      "Roblox character design",
      "Roblox avatar design",
    ],
    secondary: [
      "Roblox furry avatar",
      "Roblox dynamic head",
      "Roblox UGC character",
      "Roblox game character",
      "Roblox VTuber character",
    ],
    longTail: [
      "Custom Roblox character with dynamic head",
      "Roblox furry avatar for games",
      "UGC Roblox character modeling",
    ],
    buyerIntent: [
      "Custom Roblox character for YouTube",
      "Roblox avatar for content creators",
      "Roblox character for VTubers",
      "Hire Roblox character designer",
    ],
  },
  "logo-design": {
    core: "Logo design",
    primary: ["Custom logo design", "Business logo", "Brand logo design"],
    secondary: ["Minimalist logo", "Mascot logo", "Wordmark logo"],
    longTail: ["Custom logo design for startups", "Logo redesign for small business"],
    buyerIntent: [
      "Logo design for my business",
      "Professional logo for website",
      "Hire logo designer",
    ],
  },
  "youtube-thumbnail": {
    core: "YouTube thumbnail",
    primary: ["YouTube thumbnail design", "Custom YouTube thumbnails"],
    secondary: ["Gaming YouTube thumbnails", "Clickable thumbnail design"],
    longTail: ["YouTube thumbnail pack for creators"],
    buyerIntent: [
      "YouTube thumbnails to get more clicks",
      "Hire YouTube thumbnail designer",
    ],
  },
  "website-development": {
    core: "Website development",
    primary: ["Custom website development", "Business website design"],
    secondary: ["Landing page development", "WordPress website"],
    longTail: ["Custom website for small business"],
    buyerIntent: [
      "Build a website for my business",
      "Hire website developer",
    ],
  },
  "copywriting": {
    core: "Copywriting",
    primary: ["Sales copywriting", "Website copywriting"],
    secondary: ["Landing page copy", "Product description writing"],
    longTail: ["Conversion copywriting for landing pages"],
    buyerIntent: ["Copywriter for my product launch", "Hire copywriter"],
  },
  "video-editing": {
    core: "Video editing",
    primary: ["YouTube video editing", "Professional video editing"],
    secondary: ["Short form video editing", "Podcast video editing"],
    longTail: ["YouTube video editing for creators"],
    buyerIntent: ["Edit my YouTube videos", "Hire video editor"],
  },
  "social-media-management": {
    core: "Social media management",
    primary: ["Social media manager", "Instagram management"],
    secondary: ["Content calendar management", "Social media content creation"],
    longTail: ["Social media management for small business"],
    buyerIntent: [
      "Manage my Instagram account",
      "Hire social media manager",
    ],
  },
  "ui-ux-design": {
    core: "UI UX design",
    primary: ["UI design", "UX design", "App UI design"],
    secondary: ["Figma UI design", "Dashboard UX design"],
    longTail: ["UI UX design for SaaS apps"],
    buyerIntent: ["Design my app UI", "Hire UI UX designer"],
  },
};

export const LEVEL_LABELS: Record<KeywordLevel, string> = {
  core: "Core",
  primary: "Primary",
  secondary: "Secondary",
  long_tail: "Long-tail",
  buyer_intent: "Buyer-intent",
};
