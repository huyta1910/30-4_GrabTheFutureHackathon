import axios from "axios";
import { apiClient } from "@/services/api/client";
import type {
  ApiResponse,
  LocationNormalizationResult,
  PassengerDashboard,
  PassengerNotification,
  PassengerProfile,
  PassengerProfilePayload,
  RideHistoryItem,
  RideRequest,
  RideRequestPayload,
  RideStatus,
} from "@/features/passenger/types";

interface VietnamProvinceApiItem {
  name: string;
  code: number;
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

const vietnamAdminClient = axios.create({
  baseURL: "https://provinces.open-api.vn/api/v2",
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

function provinceNameFor(provinces: VietnamProvinceApiItem[], provinceCode: number): string {
  return provinces.find((province) => province.code === provinceCode)?.name ?? "Không rõ tỉnh/thành";
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
  const queryParts = input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => normalizeLocationInput(part).length >= 2);
  const searchTerms = [...new Set([input.trim(), ...queryParts].filter(Boolean))];
  const provinces = await getVietnamProvinces();
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
  const candidateMap = new Map<string, { ward: VietnamWardApiItem; source: "legacy" | "current" }>();

  settledResults.forEach((result) => {
    if (result.status === "fulfilled") {
      result.value.forEach((candidate) => {
        const key = String(candidate.ward.code);
        const existing = candidateMap.get(key);
        if (!existing || existing.source === "current") {
          candidateMap.set(key, candidate);
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
        confidence: scoreWard(
          candidate.ward,
          normalizedInput,
          candidate.source,
          Boolean(hintedProvince),
        ),
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
};
