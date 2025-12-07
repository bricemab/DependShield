export class EpssScoreDto {
  cve: string;
  epss: number; // 0.0 to 1.0
  percentile: number; // 0.0 to 1.0
  date: string; // YYYY-MM-DD
}

export class EpssApiResponse {
  status: string;
  'status-code': number;
  version: string;
  access: string;
  total: number;
  offset: number;
  limit: number;
  data: EpssScoreDto[];
}
