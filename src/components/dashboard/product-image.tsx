import Image from "next/image";

const TINTS = ["--series-1", "--series-2", "--series-3", "--series-4", "--series-5", "--series-6"];

const initials = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

/** Same item, same tint, every time. */
const tintFor = (name: string) =>
  TINTS[Math.abs([...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % TINTS.length];

/**
 * An item's photo in a rounded square. Without a photo it shows the item's initials on a soft tint.
 * Pass a pixel size, or "fill" to cover a parent that sets its own size and `position: relative`.
 */
export default function ProductImage({ name, src, size }: { name: string; src?: string; size: number | "fill" }) {
  const box = size === "fill" ? "absolute inset-0" : "shrink-0 rounded-lg";
  const style = size === "fill" ? undefined : { width: size, height: size };

  if (!src) {
    const tint = tintFor(name);
    return (
      <div
        role="img"
        aria-label={name}
        className={`${box} flex items-center justify-center font-semibold text-zinc-800 dark:text-zinc-100`}
        style={{
          ...style,
          background: `color-mix(in srgb, var(${tint}) 22%, transparent)`,
          fontSize: size === "fill" ? "2rem" : Math.max(10, Math.round(size * 0.36)),
        }}
      >
        {initials(name)}
      </div>
    );
  }

  return size === "fill" ? (
    <Image src={src} alt={name} fill sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw" className="object-cover" />
  ) : (
    <Image src={src} alt={name} width={size} height={size} className={`${box} bg-white object-cover`} style={style} />
  );
}
