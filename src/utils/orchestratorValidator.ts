/**
 * Centralized Validator Utility for Orchestrator Tool pricing and schema configurations in Perplexta Admin Panel.
 * Forces all tool price inputs to be numerical, positive (>= 0), and non-empty,
 * and validates strict adherence to the `tool_orchestrator` schema parameters,
 * ensuring no legacy "Google-only" locks can interfere with any dynamic tool routing.
 */

export interface ValidationResult {
  isValid: boolean;
  parsedValue?: number;
  error?: string;
  errorAr?: string;
}

export interface RouteValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a single price or token cost input.
 * Ensures it's non-empty, a valid number, and >= 0.
 */
export function validatePriceInput(value: any, fieldLabelEn: string, fieldLabelAr: string): ValidationResult {
  if (value === undefined || value === null || String(value).trim() === '') {
    return {
      isValid: false,
      error: `"${fieldLabelEn}" cannot be empty.`,
      errorAr: `لا يمكن أن يكون حقل "${fieldLabelAr}" فارغاً.`,
    };
  }

  const parsed = Number(value);
  if (isNaN(parsed)) {
    return {
      isValid: false,
      error: `"${fieldLabelEn}" must be a valid number.`,
      errorAr: `يجب أن يكون حقل "${fieldLabelAr}" رقماً صالحاً.`,
    };
  }

  if (parsed < 0) {
    return {
      isValid: false,
      error: `"${fieldLabelEn}" cannot be negative. Must be 0 or dynamic positive points.`,
      errorAr: `لا يمكن أن يكون حقل "${fieldLabelAr}" سالباً. يجب أن يكون 0 أو نقاطاً موجبة.`,
    };
  }

  return {
    isValid: true,
    parsedValue: parsed,
  };
}

/**
 * Validates the full pricing structure for a tool route configuration.
 */
