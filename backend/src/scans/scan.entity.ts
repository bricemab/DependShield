import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Project } from '../projects/project.entity';
import { Vulnerability } from './vulnerability.entity';

export enum ScanStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('scans')
export class Scan {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Project, { onDelete: 'CASCADE' })
    project: Project;

    @Column()
    projectId: number;

    @Column({
        type: 'enum',
        enum: ScanStatus,
        default: ScanStatus.PENDING,
    })
    status: ScanStatus;

    @Column({ nullable: true })
    vulnerabilitiesCount: number;

    @Column({ type: 'float', nullable: true })
    score: number;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @Column({ nullable: true })
    commitSha: string;

    @OneToMany(() => Vulnerability, (vulnerability) => vulnerability.scan, { cascade: true })
    vulnerabilities: Vulnerability[];

    @CreateDateColumn()
    startedAt: Date;

    @Column({ nullable: true })
    completedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
