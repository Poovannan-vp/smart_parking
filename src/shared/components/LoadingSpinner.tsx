interface Props {
  size?: number;
}

export default function LoadingSpinner({
  size = 24,
}: Props) {
  return (
    <div
      className="animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"
      style={{
        width: size,
        height: size,
      }}
    />
  );
}