export function validateToolRoutePricing(route: {
  id?: string;
  tool_id?: string;
  costPerUsage?: any;
  cost_per_usage?: any;
  costPer1kInputTokens?: any;
  cost_per_1k_input_tokens?: any;
  costPer1kOutputTokens?: any;
  cost_per_1k_output_tokens?: any;
}, language: 'ar' | 'en' = 'en'): RouteValidationResult {
  const errors: string[] = [];
  
  const costPerUsage = route.costPerUsage !== undefined ? route.costPerUsage : route.cost_per_usage;
  const costPer1kInputTokens = route.costPer1kInputTokens !== undefined ? route.costPer1kInputTokens : route.cost_per_1k_input_tokens;
  const costPer1kOutputTokens = route.costPer1kOutputTokens !== undefined ? route.costPer1kOutputTokens : route.cost_per_1k_output_tokens;

  const baseVal = validatePriceInput(
    costPerUsage,
    'Flat Execution Base Cost',
    'رسم تشغيل الخدمة الثابت'
  );
  if (!baseVal.isValid) {
    errors.push(language === 'ar' ? baseVal.errorAr! : baseVal.error!);
  }

  const inputVal = validatePriceInput(
    costPer1kInputTokens,
    'Input /1k Token Cost',
    'سعر مدخلات /1K توكن'
  );
  if (!inputVal.isValid) {
    errors.push(language === 'ar' ? inputVal.errorAr! : inputVal.error!);
  }

  const outputVal = validatePriceInput(
    costPer1kOutputTokens,
    'Output /1k Token Cost',
    'سعر مخرجات /1K توكن'
  );
  if (!outputVal.isValid) {
    errors.push(language === 'ar' ? outputVal.errorAr! : outputVal.error!);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Unified verification checking that forces a route configuration to follow the 
 * complete strict database schema of `tool_orchestrator`.
 * Disallows legacy "Google-only" locks, ensuring any video provider like Replicate,
 * Runway, custom APIs, as well as Gemini/Google operate symmetrically.
 */
export function validateFullOrchestratorRoute(route: {
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
  costPerUsage?: any;
  cost_per_1k_input_tokens?: any;
  costPer1kInputTokens?: any;
  cost_per_1k_output_tokens?: any;
  costPer1kOutputTokens?: any;
  task_description?: string;
  task_description_ar?: string;
  protocol_config?: any;
}, language: 'ar' | 'en' = 'en'): RouteValidationResult {
  const errors: string[] = [];

  const tId = route.tool_id;
  if (!tId || String(tId).trim() === '') {
    errors.push(language === 'ar' ? "مُعرف الخدمة (tool_id) مطلوب ولا يمكن تركه فارغاً." : "api: tool_id is required and cannot be empty.");
  }

  // Validate price fields using the central pricing validaton logic
  const costUsage = route.costPerUsage !== undefined ? route.costPerUsage : route.cost_per_usage;
  const costInput = route.costPer1kInputTokens !== undefined ? route.costPer1kInputTokens : route.cost_per_1k_input_tokens;
  const costOutput = route.costPer1kOutputTokens !== undefined ? route.costPer1kOutputTokens : route.cost_per_1k_output_tokens;

  const baseCheck = validatePriceInput(costUsage, 'Flat Execution Base Cost', 'رسم الاستخدام الثابت');
  if (!baseCheck.isValid) {
    errors.push(language === 'ar' ? baseCheck.errorAr! : baseCheck.error!);
  }

  const inputCheck = validatePriceInput(costInput, 'Input /1k Token Cost', 'رسم المدخلات لكل 1k توكن');
  if (!inputCheck.isValid) {
    errors.push(language === 'ar' ? inputCheck.errorAr! : inputCheck.error!);
  }

  const outputCheck = validatePriceInput(costOutput, 'Output /1k Token Cost', 'رسم المخرجات لكل 1k توكن');
  if (!outputCheck.isValid) {
    errors.push(language === 'ar' ? outputCheck.errorAr! : outputCheck.error!);
  }

  // Schema string length checks to protect database VARCHAR boundaries
  const validateVarcharField = (val: any, limit: number, enName: string, arName: string) => {
    if (val && String(val).length > limit) {
      errors.push(language === 'ar' 
        ? `حقل "${arName}" تجاوز الحد الأقصى للمحارف (${limit}).`
        : `Field "${enName}" exceeded maximum allowed VARCHAR limit of ${limit} characters.`
      );
    }
  };

  validateVarcharField(route.primary_provider, 100, 'Primary Provider', 'المزود الرئيسي');
  validateVarcharField(route.primary_model, 255, 'Primary Model', 'النموذج الرئيسي');
  validateVarcharField(route.fallback_1_provider, 100, 'Fallback 1 Provider', 'المزود البديل 1');
  validateVarcharField(route.fallback_1_model, 255, 'Fallback 1 Model', 'النموذج البديل 1');
  validateVarcharField(route.fallback_2_provider, 100, 'Fallback 2 Provider', 'المزود البديل 2');
  validateVarcharField(route.fallback_2_model, 255, 'Fallback 2 Model', 'النموذج البديل 2');
  validateVarcharField(route.fallback_3_provider, 100, 'Fallback 3 Provider', 'المزود البديل 3');
  validateVarcharField(route.fallback_3_model, 255, 'Fallback 3 Model', 'النموذج البديل 3');

  // Multi-provider Symmetrical Validation for VIDEO tool (Ensures NO "Google-only" restriction is present)
  if (tId === 'video') {
    // If provider is specified, verify a model exists; and vice-versa
    if (route.primary_provider && !route.primary_model) {
      errors.push(language === 'ar'
        ? "أداة الفيديو: يجب تحديد نموذج مخصص عند تفعيل مزود الفيديو الرئيسي."
        : "Video Tool: A specific model must be set when designating a primary provider."
      );
    }
  }

  // Ensure JSON parsing compliance for protocol_config
  if (route.protocol_config !== undefined && route.protocol_config !== null) {
    if (typeof route.protocol_config === 'string') {
      try {
        JSON.parse(route.protocol_config);
      } catch (e) {
        errors.push(language === 'ar'
          ? "تنسيق إعدادات البروتوكول غير صالح (يجب أن يكون JSON صالحاً)."
          : "Protocol configuration metadata holds corrupt or malformed JSON format."
        );
      }
    } else if (typeof route.protocol_config !== 'object') {
      errors.push(language === 'ar'
        ? "مواصفات بروتوكول التشغيل البينية ممررة بتنسيق غير مدعوم."
        : "Protocol custom config carries unsupported primitive types."
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
