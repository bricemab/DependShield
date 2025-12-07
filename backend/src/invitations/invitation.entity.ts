import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';

@Entity('invitations')
export class Invitation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;

    @Column({ unique: true })
    token: string;

    @Column()
    organizationId: number;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organizationId' })
    organization: Organization;

    @Column()
    inviterId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'inviterId' })
    inviter: User;

    @Column({ default: 'pending' }) // pending, accepted, expired
    status: string;

    @Column()
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}
