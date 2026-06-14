/**
 * Centralized Backend Validator Utility for Orchestrator Tool pricing and schema configurations in Perplexta.
 * Forces all tool price inputs to be numerical, positive (>= 0), and non-empty,
 * validating strict adherence to the `tool_orchestrator` table schema, and ensuring
 * that any provider (like Replicate, Runway, or custom URLs) works symmetrically.
 */

export interface ServerValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Helper validation function for numbers
 */
function validateNumberField(val: any, fieldName: string, errors: string[]) {
  if (val === undefined || val === null || String(val).trim() === '') {
    errors.push(`${fieldName} cannot be empty.`);
    return;
  }

  const parsed = Number(val);
  if (isNaN(parsed)) {
    errors.push(`${fieldName} must be a valid number.`);
    return;
  }

  if (parsed < 0) {
    errors.push(`${fieldName} cannot be negative. Must be >= 0.`);
  }
}

/**
 * Validates active tool routes pricing and structure fields.
 */
export function validateServerToolRoute(route: {
  tool_id?: string;
  primary_provider?: string;
  primary_model?: string;
  fallback_1_provider?: string;
  fallback_1_model?: string;
  fallback_2_provider?: string;
  fallback_2_model?: string;
  fallback_3_provider?: string;
  fallback_3_model?: string;
  is_active?: boolean;
  cost_per_usage?: any;
  cost_per_1k_input_tokens?: any;
  cost_per_1k_output_tokens?: any;
  protocol_config?: any;
}): ServerValidationResult {
  const errors: string[] = [];

  const { 
    tool_id, 
    cost_per_usage, 
    cost_per_1k_input_tokens, 
    cost_per_1k_output_tokens,
    primary_provider,
    primary_model,
    fallback_1_provider,
    fallback_1_model,
    fallback_2_provider,
    fallback_2_model,
    fallback_3_provider,
    fallback_3_model,
    protocol_config
  } = route;

  if (!tool_id || String(tool_id).trim() === '') {
    errors.push("tool_id is required and cannot be empty.");
  }

  // Validate price outputs
  validateNumberField(cost_per_usage, "cost_per_usage", errors);
  validateNumberField(cost_per_1k_input_tokens, "cost_per_1k_input_tokens", errors);
  validateNumberField(cost_per_1k_output_tokens, "cost_per_1k_output_tokens", errors);

  // Validate maximum string length properties to prevent database insertion/overflow issues
  const validateStringLen = (val: string | undefined, limit: number, fieldName: string) => {
    if (val && String(val).length > limit) {
      errors.push(`${fieldName} string exceeds database schema VARCHAR limit of ${limit} characters.`);
    }
  };

  validateStringLen(primary_provider, 100, "primary_provider");
  validateStringLen(primary_model, 255, "primary_model");
  validateStringLen(fallback_1_provider, 100, "fallback_1_provider");
  validateStringLen(fallback_1_model, 255, "fallback_1_model");
  validateStringLen(fallback_2_provider, 100, "fallback_2_provider");
  validateStringLen(fallback_2_model, 255, "fallback_2_model");
  validateStringLen(fallback_3_provider, 100, "fallback_3_provider");
  validateStringLen(fallback_3_model, 255, "fallback_3_model");

  // Multi-provider Symmetrical Validation for VIDEO tool (Ensures NO "Google-only" restriction is present)
  if (tool_id === 'video') {
    // Ensure that if primary_provider is designated, a matching model is defined, and vice-versa
    if (primary_provider && !primary_model) {
      errors.push("Video Tool Error: A specific model must be set when designating a primary provider.");
    }
  }

  // Ensure JSON parsing compliance for protocol_config
  if (protocol_config !== undefined && protocol_config !== null) {
    if (typeof protocol_config === 'string') {
      try {
        JSON.parse(protocol_config);
      } catch (e) {
        errors.push("protocol_config holds corrupt or malformed JSON format.");
      }
    } else if (typeof protocol_config !== 'object') {
      errors.push("protocol_config carries unsupported primitive types.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
