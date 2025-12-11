// Query surface placeholders; slice 6 will implement.
export interface FeatureContextOptions {
  depth?: number;
}

export const getFeatureContext = async (
  _feature: string,
  _opts?: FeatureContextOptions,
): Promise<{ feature: string; implementers: unknown[]; callGraph: unknown[] }> => {
  return await Promise.resolve({ feature: _feature, implementers: [], callGraph: [] });
};

export const getBoundaryPatternExamples = async (_limit = 10): Promise<unknown[]> =>
  await Promise.resolve([]);

export const getIncidentSlice = async (
  _incidentId: string,
): Promise<{ incidentId: string; rootCauseSymbols: unknown[]; affectedFeatures: unknown[] }> => {
  return await Promise.resolve({
    incidentId: _incidentId,
    rootCauseSymbols: [],
    affectedFeatures: [],
  });
};
