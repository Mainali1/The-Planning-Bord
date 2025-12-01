import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { VisuallyHidden, announceToScreenReader } from './A11yUtils';

/**
 * AccessibleForm component with built-in accessibility features
 */
export const AccessibleForm = ({ children, onSubmit, ariaLabel, ariaDescribedBy }) => {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(e);
      announceToScreenReader('Form submitted successfully', 'polite');
    } catch (error) {
      announceToScreenReader('Form submission failed. Please check your input.', 'assertive');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      noValidate
    >
      {children({ errors, isSubmitting })}
    </form>
  );
};

AccessibleForm.propTypes = {
  children: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  ariaDescribedBy: PropTypes.string,
};

/**
 * AccessibleInput component with proper labeling and error handling
 */
export const AccessibleInput = ({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  ariaDescribedBy,
  ariaInvalid,
  autoComplete,
  className = '',
  error,
  ...props
}) => {
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : ariaDescribedBy;

  return (
    <div className={`form-group ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required" aria-label="required"> *</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={ariaInvalid || !!error}
        aria-required={required}
        autoComplete={autoComplete}
        className="form-input"
        {...props}
      />
      {error && (
        <div id={errorId} className="error-message" role="alert" aria-live="polite">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

AccessibleInput.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  ariaDescribedBy: PropTypes.string,
  ariaInvalid: PropTypes.bool,
  autoComplete: PropTypes.string,
  className: PropTypes.string,
  error: PropTypes.string,
};

/**
 * AccessibleSelect component
 */
export const AccessibleSelect = ({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  options = [],
  required = false,
  disabled = false,
  placeholder,
  ariaDescribedBy,
  error,
  ...props
}) => {
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : ariaDescribedBy;

  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required" aria-label="required"> *</span>}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={!!error}
        aria-required={required}
        className="form-select"
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <div id={errorId} className="error-message" role="alert" aria-live="polite">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

AccessibleSelect.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  ariaDescribedBy: PropTypes.string,
  error: PropTypes.string,
};

/**
 * AccessibleButton component
 */
export const AccessibleButton = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  ariaLabel,
  ariaPressed,
  ariaExpanded,
  ariaControls,
  className = '',
  loading = false,
  ...props
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      className={`btn btn-${variant} ${className} ${loading ? 'loading' : ''}`}
      {...props}
    >
      {loading && <span className="loading-spinner" aria-hidden="true">⟳</span>}
      {loading && <VisuallyHidden>Loading...</VisuallyHidden>}
      {!loading && children}
    </button>
  );
};

AccessibleButton.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success']),
  disabled: PropTypes.bool,
  ariaLabel: PropTypes.string,
  ariaPressed: PropTypes.bool,
  ariaExpanded: PropTypes.bool,
  ariaControls: PropTypes.string,
  className: PropTypes.string,
  loading: PropTypes.bool,
};

/**
 * Form validation utilities
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

export const validateRequired = (value, fieldName) => {
  if (!value || value.trim() === '') return `${fieldName} is required`;
  return null;
};

export const validateMinLength = (value, minLength, fieldName) => {
  if (value && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters long`;
  }
  return null;
};