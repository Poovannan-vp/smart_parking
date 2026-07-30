interface Props {
  title: string;
  subtitle?: string;
}

export default function PageHeader({
  title,
  subtitle,
}: Props) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        {title}
      </h1>

      {subtitle && (
        <p className="mt-1 text-sm text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}