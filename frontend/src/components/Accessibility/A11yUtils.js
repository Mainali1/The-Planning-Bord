import React from 'react';
import PropTypes from 'prop-types';

/**
 * VisuallyHidden component for screen reader only content
 * Hides content visually while keeping it accessible to screen readers
 */
export const VisuallyHidden = ({ children, as: Component = 'span', ...props }) => {
  return (
    <Component
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

VisuallyHidden.propTypes = {
  children: PropTypes.node.isRequired,
  as: PropTypes.elementType,
};

/**
 * SkipLink component for keyboard navigation
 * Provides a way to skip to main content
 */
export const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }) => {
  return (
    <a
      href={href}
      style={{
        position: 'absolute',
        top: -40,
        left: 6,
        background: '#000',
        color: '#fff',
        padding: '8px',
        textDecoration: 'none',
        borderRadius: '4px',
        zIndex: 9999,
        transition: 'top 0.3s',
      }}
      onFocus={(e) => {
        e.target.style.top = '6px';
      }}
      onBlur={(e) => {
        e.target.style.top = '-40px';
      }}
    >
      {children}
    </a>
  );
};

SkipLink.propTypes = {
  href: PropTypes.string,
  children: PropTypes.string,
};

/**
 * A11yText component for providing additional context to screen readers
 */
export const A11yText = ({ children, id }) => {
  return (
    <span id={id} style={{ display: 'none' }}>
      {children}
    </span>
  );
};

A11yText.propTypes = {
  children: PropTypes.node.isRequired,
  id: PropTypes.string.isRequired,
};

/**
 * FocusTrap component for modal dialogs
 * Traps focus within a container element
 */
export class FocusTrap extends React.Component {
  constructor(props) {
    super(props);
    this.containerRef = React.createRef();
    this.previousActiveElement = null;
  }

  componentDidMount() {
    this.previousActiveElement = document.activeElement;
    this.trapFocus();
  }

  componentWillUnmount() {
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
    }
  }

  trapFocus = () => {
    const focusableElements = this.containerRef.current.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    this.containerRef.current.addEventListener('keydown', handleTabKey);
    this.removeKeydownListener = () => {
      this.containerRef.current.removeEventListener('keydown', handleTabKey);
    };
  };

  render() {
    return (
      <div ref={this.containerRef}>
        {this.props.children}
      </div>
    );
  }
}

FocusTrap.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * LiveRegion component for dynamic content announcements
 */
export const LiveRegion = ({ children, ariaLive = 'polite', ariaAtomic = 'true' }) => {
  return (
    <div
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

LiveRegion.propTypes = {
  children: PropTypes.node.isRequired,
  ariaLive: PropTypes.oneOf(['off', 'polite', 'assertive']),
  ariaAtomic: PropTypes.oneOf(['true', 'false']),
};

/**
 * Keyboard shortcut utility
 */
export const useKeyboardShortcut = (key, callback, dependencies = []) => {
  React.useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === key && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        callback(event);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [key, callback, ...dependencies]);
};

/**
 * Announce to screen readers
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};