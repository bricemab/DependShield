import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
    JoinTable,
    OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
// import { Project } from '../projects/project.entity'; // Will add later to avoid circular dependency initially if needed, but safe to import if file exists

export enum PlanType {
    STARTER = 'STARTER',
    PRO = 'PRO',
    ENTERPRISE = 'ENTERPRISE',
}

@Entity('organizations')
export class Organization {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    ownerId: number;

    @Column({
        type: 'enum',
        enum: PlanType,
        default: PlanType.STARTER,
    })
    plan: PlanType;

    @ManyToMany(() => User, (user) => user.organizations)
    @JoinTable({
        name: 'users_organizations',
        joinColumn: { name: 'organizationId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
    })
    users: User[];

    // @OneToMany(() => Project, (project) => project.organization)
    // projects: Project[];

    // Stripe Billing
    @Column({ nullable: true, select: false }) // Hide customer ID from partial API responses if not needed
    stripeCustomerId: string;

    @Column({ nullable: true })
    subscriptionId: string;

    @Column({ default: 'active' }) // active, past_due, canceled, incomplete
    subscriptionStatus: string;

    @Column({ nullable: true, type: 'date' })
    subscriptionEndsAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
