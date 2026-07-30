interface Props {
  title: string;
  capacity: number;
  occupied: number;
  onIncrease: () => void;
  onDecrease: () => void;
  disabled?: boolean;
}

export default function ParkingCounterCard({
  title,
  capacity,
  occupied,
  onIncrease,
  onDecrease,
  disabled = false,
}: Props) {
  const available = capacity - occupied;

  return (
    <div className="rounded-xl bg-white p-5 shadow">

      <h2 className="mb-4 text-lg font-semibold">
        {title}
      </h2>

      <div className="grid grid-cols-3 gap-4 text-center">

        <div>
          <p className="text-2xl font-bold text-blue-600">
            {capacity}
          </p>

          <p className="text-sm text-slate-500">
            Capacity
          </p>
        </div>

        <div>
          <p className="text-2xl font-bold text-green-600">
            {available}
          </p>

          <p className="text-sm text-slate-500">
            Available
          </p>
        </div>

        <div>
          <p className="text-2xl font-bold text-red-600">
            {occupied}
          </p>

          <p className="text-sm text-slate-500">
            Occupied
          </p>
        </div>

      </div>

      <div className="mt-6 flex items-center justify-center gap-6">

        <button
          type="button"
          onClick={onDecrease}
          disabled={disabled || occupied === 0}
          aria-label={`Remove vehicle from ${title}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-xl font-bold text-white hover:bg-red-600"
        >
          -
        </button>

        <span className="text-2xl font-bold">
          {occupied}
        </span>

        <button
          type="button"
          onClick={onIncrease}
          disabled={disabled || occupied >= capacity}
          aria-label={`Add vehicle to ${title}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-xl font-bold text-white hover:bg-green-600"
        >
          +
        </button>

      </div>

    </div>
  );
}
