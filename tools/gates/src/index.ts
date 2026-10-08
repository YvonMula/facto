import type { Gate } from './lib.js';
import { noLocation } from './no-location.js';
import { noTelemetry } from './no-telemetry.js';
import { noIdentifiers } from './no-identifiers.js';
import { depsReviewed } from './deps-reviewed.js';
import { permissions } from './permissions.js';
import { i18n } from './i18n.js';
import { claims } from './claims.js';

export const GATES: Gate[] = [noLocation, noTelemetry, noIdentifiers, depsReviewed, permissions, i18n, claims];
export type { Gate, Violation } from './lib.js';
