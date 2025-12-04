import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

    @Column({ nullable: true, select: false }) // Encrypted access token, do not select by default
    accessToken: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
