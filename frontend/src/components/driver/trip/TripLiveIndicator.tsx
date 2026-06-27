import { useEffect, useState } from "react";

interface TripLiveIndicatorProps {
  dataUpdatedAt: number;
  isLive: boolean;
}

export function TripLiveIndicator({ dataUpdatedAt, isLive }: TripLiveIndicatorProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const tick = () => setSecondsAgo(Math.floor((Date.now() - dataUpdatedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  if (!isLive) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span>Live · Updated {secondsAgo}s ago</span>
    </div>
  );
}
