/**
 * Booth mode utilities
 */

/**
 * Check if the application is running in booth mode
 */
export const isBoothMode = (): boolean => {
  return import.meta.env.PUBLIC_BOOTH_MODE === 'true';
};
