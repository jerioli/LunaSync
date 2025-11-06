/**
 * Utility functions for handling API errors and extracting meaningful error messages
 */

export interface ParsedError {
  title: string;
  message: string;
  isValidationError: boolean;
  validationErrors?: Record<string, any>;
}

/**
 * Parses API error responses and extracts meaningful error messages
 * @param error - The error object from axios or other API calls
 * @param defaultMessage - Default message to show if no specific error is found
 * @returns ParsedError object with title and message
 */
export function parseApiError(error: any, defaultMessage: string = 'An error occurred. Please try again.'): ParsedError {
  let title = 'Error';
  let message = defaultMessage;
  let isValidationError = false;
  let validationErrors: Record<string, any> = {};

  // Check if this is already a processed validation error
  if (error.isValidationError && error.message) {
    return {
      title: 'Validation Error',
      message: error.message,
      isValidationError: true,
      validationErrors: error.validationErrors || {}
    };
  }

  // Handle axios response errors
  if (error.response?.data) {
    const errorData = error.response.data;
    
    if (typeof errorData === 'object') {
      const errorMessages: string[] = [];
      
      // Check for specific field errors (Django REST Framework style)
      const fieldErrors = ['email', 'phone', 'name', 'first_name', 'last_name', 'username', 'password', 'date_of_birth', 'gender'];
      
      fieldErrors.forEach(field => {
        if (errorData[field]) {
          const fieldError = Array.isArray(errorData[field]) 
            ? errorData[field].join(', ') 
            : errorData[field];
          
          // Format field name for display
          const displayField = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          errorMessages.push(`${displayField}: ${fieldError}`);
          validationErrors[field] = errorData[field];
          isValidationError = true;
        }
      });
      
      // Check for non-field errors
      if (errorData.non_field_errors) {
        const nonFieldErrors = Array.isArray(errorData.non_field_errors) 
          ? errorData.non_field_errors 
          : [errorData.non_field_errors];
        errorMessages.push(...nonFieldErrors);
        validationErrors.non_field_errors = errorData.non_field_errors;
        isValidationError = true;
      }
      
      // Check for detail error
      if (errorData.detail) {
        errorMessages.push(errorData.detail);
        validationErrors.detail = errorData.detail;
      }
      
      // Check for generic error message
      if (errorData.error) {
        errorMessages.push(errorData.error);
        validationErrors.error = errorData.error;
      }
      
      // Check for message field
      if (errorData.message) {
        errorMessages.push(errorData.message);
        validationErrors.message = errorData.message;
      }
      
      // If we found specific errors, use them
      if (errorMessages.length > 0) {
        title = isValidationError ? 'Validation Error' : 'Error';
        message = errorMessages.join('; ');
      }
    } else if (typeof errorData === 'string') {
      title = 'Error';
      message = errorData;
    }
  }
  
  // Handle network errors
  else if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
    title = 'Connection Error';
    message = 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  // Handle timeout errors
  else if (error.code === 'ECONNABORTED') {
    title = 'Timeout Error';
    message = 'The request took too long to complete. Please try again.';
  }
  
  // Handle other error types
  else if (error.message) {
    message = error.message;
  }

  return {
    title,
    message,
    isValidationError,
    validationErrors
  };
}

/**
 * Common validation error messages that can be checked for specific handling
 */
export const COMMON_VALIDATION_ERRORS = {
  EMAIL_EXISTS: 'email already exists',
  PHONE_EXISTS: 'phone number already exists',
  USERNAME_EXISTS: 'username already exists',
  INVALID_EMAIL: 'invalid email',
  REQUIRED_FIELD: 'required',
  WEAK_PASSWORD: 'password is too weak',
  PASSWORD_MISMATCH: 'passwords do not match'
};

/**
 * Checks if an error message contains a specific validation error
 */
export function hasValidationError(error: ParsedError, errorType: string): boolean {
  return error.message.toLowerCase().includes(errorType.toLowerCase());
}

/**
 * Formats field validation errors for display in forms
 */
export function formatFieldErrors(validationErrors: Record<string, any>): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  
  Object.keys(validationErrors).forEach(field => {
    if (field !== 'non_field_errors' && field !== 'detail' && field !== 'error' && field !== 'message') {
      const error = validationErrors[field];
      formattedErrors[field] = Array.isArray(error) ? error.join(', ') : error;
    }
  });
  
  return formattedErrors;
}
