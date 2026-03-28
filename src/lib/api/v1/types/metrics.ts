export interface SystemMetric {
    id: number;
    cpu_percent: number;
    mem_used_mb: number;
    mem_total_mb: number;
    mem_percent: number;
    disk_used_mb: number;
    disk_total_mb: number;
    disk_percent: number;
    collected_at: string;
}

export interface MetricsResponse {
    metrics: SystemMetric[];
    latest: SystemMetric | null;
}