import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Project } from '../projects/project.entity';

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
        default: WebhookType.GENERIC
    })
    type: WebhookType;

    @Column('simple-array')
    events: WebhookEvent[];

    @Column({ default: true })
    isActive: boolean;

    @ManyToOne(() => Project, project => project.webhooks, { onDelete: 'CASCADE' })
    project: Project;

    @Column()
    projectId: number;

    @CreateDateColumn()
    createdAt: Date;
}
