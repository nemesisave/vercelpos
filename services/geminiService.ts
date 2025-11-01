// AI is disabled in this project. Keep the stub so imports don’t break.
const errorMessage = 'Gemini / Google AI is disabled in this deployment.';

export async function getRolePermissionSuggestions() {
  console.warn(errorMessage);
  return Promise.resolve([]);
}

export async function getBusinessAnalysis() {
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export async function analyzeUserActivity() {
    console.error(errorMessage);
    throw new Error(errorMessage);
}
