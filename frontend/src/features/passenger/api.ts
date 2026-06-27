import axios from "axios";
import { apiClient } from "@/services/api/client";
import type {
  ApiResponse,
  DeviceCoordinates,
  LocationNormalizationResult,
  PassengerDashboard,
  PassengerLocationSuggestion,
  PassengerNotification,
  PassengerProfile,
  PassengerProfilePayload,
  RideHistoryItem,
  RideRequest,
  RideRequestPayload,
  RideStatus,
  VietnamProvinceOption,
  VietnamWardOption,
} from "@/features/passenger/types";

interface VietnamProvinceApiItem {
  name: string;
  code: number;
  wards?: VietnamWardApiItem[];
}

interface VietnamWardApiItem {
  name: string;
  code: number;
  division_type: string;
  province_code: number;
}

interface VietnamLegacyWardApiItem {
  source_code: number;
  ward: VietnamWardApiItem;
}

interface NominatimSearchItem {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

interface NominatimReverseItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    quarter?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
  };
}

const vietnamAdminClient = axios.create({
  baseURL: "https://provinces.open-api.vn/api/v2",
  timeout: 10_000,
});

const mapSearchClient = axios.create({
  baseURL: "https://nominatim.openstreetmap.org",
  timeout: 10_000,
});

let provinceCache: VietnamProvinceApiItem[] | null = null;

async function unwrap<TData>(request: Promise<{ data: ApiResponse<TData> }>): Promise<TData> {
  const response = await request;
  return response.data.data;
}

