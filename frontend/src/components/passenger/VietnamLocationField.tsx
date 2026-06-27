import type { ReactNode } from "react";
import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNormalizeVietnamLocation } from "@/features/passenger/hooks";
import type { VietnamAdministrativeLocation } from "@/features/passenger/types";
import { cn } from "@/utils/cn";

interface VietnamLocationFieldProps {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

function formatAdministrativeLocation(location: VietnamAdministrativeLocation): string {
  return `${location.commune_or_ward}, ${location.province}`;
}

export function VietnamLocationField({
  label,
  icon,
  value,
  onChange,
  disabled = false,
  error,
  placeholder,
}: VietnamLocationFieldProps) {
  const normalizeLocation = useNormalizeVietnamLocation();
  const candidates =
    normalizeLocation.data?.status === "success" && normalizeLocation.data.matched_location
      ? [normalizeLocation.data.matched_location, ...normalizeLocation.data.alternatives]
      : normalizeLocation.data?.alternatives ?? [];

  const handleNormalize = () => {
    normalizeLocation.mutate(value);
  };

  const handleSelect = (location: VietnamAdministrativeLocation) => {
    onChange(formatAdministrativeLocation(location));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          placeholder={placeholder}
          disabled={disabled || normalizeLocation.isPending}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleNormalize}
          disabled={disabled || normalizeLocation.isPending || value.trim().length < 2}
          title="Normalize Vietnam administrative location"
          aria-label={`Normalize ${label}`}
        >
          {normalizeLocation.isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {normalizeLocation.isError ? (
        <p className="text-sm text-destructive">Location normalization service is unavailable.</p>
      ) : null}
      {normalizeLocation.data ? (
        <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 font-medium capitalize",
                normalizeLocation.data.status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : normalizeLocation.data.status === "ambiguous"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-rose-200 bg-rose-50 text-rose-700",
              )}
            >
              {normalizeLocation.data.status.replace("_", " ")}
            </span>
            <span className="text-muted-foreground">
              Normalized: {normalizeLocation.data.normalized_input || "none"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{normalizeLocation.data.reasoning}</p>
          {candidates.length > 0 ? (
            <div className="grid gap-2">
              {candidates.map((candidate) => (
                <button
                  key={`${candidate.administrative_code}-${candidate.province}`}
                  type="button"
                  className="flex items-start justify-between gap-3 rounded-md border bg-background p-2 text-left text-sm hover:bg-accent"
                  onClick={() => handleSelect(candidate)}
                  disabled={disabled}
                >
                  <span>
                    <span className="block font-medium">{formatAdministrativeLocation(candidate)}</span>
                    <span className="block text-xs text-muted-foreground">
                      Code {candidate.administrative_code}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {Math.round(candidate.confidence * 100)}%
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
