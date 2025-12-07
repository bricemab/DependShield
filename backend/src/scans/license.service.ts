import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  VulnerabilitySeverity,
  VulnerabilityType,
  Vulnerability,
} from './vulnerability.entity';

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  // List of licenses considered risky for commercial/proprietary software
  private readonly RISKY_LICENSES = [
    'GPL-2.0',
    'GPL-3.0',
    'GPL-2.0-only',
    'GPL-3.0-only',
    'AGPL-3.0',
    'AGPL-3.0-only',
    'LGPL-3.0', // Often okay but warrants a warning
    'SSPL-1.0', // MongoDB
  ];

  async checkLicenses(
    dependencies: Record<string, string>,
  ): Promise<Partial<Vulnerability>[]> {
    const findings: Partial<Vulnerability>[] = [];
    const packages = Object.keys(dependencies);

    this.logger.log(`Checking licenses for ${packages.length} dependencies...`);

    // Batch processing to avoid rate limits (though NPM is generous)
    // For MVP, we'll check them sequentially or in small batches
    const concurrency = 5;
    for (let i = 0; i < packages.length; i += concurrency) {
      const batch = packages.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (pkg) => {
          try {
            const license = await this.fetchLicense(pkg);
            if (license && this.isRisky(license)) {
              findings.push({
                packageName: pkg,
                version: dependencies[pkg].replace('^', '').replace('~', ''), // Approximate
                severity:
                  license.includes('AGPL') || license.includes('GPL')
                    ? VulnerabilitySeverity.HIGH
                    : VulnerabilitySeverity.MODERATE,
                title: `Restrictive License detected: ${license}`,
                description: `The package ${pkg} is licensed under ${license}. This is a copyleft license which may require you to open-source your own code if you distribute it.`,
                type: VulnerabilityType.LICENSE,
                isDevDependency: false, // We usually check "dependencies" not "devDependencies" for license risk
              });
            }
          } catch (e) {
            this.logger.warn(
              `Failed to check license for ${pkg}: ${e.message}`,
            );
          }
        }),
      );
    }

    return findings;
  }

  private async fetchLicense(packageName: string): Promise<string | null> {
    try {
      // Use NPM Registry API
      const response = await axios.get(
        `https://registry.npmjs.org/${packageName}/latest`,
        { timeout: 5000 },
      );
      return response.data.license || null;
    } catch (error) {
      return null;
    }
  }

  private isRisky(license: string): boolean {
    // Handle SPDX expressions or array of licenses casually
    // Simple string inclusion check for MVP
    const upper = license.toUpperCase();
    return this.RISKY_LICENSES.some((risky) => upper.includes(risky));
  }
}
