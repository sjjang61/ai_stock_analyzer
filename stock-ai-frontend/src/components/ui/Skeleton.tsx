import clsx from "clsx";

interface Props {
  className?: string;
  lines?: number;
}

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={clsx("animate-pulse bg-gray-200 rounded", className)} />
);

export const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-6 w-1/2" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <div className="grid grid-cols-3 gap-3 pt-2">
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
    </div>
  </div>
);
