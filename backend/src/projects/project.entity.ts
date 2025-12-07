import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Webhook } from '../webhooks/webhook.entity';

export enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
  PNPM = 'pnpm',
  BUN = 'bun',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  repositoryUrl: string;

  @Column()
  repositoryName: string; // e.g., "owner/repo"

  @Column()
  branch: string;

  @Column({ default: false })
  isPrivate: boolean;

  @Column({
    type: 'enum',
    enum: PackageManager,
    default: PackageManager.NPM,
  })
  packageManager: PackageManager;

  @Column({ default: './' })
  lockfilePath: string;

  @Column({ nullable: true })
  cronSchedule: string; // e.g., "0 0 * * *"

  @Column({ default: false })
  emailEnabled: boolean;

  @Column({ default: false })
  immediateScansEnabled: boolean; // For paid users

  @Column({ type: 'simple-json', nullable: true })
  qualityGate: {
    minScore?: number;
    failOnSeverity?: 'critical' | 'high' | 'moderate' | 'low';
  };

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Webhook, (webhook) => webhook.project)
  webhooks: Webhook[];
}
