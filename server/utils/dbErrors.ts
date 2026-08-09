export interface LocalizedErrorResponse {
  error_ar: string;
  error_en: string;
  code: string;
  status: number;
}

/**
 * Maps PostgreSQL error codes to secure, localized user messages
 * without leaking database internals or raw SQL details to clients.
 */
export function formatDatabaseError(err: any, language: 'ar' | 'en' = 'ar'): LocalizedErrorResponse {
  const pgCode = err?.code || '';
  const message = err?.message || 'Database error occurred';

  // Log internal details securely for server diagnostic logs
  console.error('[DatabaseError]', {
    code: pgCode,
    detail: err?.detail,
    constraint: err?.constraint,
    table: err?.table,
    message: message,
    timestamp: new Date().toISOString()
  });

  switch (pgCode) {
    case '23505': // Unique violation
      return {
        status: 409,
        code: 'RECORD_EXISTS',
        error_ar: 'هذا السجل موجود مسبقًا في النظام.',
        error_en: 'This record already exists in the system.'
      };
    case '23503': // Foreign key violation
      return {
        status: 400,
        code: 'FOREIGN_KEY_VIOLATION',
        error_ar: 'لا يمكن تنفيذ العملية بسبب ارتباط البيانات بسجلات أخرى.',
        error_en: 'Operation failed due to linked data constraints.'
      };
    case '23514': // Check constraint violation
      return {
        status: 400,
        code: 'CONSTRAINT_VIOLATION',
        error_ar: 'القيمة المدخلة غير صالحة وتخالف الشروط المعتمدة.',
        error_en: 'Provided value is invalid according to system constraints.'
      };
    case '42P01': // Undefined table
      return {
        status: 500,
        code: 'SCHEMA_ERROR',
        error_ar: 'حدث خطأ تقني في تهيئة المخطط.',
        error_en: 'Internal schema setup error.'
      };
    case '42703': // Undefined column
      return {
        status: 500,
        code: 'SCHEMA_FIELD_ERROR',
        error_ar: 'حدث خطأ تقني في حقول قاعدة البيانات.',
        error_en: 'Internal database column error.'
      };
    case '57014': // Query cancelled / timeout
      return {
        status: 504,
        code: 'QUERY_TIMEOUT',
        error_ar: 'انتهت مهلة تنفيذ استعلام قاعدة البيانات.',
        error_en: 'Database query execution timed out.'
      };
    case '40001': // Serialization failure / deadlock
      return {
        status: 409,
        code: 'TRANSACTION_CONFLICT',
        error_ar: 'حدث تعارض أثناء المعالجة، يُرجى إعادة المحاولة.',
        error_en: 'Transaction conflict occurred, please retry.'
      };
    default:
      return {
        status: 500,
        code: 'INTERNAL_DATABASE_ERROR',
        error_ar: 'حدث خطأ أثناء معالجة البيانات، يُرجى المحاولة لاحقًا.',
        error_en: 'An error occurred while processing data, please try again later.'
      };
  }
}
