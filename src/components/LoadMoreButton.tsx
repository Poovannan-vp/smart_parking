interface LoadMoreButtonProps {
  onClick: () => void;
  label?: string;
}

export default function LoadMoreButton({ onClick, label = "Load more" }: LoadMoreButtonProps) {
  return (
    <li className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:scale-[0.97]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {label}
      </button>
    </li>
  );
}
