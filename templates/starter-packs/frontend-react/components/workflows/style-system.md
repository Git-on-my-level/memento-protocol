---
name: style-system
description: A comprehensive approach to implementing consistent styling systems in React applications using CSS modules, styled components, or Tailwind CSS.
author: memento-protocol
version: 1.0.0
tags: [css, styling, design-system, react, frontend, tailwind, styled-components]
dependencies: []
---

# Style System Workflow

A comprehensive approach to implementing consistent styling systems in React applications using CSS modules, styled components, or Tailwind CSS.

## Prerequisites
- React project with preferred styling solution
- UI Reviewer mode recommended for style consistency
- Access to design tokens and brand guidelines
- Understanding of responsive design principles

## Inputs
- **approach**: Styling approach (css-modules, styled-components, tailwind, emotion)
- **scope**: System scope (component, feature, application)
- **tokens**: Design tokens (colors, spacing, typography, etc.)
- **responsive**: Responsive design requirements

## Outputs
- Styled components with consistent design tokens
- Utility classes or styled component library
- Responsive design implementation
- Style guide documentation and examples

## Example Commands

### Natural Language Invocations
- "execute style-system for design tokens setup"
- "implement consistent button styling across components"
- "create responsive layout system with Tailwind"
- "establish theme system with CSS custom properties"

### Common Use Cases
- `execute style-system --approach tailwind --scope application` → Tailwind design system
- `execute style-system --approach styled-components --tokens true` → Styled components with tokens
- `execute style-system --approach css-modules --responsive true` → CSS modules with breakpoints
- `execute style-system --approach emotion --theme true` → Emotion theme system

### Workflow Integration Examples
- "execute style-system then create component library" → Styles + Components
- "implement style-system and document patterns" → Styles + Documentation
- "set up style-system following design specifications" → Styles + Design consistency

## Workflow Steps

### 1. Design System Planning (20 minutes)

#### 1.1 Design Token Audit

**Collect Design Tokens:**
```typescript
// tokens/colors.ts
export const colors = {
  // Brand colors
  brand: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      500: '#3b82f6',
      600: '#2563eb',
      900: '#1e3a8a'
    },
    secondary: {
      50: '#f8fafc',
      500: '#64748b',
      900: '#0f172a'
    }
  },
  
  // Semantic colors
  semantic: {
    success: '#10b981',
    warning: '#f59e0b', 
    error: '#ef4444',
    info: '#3b82f6'
  },
  
  // Neutral palette
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    500: '#6b7280',
    900: '#111827',
    1000: '#000000'
  }
} as const;

// tokens/spacing.ts
export const spacing = {
  0: '0px',
  1: '0.25rem',    // 4px
  2: '0.5rem',     // 8px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  32: '8rem',      // 128px
} as const;

// tokens/typography.ts
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'serif'],
    mono: ['JetBrains Mono', 'monospace']
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }]
  },
  fontWeight: {
    normal: '400',
    medium: '500', 
    semibold: '600',
    bold: '700'
  }
} as const;

// tokens/breakpoints.ts
export const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;
```

#### 1.2 Component Style Patterns

**Identify Common Patterns:**
- Button variants (primary, secondary, ghost, danger)
- Card layouts with consistent spacing
- Form input styles and states
- Navigation and layout components
- Typography hierarchy and spacing

### 2. Implementation by Approach

#### 2.1 Tailwind CSS Implementation

**tailwind.config.js Setup:**
```javascript
// tailwind.config.js
const { colors, spacing, typography, breakpoints } = require('./src/tokens');

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        semantic: colors.semantic,
        neutral: colors.neutral
      },
      spacing,
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      screens: breakpoints
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};
```

