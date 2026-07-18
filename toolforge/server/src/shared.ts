// server/src/shared.ts — re-export the shared contract for all server modules.
// Always import the contract via `../shared` (from src/<module>/*.ts) so paths stay consistent.
export * from '../../shared/types';
export * from '../../shared/sample-app/ubs';
