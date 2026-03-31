export interface TemplateSummary {
	slug: string;
	name: string;
	category: string;
	icon: string;
	description: string;
	versions: string[];
	default_version: string;
}

export interface TemplateField {
	key: string;
	label: string;
	type: "string" | "port" | "credential" | "select";
	default?: string;
	placeholder?: string;
	required: boolean;
	generated: boolean;
	store_hash?: boolean;
	show_plaintext_once?: boolean;
	options?: { value: string; label: string }[];
}

export interface ServiceTemplate extends TemplateSummary {
	fields: TemplateField[];
}