**Component Implementation:**
```typescript
// Button.tsx - Tailwind approach
import React from 'react';
import { cn } from '@/lib/utils'; // clsx + tailwind-merge utility

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const buttonVariants = {
  primary: 'bg-brand-primary-500 hover:bg-brand-primary-600 text-white',
  secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900',
  ghost: 'hover:bg-neutral-100 text-neutral-700',
  danger: 'bg-semantic-error hover:bg-red-600 text-white'
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md', 
  className,
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-md font-medium',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        
        // Variants
        buttonVariants[variant],
        buttonSizes[size],
        
        // Focus ring color
        variant === 'primary' && 'focus:ring-brand-primary-500',
        variant === 'danger' && 'focus:ring-red-500',
        
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
```

**Responsive Utility Classes:**
```typescript
// Layout.tsx - Responsive layout with Tailwind
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-neutral-900">App</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              {/* Navigation items */}
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              {/* Sidebar content */}
            </div>
          </aside>
          
          {/* Content */}
          <div className="lg:col-span-9">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
```

#### 2.2 Styled Components Implementation

**Theme Setup:**
```typescript
// theme.ts
export const theme = {
  colors: {
    brand: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      secondary: '#64748b'
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      500: '#6b7280',
      900: '#111827'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif'
    },
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    }
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px'
  }
} as const;

// styled.d.ts - TypeScript theme typing
import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: typeof theme.colors;
    spacing: typeof theme.spacing;
    typography: typeof theme.typography;
    breakpoints: typeof theme.breakpoints;
  }
}
```

**Component Implementation:**
```typescript
// Button.styled.ts
import styled, { css } from 'styled-components';

interface StyledButtonProps {
  $variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  $size: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: css`
    background-color: ${({ theme }) => theme.colors.brand.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.brand.primaryHover};
    }
  `,
  secondary: css`
    background-color: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.neutral[900]};
    
    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.neutral[200]};
    }
  `,
  ghost: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.neutral[700]};
    
    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.neutral[100]};
    }
  `,
  danger: css`
    background-color: ${({ theme }) => theme.colors.semantic.error};
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #dc2626;
    }
  `
};

const sizes = {
  sm: css`
    padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
  `,
  md: css`
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
    font-size: ${({ theme }) => theme.typography.fontSize.base};
  `,
  lg: css`
    padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
  `
};

export const StyledButton = styled.button<StyledButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.375rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.brand.primary}40;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  ${({ $variant }) => variants[$variant]}
  ${({ $size }) => sizes[$size]}
`;

// Button.tsx
import React from 'react';
import { StyledButton } from './Button.styled';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  ...props
}) => {
  return (
    <StyledButton $variant={variant} $size={size} {...props}>
      {children}
    </StyledButton>
  );
};
```

#### 2.3 CSS Modules Implementation

**Global CSS Variables:**
```css
/* styles/tokens.css */
:root {
  /* Colors */
  --color-brand-primary: #3b82f6;
  --color-brand-primary-hover: #2563eb;
  --color-brand-secondary: #64748b;
  
  --color-semantic-success: #10b981;
  --color-semantic-warning: #f59e0b;
  --color-semantic-error: #ef4444;
  
  --color-neutral-50: #f9fafb;
  --color-neutral-100: #f3f4f6;
  --color-neutral-500: #6b7280;
  --color-neutral-900: #111827;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-family-sans: Inter, system-ui, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  
  /* Breakpoints */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

**Component Styles:**
```css
/* Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.375rem;
  font-family: var(--font-family-sans);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Variants */
.primary {
  background-color: var(--color-brand-primary);
  color: white;
}

.primary:hover:not(:disabled) {
  background-color: var(--color-brand-primary-hover);
}

.secondary {
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-900);
}

.secondary:hover:not(:disabled) {
  background-color: var(--color-neutral-200);
}

.ghost {
  background-color: transparent;
  color: var(--color-neutral-700);
}

.ghost:hover:not(:disabled) {
  background-color: var(--color-neutral-100);
}

/* Sizes */
.small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.medium {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-base);
}

.large {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-lg);
}

