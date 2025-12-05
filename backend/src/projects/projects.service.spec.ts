import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project, PackageManager } from './project.entity';
import { UsersService } from '../users/users.service';
import { GithubProvider } from '../providers/github/github.provider';
import { NotFoundException, ForbiddenException } from '@nestjs/common';


jest.mock('@octokit/rest', () => ({
    Octokit: jest.fn(),
}));

describe('ProjectsService', () => {
    let service: ProjectsService;
    let mockProjectsRepository;
    let mockUsersService;
    let mockGitProvider;

    beforeEach(async () => {
        mockProjectsRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            merge: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            })),
        };

        mockUsersService = {
            findOne: jest.fn(),
        };

        mockGitProvider = {
            getRepositories: jest.fn(),
            getBranches: jest.fn(),
            detectLockfiles: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectsService,
                {
                    provide: getRepositoryToken(Project),
                    useValue: mockProjectsRepository,
                },
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
                {
                    provide: GithubProvider,
                    useValue: mockGitProvider,
                },
            ],
        }).compile();

        service = module.get<ProjectsService>(ProjectsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return an array of projects for a user', async () => {
            const userId = 1;
            const projects = [{ id: 1, name: 'Test Project', userId }];
            mockProjectsRepository.find.mockResolvedValue(projects);

            const result = await service.findAll(userId);
            expect(result).toEqual(projects);
            expect(mockProjectsRepository.find).toHaveBeenCalledWith({ where: { userId } });
        });
    });

    describe('findOne', () => {
        it('should return a project if found', async () => {
            const userId = 1;
            const project = { id: 1, name: 'Test Project', userId };
            mockProjectsRepository.findOne.mockResolvedValue(project);

            const result = await service.findOne(1, userId);
            expect(result).toEqual(project);
        });

        it('should throw NotFoundException if project not found', async () => {
            mockProjectsRepository.findOne.mockResolvedValue(null);
            await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('should create and save a new project', async () => {
            const userId = 1;
            const createDto = {
                name: 'New Project',
                repositoryUrl: 'http://github.com/user/repo',
                repositoryName: 'user/repo',
                branch: 'main',
                packageManager: PackageManager.NPM,
            };
            const savedProject = { id: 1, ...createDto, userId };

            mockProjectsRepository.create.mockReturnValue(savedProject);
            mockProjectsRepository.save.mockResolvedValue(savedProject);

            const result = await service.create(createDto, userId);
            expect(result).toEqual(savedProject);
            expect(mockProjectsRepository.create).toHaveBeenCalledWith({ ...createDto, userId });
            expect(mockProjectsRepository.save).toHaveBeenCalledWith(savedProject);
        });
    });

    describe('getGithubRepositories', () => {
        it('should return repositories if user has access token', async () => {
            const userId = 1;
            const user = { id: 1, accessToken: 'valid_token' };
            const repos = [{ id: 1, name: 'repo' }];

            mockUsersService.findOne.mockResolvedValue(user);
            mockGitProvider.getRepositories.mockResolvedValue(repos);

            const result = await service.getGithubRepositories(userId);
            expect(result).toEqual(repos);
            expect(mockGitProvider.getRepositories).toHaveBeenCalledWith('valid_token');
        });

        it('should throw ForbiddenException if user has no access token', async () => {
            mockUsersService.findOne.mockResolvedValue({ id: 1, accessToken: null });
            await expect(service.getGithubRepositories(1)).rejects.toThrow(ForbiddenException);
        });
    });
});
