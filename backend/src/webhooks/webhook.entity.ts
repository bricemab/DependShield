import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Project } from '../projects/project.entity';
import { Organization } from '../organizations/organization.entity';

export enum WebhookType {
  SLACK = 'SLACK',
  DISCORD = 'DISCORD',
  TEAMS = 'TEAMS',
  GENERIC = 'GENERIC',
}

export enum WebhookEvent {
  SCAN_COMPLETED = 'scan.completed',
  SCAN_FAILED = 'scan.failed',
}

@Entity()
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column({
    type: 'enum',
    enum: WebhookType,
    default: WebhookType.GENERIC,
  })
  type: WebhookType;

  @Column('simple-array')
  events: WebhookEvent[];

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Project, (project) => project.webhooks, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  project: Project;

  @Column({ nullable: true })
  projectId: number;

  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  organization: Organization;

  @Column({ nullable: true })
  organizationId: number;

  @CreateDateColumn()
  createdAt: Date;
}
