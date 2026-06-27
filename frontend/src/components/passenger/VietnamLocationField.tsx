import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Check, LocateFixed, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useNormalizeVietnamLocation,
  useReverseGeocodeDeviceLocation,
  useVietnamProvinceOptions,
  useVietnamWardOptions,
} from "@/features/passenger/hooks";
import type {
  DeviceCoordinates,
  PassengerLocationSuggestion,
  VietnamAdministrativeLocation,
} from "@/features/passenger/types";
import { cn } from "@/utils/cn";

interface VietnamLocationFieldProps {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  onCoordinatesChange?: (coordinates: DeviceCoordinates | null) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

interface AddressParts {
  houseNumber: string;
  road: string;
  ward: string;
  cityOrProvince: string;
  provinceCode: number | null;
}

function formatAdministrativeLocation(location: VietnamAdministrativeLocation): string {
  return `${location.commune_or_ward}, ${location.province}`;
}

function composeAddress(parts: AddressParts): string {
  return [parts.houseNumber, parts.road, parts.ward, parts.cityOrProvince]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function partsFromSuggestion(suggestion: PassengerLocationSuggestion): AddressParts {
  const addressParts = suggestion.address.split(",").map((part) => part.trim());
  const firstLineParts = suggestion.name.split(" ").filter(Boolean);
  const houseNumber = firstLineParts[0]?.match(/^\d+[a-zA-Z]?/) ? firstLineParts[0] : "";
  const road = houseNumber ? firstLineParts.slice(1).join(" ") : suggestion.name;

  return {
    houseNumber,
    road,
    ward: addressParts.find((part) => /phuong|ward|xa|commune/i.test(part)) ?? "",
    cityOrProvince:
      addressParts.find((part) => /ho chi minh|ha noi|da nang|city|province/i.test(part)) ??
      addressParts.at(-2) ??
      "",
    provinceCode: null,
  };
}

export function VietnamLocationField({
  label,
  icon,
  value,
  onChange,
  onCoordinatesChange,
  disabled = false,
  error,
  placeholder,
}: VietnamLocationFieldProps) {
  const [addressParts, setAddressParts] = useState<AddressParts>({
    houseNumber: "",
    road: "",
    ward: "",
    cityOrProvince: "",
    provinceCode: null,
  });
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "allowed" | "blocked">(
    "idle",
  );
  const normalizeLocation = useNormalizeVietnamLocation();
  const reverseGeocode = useReverseGeocodeDeviceLocation();
  const provinces = useVietnamProvinceOptions();
  const wards = useVietnamWardOptions(addressParts.provinceCode);
  const candidates =
    normalizeLocation.data?.status === "success" && normalizeLocation.data.matched_location
      ? [normalizeLocation.data.matched_location, ...normalizeLocation.data.alternatives]
      : normalizeLocation.data?.alternatives ?? [];
  const composedAddress = useMemo(() => composeAddress(addressParts), [addressParts]);
  const selectedWardCode =
    wards.data?.find((ward) => ward.name === addressParts.ward)?.code ??
    wards.data?.find((ward) => {
      const normalizedWard = normalizeText(ward.name);
      const normalizedAddressWard = normalizeText(addressParts.ward);
      return (
        normalizedAddressWard.length > 0 &&
        (normalizedWard.includes(normalizedAddressWard) ||
          normalizedAddressWard.includes(normalizedWard))
      );
    })?.code ??
    "";

  useEffect(() => {
    if (value.length === 0 && composedAddress.length > 0) {
      setAddressParts({
        houseNumber: "",
        road: "",
        ward: "",
        cityOrProvince: "",
        provinceCode: null,
      });
    }
  }, [composedAddress.length, value.length]);

  useEffect(() => {
    if (!wards.data || addressParts.ward.length === 0) {
      return;
    }

    const matchedWard = wards.data.find((ward) => String(ward.code) === String(selectedWardCode));
    if (matchedWard && matchedWard.name !== addressParts.ward) {
      const nextParts = { ...addressParts, ward: matchedWard.name };
      setAddressParts(nextParts);
      onChange(composeAddress(nextParts));
    }
  }, [addressParts, onChange, selectedWardCode, wards.data]);

  const updateAddressPart = (key: keyof AddressParts, nextValue: string) => {
    const nextParts = { ...addressParts, [key]: nextValue };
    setAddressParts(nextParts);
    onCoordinatesChange?.(null);
    onChange(composeAddress(nextParts));
  };

  const handleProvinceChange = (provinceCodeValue: string) => {
    const provinceCode = provinceCodeValue ? Number(provinceCodeValue) : null;
    const provinceName =
      provinces.data?.find((province) => province.code === provinceCode)?.name ?? "";
    const nextParts = {
      ...addressParts,
      ward: "",
      cityOrProvince: provinceName,
      provinceCode,
    };
    setAddressParts(nextParts);
    onCoordinatesChange?.(null);
    onChange(composeAddress(nextParts));
  };

  const handleWardChange = (wardCodeValue: string) => {
    const ward = wards.data?.find((item) => String(item.code) === wardCodeValue);
    const nextParts = {
      ...addressParts,
      ward: ward?.name ?? "",
    };
    setAddressParts(nextParts);
    onCoordinatesChange?.(null);
    onChange(composeAddress(nextParts));
  };

  const handleNormalize = () => {
    normalizeLocation.mutate(composedAddress || value);
  };

  const handleSelect = (location: VietnamAdministrativeLocation) => {
    const formattedLocation = formatAdministrativeLocation(location);
    setAddressParts((currentParts) => ({
      ...currentParts,
      ward: location.commune_or_ward,
      cityOrProvince: location.province,
      provinceCode:
        provinces.data?.find((province) => province.name === location.province)?.code ?? null,
    }));
    onCoordinatesChange?.(null);
    onChange(formattedLocation);
  };

  const applyDeviceLocation = (suggestion: PassengerLocationSuggestion) => {
    const inferredParts = partsFromSuggestion(suggestion);
    const matchedProvince = provinces.data?.find((province) =>
      normalizeText(suggestion.address).includes(normalizeText(province.name)),
    );
    const nextParts = {
      ...inferredParts,
      cityOrProvince: matchedProvince?.name ?? inferredParts.cityOrProvince,
      provinceCode: matchedProvince?.code ?? null,
    };
    setAddressParts(nextParts);
    onCoordinatesChange?.({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
    onChange(composeAddress(nextParts) || suggestion.label);
    normalizeLocation.mutate(suggestion.label);
  };

  const handleUseDeviceLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("blocked");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates: DeviceCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        reverseGeocode.mutate(coordinates, {
          onSuccess: (suggestion) => {
            applyDeviceLocation(suggestion);
            setLocationStatus("allowed");
          },
          onError: () => setLocationStatus("blocked"),
        });
      },
      () => setLocationStatus("blocked"),
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 8_000,
      },
    );
  };

