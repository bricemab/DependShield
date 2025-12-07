import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { ScansService } from './scans.service';
import { Scan, ScanStatus } from './scan.entity';
import { ProjectsService } from '../projects/projects.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(),
}));

describe('ScansService', () => {
  let service: ScansService;
  let mockScansRepository;
  let mockScansQueue;
  let mockProjectsService;
  let mockConfigService;

  beforeEach(async () => {
    mockScansRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
    };

    mockScansQueue = {
      add: jest.fn(),
    };

    mockProjectsService = {
      findOne: jest.fn(),
      findOneById: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(60),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScansService,
        {
          provide: getRepositoryToken(Scan),
          useValue: mockScansRepository,
        },
        {
          provide: getQueueToken('scans'),
          useValue: mockScansQueue,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ScansService>(ScansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('triggerScan', () => {
    it('should create a scan and add it to the queue', async () => {
      const projectId = 1;
      const userId = 1;
      const scan = { id: 1, projectId, status: ScanStatus.PENDING };
      const project = { id: projectId, immediateScansEnabled: false };

      mockProjectsService.findOne.mockResolvedValue(project);
      mockScansRepository.findOne.mockResolvedValue(null); // No previous scan
      mockScansRepository.create.mockReturnValue(scan);
      mockScansRepository.save.mockResolvedValue(scan);
      mockScansQueue.add.mockResolvedValue({});

      const result = await service.triggerScan(projectId, userId);

      expect(result).toEqual(scan);
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(
        projectId,
        userId,
      );
      expect(mockScansRepository.create).toHaveBeenCalledWith({
        projectId,
        status: ScanStatus.PENDING,
      });
      expect(mockScansRepository.save).toHaveBeenCalledWith(scan);
      expect(mockScansQueue.add).toHaveBeenCalledWith('scan', {
        scanId: scan.id,
      });
    });

    it('should verify project existence for system trigger', async () => {
      const projectId = 1;
      const scan = { id: 1, projectId, status: ScanStatus.PENDING };
      const project = { id: projectId, immediateScansEnabled: false };

      mockProjectsService.findOneById.mockResolvedValue(project);
      mockScansRepository.findOne.mockResolvedValue(null);
      mockScansRepository.create.mockReturnValue(scan);
      mockScansRepository.save.mockResolvedValue(scan);

      await service.triggerScan(projectId);

      expect(mockProjectsService.findOneById).toHaveBeenCalledWith(projectId);
    });

    it('should throw BadRequestException if rate limit exceeded', async () => {
      const projectId = 1;
      const userId = 1;
      const project = { id: projectId, immediateScansEnabled: false };
      const lastScan = { startedAt: new Date() }; // Just now

      mockProjectsService.findOne.mockResolvedValue(project);
      mockScansRepository.findOne.mockResolvedValue(lastScan);

      await expect(service.triggerScan(projectId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow scan if immediateScansEnabled is true', async () => {
      const projectId = 1;
      const userId = 1;
      const project = { id: projectId, immediateScansEnabled: true };
      const lastScan = { startedAt: new Date() }; // Just now
      const scan = { id: 1, projectId, status: ScanStatus.PENDING };

      mockProjectsService.findOne.mockResolvedValue(project);
      mockScansRepository.create.mockReturnValue(scan);
      mockScansRepository.save.mockResolvedValue(scan);

      await service.triggerScan(projectId, userId);

      expect(mockScansRepository.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated scans', async () => {
      const projectId = 1;
      const userId = 1;
      const scans = [{ id: 1, projectId }];
      const total = 1;

      mockProjectsService.findOne.mockResolvedValue({ id: projectId });
      mockScansRepository.findAndCount.mockResolvedValue([scans, total]);

      const result = await service.findAll(projectId, userId, 1, 10);

      expect(result).toEqual({
        data: scans,
        total,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockScansRepository.findAndCount).toHaveBeenCalledWith({
        where: { projectId },
        order: { startedAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return a scan with vulnerabilities', async () => {
      const scanId = 1;
      const scan = { id: scanId, vulnerabilities: [] };

      mockScansRepository.findOne.mockResolvedValue(scan);

      const result = await service.findOne(scanId);

      expect(result).toEqual(scan);
      expect(mockScansRepository.findOne).toHaveBeenCalledWith({
        where: { id: scanId },
        relations: ['vulnerabilities'],
      });
    });
  });
});
