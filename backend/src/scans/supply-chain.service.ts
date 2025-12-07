import { Injectable, Logger } from '@nestjs/common';
import {
  Vulnerability,
  VulnerabilitySeverity,
  VulnerabilityType,
} from './vulnerability.entity';

@Injectable()
export class SupplyChainService {
  private readonly logger = new Logger(SupplyChainService.name);

  // Top ~50 popular packages to check against (simplified approach for MVP)
  // In a real app, this would be a much larger database or external API.
  private readonly POPULAR_PACKAGES = [
    'react',
    'react-dom',
    'vue',
    'angular',
    'svelte',
    'express',
    'nestjs',
    'fastify',
    'koa',
    'lodash',
    'underscore',
    'moment',
    'date-fns',
    'axios',
    'node-fetch',
    'request',
    'commander',
    'chalk',
    'inquirer',
    'fs-extra',
    'glob',
    'rimraf',
    'winston',
    'debug',
    'typescript',
    'eslint',
    'jest',
    'mocha',
    'chai',
    'webpack',
    'rollup',
    'vite',
    'parcel',
    'dotenv',
    'uuid',
    'bcrypt',
    'jsonwebtoken',
  ];

  async checkTyposquatting(
    dependencies: Record<string, string>,
  ): Promise<Partial<Vulnerability>[]> {
    const findings: Partial<Vulnerability>[] = [];
    const packages = Object.keys(dependencies);

    this.logger.log(
      `Checking ${packages.length} dependencies for typosquatting...`,
    );

    for (const pkg of packages) {
      // 1. Is it exactly a popular package? Safe.
      if (this.POPULAR_PACKAGES.includes(pkg)) continue;

      // 2. Is it scoped? (e.g. @angular/core). Skip for MVP as typosquatting is harder/different here.
      if (pkg.startsWith('@')) continue;

      // 3. Check distance against popular packages
      for (const popular of this.POPULAR_PACKAGES) {
        const distance = this.levenshtein(pkg, popular);

        // Threshold: 1 for short names (<5 chars), 2 for longer
        const threshold = popular.length < 5 ? 1 : 2;

        if (distance > 0 && distance <= threshold) {
          findings.push({
            packageName: pkg,
            version: dependencies[pkg].replace('^', '').replace('~', ''),
            severity: VulnerabilitySeverity.CRITICAL, // Typosquatting is usually malicious
            title: `Potential Typosquatting: ${pkg} mimics ${popular}`,
            description: `The package '${pkg}' has a very similar name to the popular library '${popular}'. This is a common attack vector (Typosquatting) used to distribute malware. Please verify if this package is legitimate.`,
            type: VulnerabilityType.SUPPLY_CHAIN,
            cve: 'TYPOSQUAT-DETECTED', // Internal ID
          });
          // Break inner loop to avoid multiple reports for same package (e.g. if it resembles multiple)
          break;
        }
      }
    }

    return findings;
  }

  private levenshtein(a: string, b: string): number {
    const matrix = [];

    // Increment along the first column of each row
    let i;
    for (i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    // Increment each column in the first row
    let j;
    for (j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) == a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1,
            ),
          ); // deletion
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
