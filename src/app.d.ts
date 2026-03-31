import type { User } from "$lib/api/v1/types";

declare global {
	namespace App {
		interface Locals {
			user: User;
		}
	}
}
