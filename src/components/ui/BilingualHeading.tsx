type BilingualHeadingProps = {
  titleZh: string;
  titleEn: string;
  descriptionZh?: string;
  descriptionEn?: string;
  className?: string;
};

/**
 * Primary page title: Chinese first, English subtitle second.
 * A short colored accent bar above the title provides visual anchoring.
 */
export default function BilingualHeading({
  titleZh,
  titleEn,
  descriptionZh,
  descriptionEn,
  className = "",
}: BilingualHeadingProps) {
  return (
    <header className={`mb-8 ${className}`}>
      <span className="mb-3 inline-flex h-1.5 w-10 rounded-full bg-gradient-to-r from-primary-500 to-primary-700" />
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[32px]">
        {titleZh}
      </h1>
      <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-primary-600">{titleEn}</p>
      {descriptionZh && descriptionEn ? (
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-slate-700">
          <span className="block">{descriptionZh}</span>
          <span className="mt-1.5 block text-sm text-slate-500">{descriptionEn}</span>
        </p>
      ) : null}
    </header>
  );
}
