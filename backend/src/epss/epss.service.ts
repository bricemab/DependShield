import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import axios from 'axios';
import { EpssScoreDto } from './dto/epss-score.dto';

@Injectable()
export class EpssService {
    private readonly logger = new Logger(EpssService.name);
    private readonly apiUrl: string;
    private readonly cacheTtl: number;
    private readonly batchSize: number;

    constructor(
        private configService: ConfigService,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) {
        this.apiUrl = this.configService.get<string>('epss.apiUrl') || 'https://api.first.org/data/v1/epss';
        this.cacheTtl = this.configService.get<number>('epss.cacheTtl') || 86400; // 24h
        this.batchSize = this.configService.get<number>('epss.batchSize') || 100;
    }

    /**
     * Get EPSS scores for multiple CVEs with cache-first strategy
     */
    async getCachedOrFetch(cves: string[]): Promise<Map<string, EpssScoreDto>> {
        if (!cves || cves.length === 0) {
            return new Map();
        }

        const result = new Map<string, EpssScoreDto>();
        const cacheMisses: string[] = [];

        // Check cache first
        for (const cve of cves) {
            const cached = await this.getCachedScore(cve);
            if (cached) {
                result.set(cve, cached);
                this.logger.debug(`EPSS cache hit for ${cve}`);
            } else {
                cacheMisses.push(cve);
            }
        }

        // Fetch missing scores from API
        if (cacheMisses.length > 0) {
            this.logger.log(`Fetching ${cacheMisses.length} EPSS scores from API`);
            const fetchedScores = await this.getEpssScores(cacheMisses);

            for (const score of fetchedScores) {
                result.set(score.cve, score);
                await this.cacheScore(score);
            }
        }

        return result;
    }

    /**
     * Fetch EPSS scores from FIRST.org API
     */
    async getEpssScores(cves: string[]): Promise<EpssScoreDto[]> {
        if (!cves || cves.length === 0) {
            return [];
        }

        const allScores: EpssScoreDto[] = [];

        // Process in batches of 100 (API limit)
        for (let i = 0; i < cves.length; i += this.batchSize) {
            const batch = cves.slice(i, i + this.batchSize);
            const batchScores = await this.fetchBatch(batch);
            allScores.push(...batchScores);
        }

        return allScores;
    }

    /**
     * Fetch a single batch of CVEs from API
     */
    private async fetchBatch(cves: string[]): Promise<EpssScoreDto[]> {
        try {
            const cveParam = cves.join(',');
            const url = `${this.apiUrl}?cve=${cveParam}`;

            this.logger.debug(`Fetching EPSS scores for ${cves.length} CVEs`);

            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (response.data && response.data.data) {
                this.logger.log(`Successfully fetched ${response.data.data.length} EPSS scores`);
                return response.data.data;
            }

            this.logger.warn('EPSS API returned unexpected format');
            return [];
        } catch (error) {
            this.logger.error(`Failed to fetch EPSS scores: ${error.message}`);
            // Graceful degradation: return empty array instead of throwing
            return [];
        }
    }

    /**
     * Get EPSS score for a single CVE
     */
    async getEpssScore(cve: string): Promise<EpssScoreDto | null> {
        const scores = await this.getEpssScores([cve]);
        return scores.length > 0 ? scores[0] : null;
    }

    /**
     * Get cached EPSS score
     */
    private async getCachedScore(cve: string): Promise<EpssScoreDto | null> {
        try {
            const key = this.getCacheKey(cve);
            const cached = await this.redis.get(key);

            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        } catch (error) {
            this.logger.error(`Redis cache read error for ${cve}: ${error.message}`);
            return null;
        }
    }

    /**
     * Cache EPSS score in Redis
     */
    private async cacheScore(score: EpssScoreDto): Promise<void> {
        try {
            const key = this.getCacheKey(score.cve);
            await this.redis.setex(key, this.cacheTtl, JSON.stringify(score));
            this.logger.debug(`Cached EPSS score for ${score.cve}`);
        } catch (error) {
            this.logger.error(`Redis cache write error for ${score.cve}: ${error.message}`);
            // Non-blocking: cache failure shouldn't stop the scan
        }
    }

    /**
     * Generate Redis cache key for CVE
     */
    private getCacheKey(cve: string): string {
        return `epss:${cve}`;
    }
}
