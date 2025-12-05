import { IsString, IsEnum, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';
import { PackageManager } from '../project.entity';

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    repositoryUrl: string;

    @IsString()
    @IsNotEmpty()
    repositoryName: string;

    @IsString()
    @IsNotEmpty()
    branch: string;

    @IsBoolean()
    @IsOptional()
    isPrivate?: boolean;

    @IsEnum(PackageManager)
    packageManager: PackageManager;

    @IsString()
    @IsOptional()
    lockfilePath?: string;

    @IsString()
    @IsOptional()
    cronSchedule?: string;

    @IsBoolean()
    @IsOptional()
    emailEnabled?: boolean;
}
