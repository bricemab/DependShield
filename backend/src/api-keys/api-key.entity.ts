import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
} from 'typeorm';
import { Organization } from '../organizations/organization.entity';

@Entity('api_keys')
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    label: string;

    @Column({ select: false })
    keyHash: string;

    @Column()
    prefix: string;

    @Column({ nullable: true })
    lastUsedAt: Date;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    organization: Organization;

    @Column()
    organizationId: number;

    @CreateDateColumn()
    createdAt: Date;
}
