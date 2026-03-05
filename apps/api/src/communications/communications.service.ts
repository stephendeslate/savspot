import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../../../prisma/generated/prisma';
import {
  QUEUE_COMMUNICATIONS,
  JOB_DELIVER_COMMUNICATION,
} from '../bullmq/queue.constants';

// ---- Interfaces ----

export interface CreateAndSendParams {
  tenantId: string;
  recipientId: string;
  recipientEmail: string;
  recipientName?: string;
  channel: 'EMAIL';
  templateKey: string;
  templateData: Record<string, unknown>;
  bookingId?: string;
}

export interface RenderedTemplate {
  subject: string;
  html: string;
}

// ---- Template Data Interfaces ----

interface TenantBranding {
  businessName: string;
  logoUrl?: string;
  brandColor?: string;
}

/**
 * CommunicationsService handles creating communication records and
 * enqueuing delivery jobs. Templates are rendered inline with variable
 * substitution (CJS-compatible, no React Email).
 */
@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_COMMUNICATIONS) private readonly commsQueue: Queue,
  ) {
    this.webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
  }

  /**
   * Creates a Communication record in DB, then enqueues a deliverCommunication job.
   * Optionally accepts a delayMs for scheduled sends (e.g. follow-ups).
   */
  async createAndSend(
    params: CreateAndSendParams,
    options?: { delayMs?: number },
  ): Promise<string> {
    const {
      tenantId,
      recipientId,
      recipientEmail,
      recipientName,
      channel,
      templateKey,
      templateData,
      bookingId,
    } = params;

    // Render template to get subject line for the DB record
    const rendered = this.renderTemplate(templateKey, templateData);

    const communication = await this.prisma.communication.create({
      data: {
        tenantId,
        recipientId,
        bookingId: bookingId ?? null,
        channel,
        templateKey,
        subject: rendered.subject,
        body: rendered.html,
        status: 'QUEUED',
        metadata: {
          recipientEmail,
          recipientName: recipientName ?? null,
          templateData,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Communication created: id=${communication.id} template=${templateKey} recipient=${recipientEmail}`,
    );

    await this.commsQueue.add(
      JOB_DELIVER_COMMUNICATION,
      {
        communicationId: communication.id,
        tenantId,
      },
      {
        ...(options?.delayMs ? { delay: options.delayMs } : {}),
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
      },
    );

    return communication.id;
  }

  /**
   * Renders a template by key with variable substitution.
   * Returns { subject, html } for the given template.
   */
  renderTemplate(templateKey: string, data: Record<string, unknown>): RenderedTemplate {
    switch (templateKey) {
      case 'booking-confirmation':
        return this.renderBookingConfirmation(data);
      case 'booking-cancellation':
        return this.renderBookingCancellation(data);
      case 'payment-receipt':
        return this.renderPaymentReceipt(data);
      case 'booking-reminder':
        return this.renderBookingReminder(data);
      case 'follow-up':
        return this.renderFollowUp(data);
      case 'payment-reminder':
        return this.renderPaymentReminder(data);
      case 'morning-summary':
        return this.renderMorningSummary(data);
      case 'weekly-digest':
        return this.renderWeeklyDigest(data);
      case 'abandoned-booking-recovery':
        return this.renderAbandonedBookingRecovery(data);
      default:
        this.logger.warn(`Unknown template key: ${templateKey}`);
        return {
          subject: 'Notification from SavSpot',
          html: this.wrapHtml(
            { businessName: String(data['businessName'] ?? 'SavSpot') },
            `<p>${String(data['message'] ?? 'You have a new notification.')}</p>`,
          ),
        };
    }
  }

  // ---- Template Renderers ----

  private renderBookingConfirmation(d: Record<string, unknown>): RenderedTemplate {
    const branding = this.extractBranding(d);
    const subject = `Your booking is confirmed — ${branding.businessName}`;
    const html = this.wrapHtml(branding, `
      <h2 style="color:#333;margin:0 0 16px;">Booking Confirmed!</h2>
      <p>Hi ${this.esc(d['clientName'])},</p>
      <p>Your booking with <strong>${this.esc(branding.businessName)}</strong> has been confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:140px;">Service</td>
          <td style="padding:8px 12px;background:#f5f5f5;">${this.esc(d['serviceName'])}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;">Date &amp; Time</td>
          <td style="padding:8px 12px;">${this.esc(d['dateTime'])}</td>
        </tr>
        ${d['providerName'] ? `
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;">Provider</td>
          <td style="padding:8px 12px;background:#f5f5f5;">${this.esc(d['providerName'])}</td>
        </tr>` : ''}
      </table>
      <p>We look forward to seeing you!</p>
    `);
    return { subject, html };
  }

  private renderBookingCancellation(d: Record<string, unknown>): RenderedTemplate {
    const branding = this.extractBranding(d);
    const subject = `Your booking has been cancelled — ${branding.businessName}`;
    const refundLine = d['refundAmount']
      ? `<p>A refund of <strong>${this.esc(d['currency'])}${this.esc(d['refundAmount'])}</strong> will be processed to your original payment method.</p>`
      : '';
    const html = this.wrapHtml(branding, `
      <h2 style="color:#333;margin:0 0 16px;">Booking Cancelled</h2>
      <p>Hi ${this.esc(d['clientName'])},</p>
      <p>Your booking with <strong>${this.esc(branding.businessName)}</strong> has been cancelled.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:140px;">Service</td>
          <td style="padding:8px 12px;background:#f5f5f5;">${this.esc(d['serviceName'])}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;">Date &amp; Time</td>
          <td style="padding:8px 12px;">${this.esc(d['dateTime'])}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;">Reason</td>
          <td style="padding:8px 12px;background:#f5f5f5;">${this.esc(d['cancellationReason'])}</td>
        </tr>
      </table>
      ${refundLine}
      <p>If you have any questions, please contact us.</p>
    `);
    return { subject, html };
  }

  private renderPaymentReceipt(d: Record<string, unknown>): RenderedTemplate {
    const branding = this.extractBranding(d);
    const subject = `Payment receipt — ${branding.businessName}`;
    const html = this.wrapHtml(branding, `
      <h2 style="color:#333;margin:0 0 16px;">Payment Receipt</h2>
      <p>Hi ${this.esc(d['clientName'])},</p>
      <p>We have received your payment. Here are the details:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:140px;">Amount</td>
          <td style="padding:8px 12px;background:#f5f5f5;">${this.esc(d['currency'])} ${this.esc(d['amount'])}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;">Service</td>
          <td style="padding:8px 12px;">${this.esc(d['serviceName'])}</td>
        </tr>
        ${d['invoiceNumber'] ? `
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;">Invoice</td>
          <td style="padding:8px 12px;background:#f5f5f5;">#${this.esc(d['invoiceNumber'])}</td>
        </tr>` : ''}
      </table>
      <p>Thank you for your payment!</p>
    `);
    return { subject, html };
  }

  private renderBookingReminder(d: Record<string, unknown>): RenderedTemplate {
    const branding = this.extractBranding(d);
    const subject = `Reminder: Your appointment is tomorrow — ${branding.businessName}`;
    const html = this.wrapHtml(branding, `
      <h2 style="color:#333;margin:0 0 16px;">Appointment Reminder</h2>
      <p>Hi ${this.esc(d['clientName'])},</p>
      <p>This is a friendly reminder about your upcoming appointment with <strong>${this.esc(branding.businessName)}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:140px;">Service</td>
          <td style="padding:8px 12px;background:#f5f5f5;">${this.esc(d['serviceName'])}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;">Date &amp; Time</td>
          <td style="padding:8px 12px;">${this.esc(d['dateTime'])}</td>
        </tr>
        ${d['providerName'] ? `
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;">Provider</td>
          <td style="padding:8px 12px;background:#f5f5f5;">${this.esc(d['providerName'])}</td>
        </tr>` : ''}
      </table>
      <p>See you soon!</p>
    `);
    return { subject, html };
  }

  private renderFollowUp(d: Record<string, unknown>): RenderedTemplate {
    const branding = this.extractBranding(d);
    const slug = String(d['tenantSlug'] ?? '');
    const serviceId = String(d['serviceId'] ?? '');
    const providerId = String(d['providerId'] ?? '');
    const rebookUrl = `${this.webUrl}/${slug}?service=${serviceId}${providerId ? `&provider=${providerId}` : ''}`;

    const subject = `How was your appointment? — ${branding.businessName}`;
    const html = this.wrapHtml(branding, `
      <h2 style="color:#333;margin:0 0 16px;">How was your appointment?</h2>
      <p>Hi ${this.esc(d['clientName'])},</p>
      <p>We hope you enjoyed your recent appointment with <strong>${this.esc(branding.businessName)}</strong>!</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:140px;">Service</td>
          <td style="padding:8px 12px;background:#f5f5f5;">${this.esc(d['serviceName'])}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;">Date</td>
          <td style="padding:8px 12px;">${this.esc(d['dateTime'])}</td>
        </tr>
      </table>
      <p>Would you like to book again?</p>
      <p style="margin:24px 0;">
        <a href="${this.esc(rebookUrl)}" style="display:inline-block;padding:12px 24px;background:${branding.brandColor ?? '#000'};color:#fff;text-decoration:none;border-radius:6px;">Book Again</a>
      </p>
    `);
    return { subject, html };
  }

  private renderPaymentReminder(d: Record<string, unknown>): RenderedTemplate {
    const branding = this.extractBranding(d);
    const subject = `Payment reminder — ${branding.businessName}`;
    const html = this.wrapHtml(branding, `
      <h2 style="color:#333;margin:0 0 16px;">Payment Reminder</h2>
      <p>Hi ${this.esc(d['clientName'])},</p>
      <p>This is a reminder that you have an outstanding payment with <strong>${this.esc(branding.businessName)}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:140px;">Amount Due</td>
          <td style="padding:8px 12px;background:#f5f5f5;">${this.esc(d['currency'])} ${this.esc(d['amountDue'])}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;">Due Date</td>
          <td style="padding:8px 12px;">${this.esc(d['dueDate'])}</td>
        </tr>
        ${d['invoiceNumber'] ? `
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;">Invoice</td>
          <td style="padding:8px 12px;background:#f5f5f5;">#${this.esc(d['invoiceNumber'])}</td>
        </tr>` : ''}
      </table>
      <p>Please make your payment at your earliest convenience.</p>
    `);
    return { subject, html };
  }

  private renderMorningSummary(d: Record<string, unknown>): RenderedTemplate {
    const branding = this.extractBranding(d);
    const bookings = (d['bookings'] ?? []) as Array<Record<string, unknown>>;
    const date = String(d['date'] ?? 'Today');

    const bookingRows = bookings.length > 0
      ? bookings.map((b) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${this.esc(b['time'])}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${this.esc(b['clientName'])}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${this.esc(b['serviceName'])}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${this.esc(b['status'])}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="4" style="padding:12px;text-align:center;color:#888;">No bookings today</td></tr>`;

    const subject = `Today's bookings — ${date}`;
    const html = this.wrapHtml(branding, `
      <h2 style="color:#333;margin:0 0 16px;">Today's Bookings — ${this.esc(date)}</h2>
      <p>${bookings.length} booking${bookings.length !== 1 ? 's' : ''} scheduled for today.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px 12px;text-align:left;">Time</th>
            <th style="padding:8px 12px;text-align:left;">Client</th>
            <th style="padding:8px 12px;text-align:left;">Service</th>
            <th style="padding:8px 12px;text-align:left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${bookingRows}
        </tbody>
      </table>
    `);
    return { subject, html };
  }

  private renderWeeklyDigest(d: Record<string, unknown>): RenderedTemplate {
    const branding = this.extractBranding(d);
    const weekRange = String(d['weekRange'] ?? 'This Week');

    const subject = `Your weekly summary — ${branding.businessName}`;
    const html = this.wrapHtml(branding, `
      <h2 style="color:#333;margin:0 0 16px;">Weekly Summary — ${this.esc(weekRange)}</h2>
      <p>Here's a summary of your business activity this week:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:12px;background:#f5f5f5;font-weight:600;width:200px;">Total Bookings</td>
          <td style="padding:12px;background:#f5f5f5;">${this.esc(d['totalBookings'])}</td>
        </tr>
        <tr>
          <td style="padding:12px;font-weight:600;">Completed</td>
          <td style="padding:12px;">${this.esc(d['completedBookings'])}</td>
        </tr>
        <tr>
          <td style="padding:12px;background:#f5f5f5;font-weight:600;">Cancelled</td>
          <td style="padding:12px;background:#f5f5f5;">${this.esc(d['cancelledBookings'])}</td>
        </tr>
        <tr>
          <td style="padding:12px;font-weight:600;">No-shows</td>
          <td style="padding:12px;">${this.esc(d['noShowBookings'])}</td>
        </tr>
        <tr>
          <td style="padding:12px;background:#f5f5f5;font-weight:600;">Revenue</td>
          <td style="padding:12px;background:#f5f5f5;">${this.esc(d['currency'])} ${this.esc(d['totalRevenue'])}</td>
        </tr>
        <tr>
          <td style="padding:12px;font-weight:600;">New Clients</td>
          <td style="padding:12px;">${this.esc(d['newClients'])}</td>
        </tr>
      </table>
    `);
    return { subject, html };
  }

  private renderAbandonedBookingRecovery(d: Record<string, unknown>): RenderedTemplate {
    const branding = this.extractBranding(d);
    const rebookUrl = d['rebookUrl'] ? `${this.webUrl}${String(d['rebookUrl'])}` : this.webUrl;

    const subject = `Complete your booking — ${branding.businessName}`;
    const html = this.wrapHtml(branding, `
      <h2 style="color:#333;margin:0 0 16px;">You left something behind!</h2>
      <p>Hi ${this.esc(d['clientName'])},</p>
      <p>It looks like you started booking <strong>${this.esc(d['serviceName'])}</strong> with <strong>${this.esc(branding.businessName)}</strong> but didn't finish.</p>
      <p>No worries — your preferred time might still be available. Pick up right where you left off:</p>
      <p style="margin:24px 0;">
        <a href="${this.esc(rebookUrl)}" style="display:inline-block;padding:12px 24px;background:${branding.brandColor ?? '#000'};color:#fff;text-decoration:none;border-radius:6px;">Complete Your Booking</a>
      </p>
      <p style="font-size:13px;color:#888;">If you no longer need to book, you can safely ignore this email.</p>
    `);
    return { subject, html };
  }

  // ---- Helpers ----

  private extractBranding(d: Record<string, unknown>): TenantBranding {
    return {
      businessName: String(d['businessName'] ?? 'SavSpot'),
      logoUrl: d['logoUrl'] ? String(d['logoUrl']) : undefined,
      brandColor: d['brandColor'] ? String(d['brandColor']) : undefined,
    };
  }

  /**
   * Wraps content in a shared HTML email layout with basic styling
   * and optional tenant branding (logo, brand color).
   */
  private wrapHtml(branding: TenantBranding, content: string): string {
    const logoBlock = branding.logoUrl
      ? `<img src="${this.esc(branding.logoUrl)}" alt="${this.esc(branding.businessName)}" style="max-height:48px;margin-bottom:16px;" />`
      : '';
    const accentColor = branding.brandColor ?? '#000000';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.esc(branding.businessName)}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.6;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:${accentColor};padding:24px 32px;text-align:center;">
              ${logoBlock}
              <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;">${this.esc(branding.businessName)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#f5f5f5;text-align:center;font-size:12px;color:#888;">
              <p style="margin:0;">Sent via <a href="https://savspot.co" style="color:${accentColor};text-decoration:none;">SavSpot</a></p>
              <p style="margin:4px 0 0;">&copy; ${new Date().getFullYear()} ${this.esc(branding.businessName)}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Escapes HTML special characters for safe template rendering.
   */
  private esc(value: unknown): string {
    const str = value == null ? '' : String(value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