  const isBusy = normalizeLocation.isPending || reverseGeocode.isPending;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </div>
      <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
        <Input
          value={addressParts.houseNumber}
          onChange={(event) => updateAddressPart("houseNumber", event.target.value)}
          aria-invalid={Boolean(error)}
          placeholder="Home no."
          disabled={disabled || isBusy}
          autoComplete="off"
        />
        <Input
          value={addressParts.road}
          onChange={(event) => updateAddressPart("road", event.target.value)}
          aria-invalid={Boolean(error)}
          placeholder={placeholder ?? "Road or building"}
          disabled={disabled || isBusy}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={addressParts.provinceCode ?? ""}
          onChange={(event) => handleProvinceChange(event.target.value)}
          aria-invalid={Boolean(error)}
          disabled={disabled || isBusy || provinces.isLoading}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">{provinces.isLoading ? "Loading provinces..." : "City or province"}</option>
          {provinces.data?.map((province) => (
            <option key={province.code} value={province.code}>
              {province.name}
            </option>
          ))}
        </select>
        <select
          value={selectedWardCode}
          onChange={(event) => handleWardChange(event.target.value)}
          aria-invalid={Boolean(error)}
          disabled={disabled || isBusy || addressParts.provinceCode === null || wards.isLoading}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">
            {addressParts.provinceCode === null
              ? "Choose province first"
              : wards.isLoading
                ? "Loading wards..."
                : "Ward, commune, or special zone"}
          </option>
          {wards.data?.map((ward) => (
            <option key={ward.code} value={ward.code}>
              {ward.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleUseDeviceLocation}
          disabled={disabled || locationStatus === "loading" || reverseGeocode.isPending}
        >
          {locationStatus === "loading" || reverseGeocode.isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
          )}
          Choose current location
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleNormalize}
          disabled={disabled || normalizeLocation.isPending || (composedAddress || value).length < 2}
        >
          {normalizeLocation.isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          Normalize
        </Button>
      </div>
      {locationStatus === "allowed" ? (
        <p className="text-xs text-muted-foreground">Current device location was applied.</p>
      ) : null}
      {locationStatus === "blocked" ? (
        <p className="text-xs text-muted-foreground">
          Device location is unavailable. Enter the address manually.
        </p>
      ) : null}
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
