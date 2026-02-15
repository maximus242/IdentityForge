import { z } from 'zod';

export const ExportFormatSchema = z.enum(['json', 'csv']);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const ExportRequestSchema = z.object({
  format: ExportFormatSchema
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;