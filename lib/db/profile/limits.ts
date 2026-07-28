/** Write-boundary limits for profile draft fields (PII minimization). */
export const PROFILE_LIMITS = {
  displayNameMax: 80,
  bioMax: 500,
  homeGymIdMax: 64,
  homeGymNameMax: 120,
  socialMax: 200,
} as const;
