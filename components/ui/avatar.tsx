// components/ui/avatar.tsx
type AvatarProps = {
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md";
};

const sizeMap: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-9 w-9",
  sm: "h-11 w-11",
  md: "h-16 w-16",
};

export function Avatar({ src, alt, size = "md" }: AvatarProps) {
  const sizeClass = sizeMap[size];

  if (!src) {
    return (
      <div
        className={`${sizeClass} inline-flex items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300`}
      >
        <span>?</span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ""}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
