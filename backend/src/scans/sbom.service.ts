import { Injectable, Logger } from '@nestjs/common';
import { Scan } from '../scans/scan.entity';
import { Vulnerability } from '../scans/vulnerability.entity';

@Injectable()
export class SbomService {
    private readonly logger = new Logger(SbomService.name);

    generateCycloneDX(scan: Scan): any {
        this.logger.log(`Generating SBOM for scan ${scan.id}`);

        const nodes = scan.dependencyGraph?.nodes || [];
        const components = new Map<string, any>();

        // 1. Add components from Dependency Graph (if available)
        nodes.forEach((node: any) => {
            const version = node.version === 'unknown' ? undefined : node.version;
            const purl = version ? `pkg:npm/${node.id}@${version}` : `pkg:npm/${node.id}`;

            if (!components.has(node.id)) {
                components.set(node.id, {
                    type: 'library',
                    name: node.id,
                    version: version,
                    purl: purl,
                    description: 'Imported from Dependency Graph'
                });
            }
        });

        // 2. Add/Enrich components from Vulnerabilities (which have precise version data from Audit)
        if (scan.vulnerabilities) {
            scan.vulnerabilities.forEach((vuln: Vulnerability) => {
                if (vuln.packageName && vuln.version) {
                    const purl = `pkg:npm/${vuln.packageName}@${vuln.version}`;
                    // Overwrite or add
                    components.set(vuln.packageName, {
                        type: 'library',
                        name: vuln.packageName,
                        version: vuln.version,
                        purl: purl,
                        description: 'Identified during security audit'
                    });
                }
            });
        }

        const componentList = Array.from(components.values());

        return {
            bomFormat: 'CycloneDX',
            specVersion: '1.5',
            serialNumber: `urn:uuid:${this.generateUuid()}`,
            version: 1,
            metadata: {
                timestamp: new Date().toISOString(),
                tools: [
                    {
                        vendor: 'DependShield',
                        name: 'DependShield Scanner',
                        version: '1.0.0'
                    }
                ],
                component: {
                    type: 'application',
                    name: scan.project?.name || 'Unknown Project',
                }
            },
            components: componentList
        };
    }

    private generateUuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