function stripVietnameseTone(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalizeLocationInput(value: string): string {
  return stripVietnameseTone(value)
    .toLowerCase()
    .replace(/\b(tp|t\.p|thanh pho|tinh|quan|q\.|huyen|h\.|thi xa|tx\.|phuong|p\.|xa|thi tran|tt\.|dac khu)\b/g, " ")
    .replace(/[,.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAddressPart(value: string): string {
  return value
    .trim()
    .replace(/^\d+[a-zA-Z]?([/-]\d+[a-zA-Z]?)*\s+/, "")
    .replace(/\b\d{5,6}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulAdministrativePart(value: string): boolean {
  const normalizedValue = normalizeLocationInput(value);

  if (normalizedValue.length < 2) {
    return false;
  }

  if (["vietnam", "viet nam"].includes(normalizedValue)) {
    return false;
  }

  if (/^\d+$/.test(normalizedValue)) {
    return false;
  }

  return true;
}

function withoutAdministrativePrefix(value: string): string {
  return value
    .replace(/^\s*(phuong|p\.|xa|thi tran|tt\.|dac khu|quan|q\.|huyen|h\.|thanh pho|tp\.|tinh)\s+/i, "")
    .trim();
}

function buildAdministrativeSearchTerms(input: string, provinces: VietnamProvinceApiItem[]): string[] {
  const parts = input
    .split(",")
    .map(cleanAddressPart)
    .filter(isUsefulAdministrativePart);
  const provinceHints = provinces.filter((province) =>
    normalizeLocationInput(input).includes(normalizeLocationInput(province.name)),
  );
  const wardLikeParts = parts.filter((part) =>
    /(^|\s)(phuong|p\.|xa|thi tran|tt\.|dac khu)(\s|$)/i.test(part),
  );
  const nonStreetParts = parts.filter(
    (part) => !/(^|\s)(duong|street|road|hem|ngo|alley|khu pho)(\s|$)/i.test(part),
  );
  const terms = [...wardLikeParts, ...nonStreetParts, ...parts, cleanAddressPart(input)];

  wardLikeParts.forEach((part) => {
    const strippedPart = withoutAdministrativePrefix(part);
    if (strippedPart) {
      terms.push(strippedPart);
    }

    provinceHints.forEach((province) => {
      terms.push(`${part}, ${province.name}`);
      if (strippedPart) {
        terms.push(`${strippedPart}, ${province.name}`);
      }
    });
  });

  return [...new Set(terms.map(cleanAddressPart).filter(isUsefulAdministrativePart))];
}

function displayLocation(ward: VietnamWardApiItem, provinceName: string): string {
  return `${ward.name}, ${provinceName}`;
}

async function getVietnamProvinces(): Promise<VietnamProvinceApiItem[]> {
  if (provinceCache) {
    return provinceCache;
  }

  const response = await vietnamAdminClient.get<VietnamProvinceApiItem[]>("/p/");
  provinceCache = response.data;
  return provinceCache;
}

export async function getVietnamProvinceOptions(): Promise<VietnamProvinceOption[]> {
  const provinces = await getVietnamProvinces();
  return provinces
    .map((province) => ({
      code: province.code,
      name: province.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getVietnamWardOptions(provinceCode: number): Promise<VietnamWardOption[]> {
  const response = await vietnamAdminClient.get<VietnamProvinceApiItem>(`/p/${provinceCode}`, {
    params: { depth: 2 },
  });

  return (response.data.wards ?? [])
    .map((ward) => ({
      code: ward.code,
      name: ward.name,
      province_code: ward.province_code,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function provinceNameFor(provinces: VietnamProvinceApiItem[], provinceCode: number): string {
  return provinces.find((province) => province.code === provinceCode)?.name ?? "Unknown province/city";
}

function distanceInMeters(start: DeviceCoordinates, end: DeviceCoordinates): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(
    earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)),
  );
}

function scoreWard(
  ward: VietnamWardApiItem,
  normalizedInput: string,
  source: "legacy" | "current",
  hasProvinceHint: boolean,
): number {
  const normalizedWard = normalizeLocationInput(ward.name);
  const exactMatch = normalizedWard === normalizedInput;
  const containsMatch =
    normalizedInput.includes(normalizedWard) || normalizedWard.includes(normalizedInput);
  const baseScore = source === "legacy" ? 0.9 : 0.78;
  const score = exactMatch ? baseScore + 0.08 : containsMatch ? baseScore + 0.04 : baseScore;
  return Math.min(score + (hasProvinceHint ? 0.03 : 0), 0.99);
}

async function findVietnamLocationCandidates(input: string) {
  const normalizedInput = normalizeLocationInput(input);
  const provinces = await getVietnamProvinces();
  const searchTerms = buildAdministrativeSearchTerms(input, provinces);
  const hintedProvince = provinces.find((province) =>
    normalizedInput.includes(normalizeLocationInput(province.name)),
  );

  const requests = searchTerms.flatMap((term) => [
    vietnamAdminClient
      .get<VietnamLegacyWardApiItem[]>("/w/from-legacy/", { params: { legacy_name: term } })
      .then((response) => response.data.map((item) => ({ ward: item.ward, source: "legacy" as const }))),
    vietnamAdminClient
      .get<VietnamWardApiItem[]>("/w/", { params: { search: term } })
      .then((response) => response.data.map((ward) => ({ ward, source: "current" as const }))),
  ]);

  const settledResults = await Promise.allSettled(requests);
  const candidateMap = new Map<
    string,
    { ward: VietnamWardApiItem; source: "legacy" | "current"; confidence: number }
  >();

  settledResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const term = searchTerms[Math.floor(index / 2)] ?? input;
      const normalizedTerm = normalizeLocationInput(term);
      result.value.forEach((candidate) => {
        const key = String(candidate.ward.code);
        const existing = candidateMap.get(key);
        const confidence = Math.max(
          scoreWard(candidate.ward, normalizedTerm, candidate.source, Boolean(hintedProvince)),
          scoreWard(candidate.ward, normalizedInput, candidate.source, Boolean(hintedProvince)) - 0.04,
        );

        if (!existing || confidence > existing.confidence) {
          candidateMap.set(key, { ...candidate, confidence });
        }
      });
    }
  });

  return [...candidateMap.values()]
    .filter((candidate) =>
      hintedProvince ? candidate.ward.province_code === hintedProvince.code : true,
    )
    .map((candidate) => {
      const province = provinceNameFor(provinces, candidate.ward.province_code);
      return {
        province,
        commune_or_ward: candidate.ward.name,
        administrative_code: String(candidate.ward.code),
        confidence: candidate.confidence,
      };
    })
    .sort((left, right) => right.confidence - left.confidence || left.province.localeCompare(right.province));
}

export async function normalizeVietnamLocation(input: string): Promise<LocationNormalizationResult> {
  const normalizedInput = normalizeLocationInput(input);

  if (normalizedInput.length < 2) {
    return {
      status: "need_clarification",
      input,
      normalized_input: normalizedInput,
      matched_location: null,
      reasoning: "Input is too short to resolve to a 2025 commune, ward, or special zone.",
      alternatives: [],
    };
  }

  const candidates = await findVietnamLocationCandidates(input);
  const bestCandidate = candidates[0] ?? null;
  const closeAlternatives = candidates.filter(
    (candidate) => bestCandidate && bestCandidate.confidence - candidate.confidence <= 0.08,
  );

  if (!bestCandidate) {
    return {
      status: "not_found",
      input,
      normalized_input: normalizedInput,
      matched_location: null,
      reasoning:
        "No 2025 commune, ward, or special zone matched. Please include the commune/ward/special-zone name and province/city.",
      alternatives: [],
    };
  }

  if (closeAlternatives.length > 1) {
    return {
      status: "ambiguous",
      input,
      normalized_input: normalizedInput,
      matched_location: bestCandidate,
      reasoning: "Multiple 2025 administrative units matched this input. Select the intended unit.",
      alternatives: closeAlternatives.slice(0, 5),
    };
  }

  if (bestCandidate.confidence < 0.86) {
    return {
      status: "need_clarification",
      input,
      normalized_input: normalizedInput,
      matched_location: bestCandidate,
      reasoning:
        "The best match is below the confidence threshold. Which commune/ward/special zone and province/city do you mean?",
      alternatives: candidates.slice(0, 5),
    };
  }

  return {
    status: "success",
    input,
    normalized_input: normalizedInput,
    matched_location: bestCandidate,
    reasoning: `Resolved to ${displayLocation(
      {
        name: bestCandidate.commune_or_ward,
        code: Number(bestCandidate.administrative_code),
        division_type: "",
        province_code: 0,
      },
      bestCandidate.province,
    )} using Vietnam Provinces Open API v2 after the 07/2025 reorganization.`,
    alternatives: candidates.slice(1, 5),
  };
}

export async function searchVietnamLocationSuggestions(
  input: string,
  coordinates?: DeviceCoordinates | null,
): Promise<PassengerLocationSuggestion[]> {
  const query = input.trim();
  if (query.length < 2) {
    return [];
  }

  const params: Record<string, string | number> = {
    q: query,
    format: "jsonv2",
    countrycodes: "vn",
    addressdetails: 1,
    limit: 8,
  };

  if (coordinates) {
    const latitudeSpan = 0.3;
    const longitudeSpan = 0.3;
    params.viewbox = [
      coordinates.longitude - longitudeSpan,
      coordinates.latitude + latitudeSpan,
      coordinates.longitude + longitudeSpan,
      coordinates.latitude - latitudeSpan,
    ].join(",");
    params.bounded = 0;
  }

  const response = await mapSearchClient.get<NominatimSearchItem[]>("/search", { params });

  return response.data
    .map((item) => {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      return {
        id: String(item.place_id),
        label: item.display_name,
        name: item.name || item.display_name.split(",")[0]?.trim() || item.display_name,
        address: item.display_name,
        latitude,
        longitude,
        distance_meters: coordinates
          ? distanceInMeters(coordinates, { latitude, longitude })
          : null,
      };
    })
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
    .sort((left, right) => {
      if (left.distance_meters === null || right.distance_meters === null) {
        return left.name.localeCompare(right.name);
      }
      return left.distance_meters - right.distance_meters;
    });
}

export async function reverseGeocodeDeviceLocation(
  coordinates: DeviceCoordinates,
): Promise<PassengerLocationSuggestion> {
  const response = await mapSearchClient.get<NominatimReverseItem>("/reverse", {
    params: {
      lat: coordinates.latitude,
      lon: coordinates.longitude,
      format: "jsonv2",
      addressdetails: 1,
      zoom: 18,
    },
  });
  const item = response.data;
  const address = item.address;
  const road = address?.road ?? address?.pedestrian;
  const name = [address?.house_number, road].filter(Boolean).join(" ") || item.display_name;

  return {
    id: String(item.place_id),
    label: item.display_name,
    name,
    address: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    distance_meters: 0,
  };
}

export const passengerApi = {
  getDashboard(passengerId: string) {
    return unwrap<PassengerDashboard>(apiClient.get(`/passengers/${passengerId}/dashboard`));
  },
  getProfile(passengerId: string) {
    return unwrap<PassengerProfile>(apiClient.get(`/passengers/${passengerId}/profile`));
  },
  updateProfile(passengerId: string, payload: PassengerProfilePayload) {
    return unwrap<PassengerProfile>(apiClient.patch(`/passengers/${passengerId}/profile`, payload));
  },
  requestRide(passengerId: string, payload: RideRequestPayload) {
    return unwrap<RideRequest>(apiClient.post(`/passengers/${passengerId}/rides`, payload));
  },
  cancelCurrentRide(passengerId: string) {
    return unwrap<RideRequest>(apiClient.patch(`/passengers/${passengerId}/rides/current/cancel`));
  },
  getRideStatus(passengerId: string) {
    return unwrap<RideStatus>(apiClient.get(`/passengers/${passengerId}/rides/status`));
  },
  getRideHistory(passengerId: string) {
    return unwrap<RideHistoryItem[]>(apiClient.get(`/passengers/${passengerId}/rides/history`));
  },
  getNotifications(passengerId: string) {
    return unwrap<PassengerNotification[]>(apiClient.get(`/passengers/${passengerId}/notifications`));
  },
  markNotificationRead(passengerId: string, notificationId: string) {
    return unwrap<PassengerNotification>(
      apiClient.patch(`/passengers/${passengerId}/notifications/${notificationId}/read`),
    );
  },
  normalizeVietnamLocation,
  searchVietnamLocationSuggestions,
  reverseGeocodeDeviceLocation,
  getVietnamProvinceOptions,
  getVietnamWardOptions,
};
