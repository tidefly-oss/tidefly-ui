import { page } from '$app/state';

export interface BreadcrumbItem {
	label: string;
	href?: string;
}

function formatSegment(segment: string): string {
	return segment
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

function isIdSegment(segment: string): boolean {
	return (
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
		/^\d+$/.test(segment) ||
		/^[0-9a-f]{20,}$/i.test(segment)
	);
}

const ROOT_PATHS = new Set(['/', '/dashboard']);

export function getBreadcrumb(): BreadcrumbItem[] {
	const pathname = page.url.pathname;
	const pageData = page.data;

	if (ROOT_PATHS.has(pathname)) {
		return [
			{
				label: pageData?.title || 'Dashboard',
				href: pathname === '/' ? '/' : '/dashboard',
			},
		];
	}

	const allSegments = pathname.split('/').filter(Boolean);
	const segments = allSegments.filter((segment) => segment !== 'dashboard');

	const crumbs: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/dashboard' }];

	segments.forEach((segment, index) => {
		const isLast = index === segments.length - 1;
		const href = `/dashboard/${segments.slice(0, index + 1).join('/')}`;

		let label: string;
		if (isLast && pageData?.title) {
			label = pageData.title;
		} else if (isIdSegment(segment)) {
			label = segment.slice(0, 8) + '...';
		} else {
			label = formatSegment(segment);
		}

		crumbs.push({
			label,
			href: isLast ? undefined : href,
		});
	});

	return crumbs;
}