// User model TypeScript interface (matches Prisma schema fields used)
export interface UserDTO {
	id: string;
	email: string;
	username: string;
	fullName?: string | null;
	avatar?: string | null;
	bio?: string | null;
	role: string;
	isActive?: boolean;
	lastLogin?: Date | null;
	createdAt?: Date;
	updatedAt?: Date;
}
