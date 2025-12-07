import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Responsive breakpoint utilities
 */
export const breakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
};

/**
 * useMediaQuery hook for responsive design
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addListener(listener);

    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
};

/**
 * useResponsive hook for common responsive patterns
 */
export const useResponsive = () => {
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet - 1}px)`);
  const isTablet = useMediaQuery(`(min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px)`);
  const isDesktop = useMediaQuery(`(min-width: ${breakpoints.desktop}px)`);
  const isLargeDesktop = useMediaQuery(`(min-width: ${breakpoints.largeDesktop}px)`);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isTouch: isMobile || isTablet,
  };
};

/**
 * Responsive container component
 */
export const ResponsiveContainer = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`responsive-container ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

ResponsiveContainer.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Mobile-first responsive grid component
 */
export const ResponsiveGrid = ({ 
  children, 
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = { mobile: 1, tablet: 2, desktop: 3 },
  className = ''
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  const currentCols = isMobile ? cols.mobile : isTablet ? cols.tablet : cols.desktop;
  const currentGap = isMobile ? gap.mobile : isTablet ? gap.tablet : gap.desktop;

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${currentCols}, 1fr)`,
    gap: `${currentGap}rem`,
  };

  return (
    <div className={`responsive-grid ${className}`} style={gridStyle}>
      {children}
    </div>
  );
};

ResponsiveGrid.propTypes = {
  children: PropTypes.node.isRequired,
  cols: PropTypes.shape({
    mobile: PropTypes.number,
    tablet: PropTypes.number,
    desktop: PropTypes.number,
  }),
  gap: PropTypes.shape({
    mobile: PropTypes.number,
    tablet: PropTypes.number,
    desktop: PropTypes.number,
  }),
  className: PropTypes.string,
};

/**
 * Responsive table component
 */
export const ResponsiveTable = ({ children, className = '', ...props }) => {
  const { isMobile } = useResponsive();
  
  return (
    <div className={`responsive-table-container ${isMobile ? 'mobile-table' : ''}`}>
      <table 
        className={`responsive-table ${className}`}
        role="table"
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

ResponsiveTable.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Responsive navigation component
 */
export const ResponsiveNav = ({ items, currentPath, onNavigate }) => {
  const { isMobile } = useResponsive();
  const [isOpen, setIsOpen] = useState(false);

  const toggleNav = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (isMobile) {
    return (
      <nav className="responsive-nav mobile" role="navigation" aria-label="Main navigation">
        <button
          className="nav-toggle"
          onClick={toggleNav}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span className="nav-toggle-icon">{isOpen ? '✕' : '☰'}</span>
          <span className="nav-toggle-text">Menu</span>
        </button>
        
        {isOpen && (
          <ul id="mobile-nav" className="nav-list mobile">
            {items.map((item) => (
              <li key={item.path} className="nav-item">
                <a
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(item.path);
                    setIsOpen(false);
                  }}
                  className={`nav-link ${currentPath === item.path ? 'active' : ''}`}
                  aria-current={currentPath === item.path ? 'page' : undefined}
                >
                  {item.icon && <span className="nav-icon" aria-hidden="true">{item.icon}</span>}
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    );
  }

  return (
    <nav className="responsive-nav desktop" role="navigation" aria-label="Main navigation">
      <ul className="nav-list desktop">
        {items.map((item) => (
          <li key={item.path} className="nav-item">
            <a
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.path);
              }}
              className={`nav-link ${currentPath === item.path ? 'active' : ''}`}
              aria-current={currentPath === item.path ? 'page' : undefined}
            >
              {item.icon && <span className="nav-icon" aria-hidden="true">{item.icon}</span>}
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

/**
 * Responsive card component
 */
export const ResponsiveCard = ({ 
  children, 
  title, 
  actions,
  className = '',
  ...props 
}) => {
  const { isMobile } = useResponsive();
  
  return (
    <div 
      className={`responsive-card ${isMobile ? 'mobile-card' : ''} ${className}`}
      {...props}
    >
      {(title || actions) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

ResponsiveCard.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  actions: PropTypes.node,
  className: PropTypes.string,
};

/**
 * Touch-friendly button component
 */
export const TouchFriendlyButton = ({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'default',
  disabled = false,
  ariaLabel,
  ...props 
}) => {
  const buttonSizes = {
    small: { minHeight: '36px', minWidth: '36px', padding: '8px 12px' },
    default: { minHeight: '44px', minWidth: '44px', padding: '12px 16px' },
    large: { minHeight: '48px', minWidth: '48px', padding: '16px 20px' },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        minHeight: buttonSizes[size].minHeight,
        minWidth: buttonSizes[size].minWidth,
        padding: buttonSizes[size].padding,
        fontSize: size === 'large' ? '16px' : '14px',
        touchAction: 'manipulation', // Disable double-tap zoom
        WebkitTapHighlightColor: 'transparent', // Remove tap highlight on mobile
      }}
      className={`touch-friendly-btn btn-${variant} btn-${size}`}
      {...props}
    >
      {children}
    </button>
  );
};

TouchFriendlyButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary']),
  size: PropTypes.oneOf(['small', 'default', 'large']),
  disabled: PropTypes.bool,
  ariaLabel: PropTypes.string,
};

/**
 * Responsive image component with proper alt text handling
 */
export const ResponsiveImage = ({ 
  src, 
  alt, 
  srcSet,
  sizes,
  loading = 'lazy',
  decoding = 'async',
  className = '',
  ...props 
}) => {
  return (
    <img
      src={src}
      alt={alt}
      srcSet={srcSet}
      sizes={sizes}
      loading={loading}
      decoding={decoding}
      className={`responsive-image ${className}`}
      {...props}
    />
  );
};

ResponsiveImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  srcSet: PropTypes.string,
  sizes: PropTypes.string,
  loading: PropTypes.oneOf(['lazy', 'eager']),
  decoding: PropTypes.oneOf(['async', 'sync', 'auto']),
  className: PropTypes.string,
};

/**
 * CSS utilities for responsive design
 */
export const responsiveStyles = `
  /* Responsive container */
  .responsive-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  /* Responsive grid */
  .responsive-grid {
    width: 100%;
  }

  /* Responsive table */
  .responsive-table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .responsive-table {
    width: 100%;
    border-collapse: collapse;
  }

  .responsive-table.mobile-table {
    font-size: 14px;
  }

  /* Responsive navigation */
  .nav-toggle {
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .nav-toggle:focus {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-list.mobile {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
  }

  .nav-list.desktop {
    display: flex;
    gap: 1rem;
  }

  .nav-link {
    display: block;
    padding: 0.75rem 1rem;
    text-decoration: none;
    color: inherit;
  }

  .nav-link:hover,
  .nav-link:focus {
    background-color: #f5f5f5;
    outline: none;
  }

  .nav-link.active {
    font-weight: bold;
    color: #0066cc;
  }

  /* Responsive card */
  .responsive-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    overflow: hidden;
  }

  .responsive-card.mobile-card {
    margin: 0 -1rem;
    border-radius: 0;
  }

  .card-header {
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-title {
    margin: 0;
    font-size: 1.25rem;
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
  }

  .card-content {
    padding: 1rem;
  }

  /* Touch-friendly button */
  .touch-friendly-btn {
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .touch-friendly-btn:focus {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
  }

  .touch-friendly-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #0066cc;
    color: white;
  }

  .btn-secondary {
    background-color: #f5f5f5;
    color: #333;
  }

  /* Responsive image */
  .responsive-image {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* Utility classes */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .focus-visible:focus {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
  }
`;