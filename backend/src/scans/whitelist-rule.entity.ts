import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Project } from '../projects/project.entity';

@Entity('whitelist_rules')
export class WhitelistRule {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  projectId: number;

  @Column({ nullable: true })
  cve: string;

  @Column()
  packageName: string;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
