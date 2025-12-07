import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

export enum UserPlan {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum UserRole {
  DEVELOPER = 'DEVELOPER',
  CTO = 'CTO',
  STUDENT = 'STUDENT',
  FREELANCER = 'FREELANCER',
  SECURITY_AUDITOR = 'SECURITY_AUDITOR',
  OTHER = 'OTHER',
}

export enum CompanySize {
  SOLO = 'SOLO', // 1
  STARTUP = 'STARTUP', // 2-10
  SCALEUP = 'SCALEUP', // 11-50
  ENTERPRISE = 'ENTERPRISE', // 50+
}

export enum DiscoverySource {
  LINKEDIN = 'LINKEDIN',
  GITHUB = 'GITHUB',
  FRIEND = 'FRIEND',
  NEWSLETTER = 'NEWSLETTER',
  TIKTOK = 'TIKTOK',
  OTHER = 'OTHER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  githubId: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({
    type: 'enum',
    enum: UserPlan,
    default: UserPlan.STARTER,
  })
  plan: UserPlan;

  @Column({ nullable: true, select: false }) // Encrypted access token, do not select by default
  accessToken: string;

  @Column({ default: false })
  isOnboarded: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: true,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: CompanySize,
    nullable: true,
  })
  companySize: CompanySize;

  @Column({
    type: 'enum',
    enum: DiscoverySource,
    nullable: true,
  })
  discoverySource: DiscoverySource;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Organization, (organization) => organization.users)
  organizations: Organization[];
}
