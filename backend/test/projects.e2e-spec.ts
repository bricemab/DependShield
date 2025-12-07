import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ProjectsService } from './../src/projects/projects.service';
import { AuthGuard } from '@nestjs/passport';

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(),
}));

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  const mockProjectsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    findAllWithSchedule: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ProjectsService)
      .useValue(mockProjectsService)
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = { userId: 1 };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/projects (GET)', () => {
    mockProjectsService.findAll.mockResolvedValue([]);
    return request(app.getHttpServer()).get('/projects').expect(200).expect([]);
  });

  it('/projects (POST)', () => {
    const createDto = {
      name: 'Test Project',
      repositoryUrl: 'http://github.com/user/repo',
      repositoryName: 'user/repo',
      branch: 'main',
      packageManager: 'npm',
    };
    mockProjectsService.create.mockResolvedValue({ id: 1, ...createDto });

    return request(app.getHttpServer())
      .post('/projects')
      .send(createDto)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toEqual(1);
        expect(res.body.name).toEqual(createDto.name);
      });
  });
});