/* Responsive utilities */
@media (min-width: 768px) {
  .responsiveButton {
    padding: var(--spacing-md) var(--spacing-lg);
  }
}
```

**TypeScript Component:**
```typescript
// Button.tsx - CSS Modules approach
import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  className = '',
  children,
  ...props
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={buttonClasses} {...props}>
      {children}
    </button>
  );
};
```

### 3. Responsive Design Implementation (15 minutes)

#### 3.1 Breakpoint System

**Mobile-First Approach:**
```typescript
// useBreakpoint.ts - Custom hook for responsive behavior
import { useState, useEffect } from 'react';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('sm');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= breakpoints['2xl']) setBreakpoint('2xl');
      else if (width >= breakpoints.xl) setBreakpoint('xl');
      else if (width >= breakpoints.lg) setBreakpoint('lg');
      else if (width >= breakpoints.md) setBreakpoint('md');
      else setBreakpoint('sm');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  const isMobile = breakpoint === 'sm';
  const isTablet = breakpoint === 'md';
  const isDesktop = ['lg', 'xl', '2xl'].includes(breakpoint);

  return { breakpoint, isMobile, isTablet, isDesktop };
};
```

#### 3.2 Responsive Components

**Adaptive Navigation:**
```typescript
// Navigation.tsx - Responsive navigation component
import React, { useState } from 'react';
import { useBreakpoint } from './useBreakpoint';

export const Navigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile } = useBreakpoint();

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
  ];

  if (isMobile) {
    return (
      <nav className="lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-neutral-700"
          aria-expanded={isOpen}
          aria-label="Toggle navigation"
        >
          {/* Hamburger icon */}
        </button>
        
        {isOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white shadow-lg">
            <ul className="py-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="block px-4 py-2 text-neutral-700 hover:bg-neutral-50"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav className="hidden lg:flex space-x-8">
      {navItems.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="text-neutral-700 hover:text-brand-primary-500"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
};
```

### 4. Testing & Documentation (15 minutes)

#### 4.1 Visual Regression Testing

**Storybook Stories:**
```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Design System/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'A versatile button component with multiple variants and sizes.'
      }
    }
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'ghost', 'danger']
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg']
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  )
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  )
};

export const ResponsiveTest: Story = {
  parameters: {
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } }
      }
    }
  },
  render: () => (
    <div className="p-4">
      <Button className="w-full sm:w-auto">Responsive Button</Button>
    </div>
  )
};
```

#### 4.2 Accessibility Testing

```typescript
// Button.a11y.test.tsx
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Button>Test Button</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    await user.tab();
    expect(button).toHaveFocus();
    
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should have proper focus indicators', () => {
    render(<Button>Focus me</Button>);
    const button = screen.getByRole('button');
    
    button.focus();
    expect(button).toHaveFocus();
    
    // Visual focus indicator should be present
    const styles = window.getComputedStyle(button);
    expect(styles.outline).toBeDefined();
  });
});
```

## Style System Best Practices

### Design Tokens
1. **Consistent Naming**: Use semantic names (primary, secondary) over descriptive names (blue, green)
2. **Scale Systems**: Use consistent scales for spacing, typography, and colors
3. **Token Hierarchy**: Organize tokens from generic to specific
4. **Documentation**: Document usage guidelines for each token

### CSS Architecture
1. **Component Isolation**: Keep component styles scoped and self-contained
2. **Utility Classes**: Create utility classes for common patterns
3. **Responsive Design**: Use mobile-first approach for breakpoints
4. **Performance**: Minimize CSS bundle size and optimize for critical rendering path

### Developer Experience
1. **TypeScript Integration**: Type design tokens for better developer experience
2. **Tooling**: Use linting and formatting tools for consistent code style
3. **Documentation**: Maintain comprehensive style guide with examples
4. **Testing**: Include visual regression and accessibility testing

### Maintenance
1. **Version Control**: Track design token changes with semantic versioning
2. **Migration Guides**: Provide clear upgrade paths for breaking changes  
3. **Deprecation**: Gradually deprecate old patterns with clear timelines
4. **Monitoring**: Monitor bundle size and performance impact of style changes