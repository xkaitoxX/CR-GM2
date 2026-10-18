// Checks an Amazon listing draft against Amazon's title rules and common good practice.

export interface ListingDraft {
  title: string;
  bullets: string[];
  description?: string;
}

export interface ListingCheck {
  ok: boolean;
  /** Breaks Amazon's rules: fix before using. */
  problems: string[];
  /** Allowed, but worth improving. */
  warnings: string[];
}

export const MAX_TITLE = 200;
export const MOBILE_TITLE = 80;
export const MAX_BULLETS = 5;
export const MAX_BULLET_LENGTH = 250;
const RESTRICTED_CHARACTERS = ["!", "$", "?", "_", "{", "}", "^", "¬", "¦"];
/** Small words that don't count towards the "same word more than twice" rule. */
const SMALL_WORDS = new Set(["a", "an", "the", "and", "or", "for", "with", "of", "to", "in", "on", "by", "at", "&", "x"]);
const PROMOTIONAL = [
  "best seller",
  "bestseller",
  "best-seller",
  "free delivery",
  "free shipping",
  "sale",
  "100%",
  "guarantee",
  "guaranteed",
  "no.1",
  "no 1",
  "#1",
  "cheapest",
  "limited time",
  "discount",
  "hot item",
];

const hasPhrase = (text: string, phrase: string) =>
  new RegExp(`(^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&")}($|[^a-z0-9])`, "i").test(text);

export function checkListing({ title, bullets, description = "" }: ListingDraft): ListingCheck {
  const problems: string[] = [];
  const warnings: string[] = [];
  const t = title.trim();

  if (!t) problems.push("The title is empty.");
  if (t.length > MAX_TITLE) problems.push(`The title is ${t.length} characters; Amazon allows ${MAX_TITLE}.`);
  const badCharacters = RESTRICTED_CHARACTERS.filter((c) => t.includes(c));
  if (badCharacters.length) problems.push(`The title uses characters Amazon doesn't allow: ${badCharacters.join(" ")}`);

  const counts = new Map<string, number>();
  for (const word of t.toLowerCase().split(/[\s,/|-]+/).filter(Boolean)) {
    if (!SMALL_WORDS.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const repeated = [...counts].filter(([, n]) => n > 2).map(([w]) => w);
  if (repeated.length) problems.push(`The title uses the same word more than twice: ${repeated.join(", ")}`);

  if (bullets.length > MAX_BULLETS) problems.push(`There are ${bullets.length} bullet points; use ${MAX_BULLETS} at most.`);
  bullets.forEach((b, i) => {
    if (b.length > MAX_BULLET_LENGTH) {
      warnings.push(`Bullet point ${i + 1} is ${b.length} characters; keep it under ${MAX_BULLET_LENGTH} so it's easy to read.`);
    }
  });
  if (t.length > MOBILE_TITLE) {
    warnings.push(`Only about the first ${MOBILE_TITLE} characters of the title show on phones. Put the most important words first.`);
  }

  const allText = [t, ...bullets, description].join("\n");
  const promo = PROMOTIONAL.filter((p) => hasPhrase(allText, p));
  if (promo.length) {
    warnings.push(`Avoid promotional claims Amazon may remove: ${promo.map((p) => `"${p}"`).join(", ")}`);
  }

  return { ok: problems.length === 0, problems, warnings };
}
