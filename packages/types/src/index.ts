// IdentityForge TypeScript Types
// These types mirror the Prisma schema and add client-side types

import { z } from 'zod';

// ... (previous content remains the same until API REQUEST/RESPONSE TYPES section)

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export const ExportFormatSchema = z.enum(['JSON', 'CSV']);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export interface ExportBeliefsQuery {
  format: ExportFormat;
}

export const ExportBeliefsQuerySchema = z.object({
  format: ExportFormatSchema
});

// ... (rest of the existing content)