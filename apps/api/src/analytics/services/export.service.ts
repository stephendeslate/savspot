import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsQueryService } from './analytics-query.service';

interface DateRange {
  from: Date;
  to: Date;
}

interface AnalyticsFilters {
  serviceId?: string;
  staffId?: string;
  source?: string;
  groupBy?: string;
}

interface ExportResult {
  data: Buffer;
  contentType: string;
  filename: string;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly analyticsQueryService: AnalyticsQueryService,
  ) {}

  async exportCsv(
    tenantId: string,
    metrics: string[],
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<ExportResult> {
    const data = await this.collectMetrics(
      tenantId,
      metrics,
      dateRange,
      filters,
    );

    const csvLines: string[] = [];

    for (const [metricName, metricData] of Object.entries(data)) {
      csvLines.push(`# ${metricName}`);

      if (Array.isArray(metricData) && metricData.length > 0) {
        const firstItem = metricData[0] as Record<string, unknown>;
        const headers = Object.keys(firstItem);
        csvLines.push(headers.join(','));

        for (const row of metricData) {
          const rowData = row as Record<string, unknown>;
          const values = headers.map((h) => {
            const val = rowData[h];
            if (typeof val === 'string' && val.includes(',')) {
              return `"${val}"`;
            }
            return String(val ?? '');
          });
          csvLines.push(values.join(','));
        }
      } else if (
        typeof metricData === 'object' &&
        metricData !== null &&
        !Array.isArray(metricData)
      ) {
        const obj = metricData as Record<string, unknown>;
        csvLines.push('metric,value');
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value !== 'object') {
            csvLines.push(`${key},${String(value)}`);
          }
        }
      }

      csvLines.push('');
    }

    const csvContent = csvLines.join('\n');
    const fromStr = dateRange.from.toISOString().split('T')[0];
    const toStr = dateRange.to.toISOString().split('T')[0];

    return {
      data: Buffer.from(csvContent, 'utf-8'),
      contentType: 'text/csv',
      filename: `analytics-${fromStr}-${toStr}.csv`,
    };
  }

  async exportJson(
    tenantId: string,
    metrics: string[],
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<ExportResult> {
    const data = await this.collectMetrics(
      tenantId,
      metrics,
      dateRange,
      filters,
    );

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
      metrics: data,
    };

    const jsonContent = JSON.stringify(exportPayload, null, 2);
    const fromStr = dateRange.from.toISOString().split('T')[0];
    const toStr = dateRange.to.toISOString().split('T')[0];

    return {
      data: Buffer.from(jsonContent, 'utf-8'),
      contentType: 'application/json',
      filename: `analytics-${fromStr}-${toStr}.json`,
    };
  }

  private async collectMetrics(
    tenantId: string,
    metrics: string[],
    dateRange: DateRange,
    filters: AnalyticsFilters,
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const metric of metrics) {
      switch (metric) {
        case 'overview':
          result['overview'] =
            await this.analyticsQueryService.getOverview(
              tenantId,
              dateRange,
              filters,
            );
          break;
        case 'revenue':
          result['revenue'] =
            await this.analyticsQueryService.getRevenueTrends(
              tenantId,
              dateRange,
              filters,
            );
          break;
        case 'bookings':
          result['bookings'] =
            await this.analyticsQueryService.getBookingTrends(
              tenantId,
              dateRange,
              filters,
            );
          break;
        case 'no-shows':
          result['noShows'] =
            await this.analyticsQueryService.getNoShowTrends(
              tenantId,
              dateRange,
              filters,
            );
          break;
        case 'clients':
          result['clients'] =
            await this.analyticsQueryService.getClientMetrics(
              tenantId,
              dateRange,
              filters,
            );
          break;
        case 'funnel':
          result['funnel'] =
            await this.analyticsQueryService.getFunnelData(
              tenantId,
              dateRange,
            );
          break;
        case 'utilization':
          result['utilization'] =
            await this.analyticsQueryService.getUtilizationHeatmap(
              tenantId,
              dateRange,
              filters,
            );
          break;
        case 'staff-performance':
          result['staffPerformance'] =
            await this.analyticsQueryService.getStaffPerformance(
              tenantId,
              dateRange,
              filters,
            );
          break;
        case 'benchmarks':
          result['benchmarks'] =
            await this.analyticsQueryService.getBenchmarks(tenantId);
          break;
        default:
          this.logger.warn(`Unknown metric requested for export: ${metric}`);
      }
    }

    return result;
  }
}
