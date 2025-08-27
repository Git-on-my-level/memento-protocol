---
name: component-creation
description: A systematic approach to creating React components with TypeScript, following best practices for reusability, accessibility, and testing.
author: memento-protocol
version: 1.0.0
tags: [react, components, typescript, frontend, development]
dependencies: []
---

# Component Creation Workflow

A systematic approach to creating React components with TypeScript, following best practices for reusability, accessibility, and testing.

## Prerequisites
- React project with TypeScript configured
- Component Engineer mode recommended
- Access to design system or style guide
- Understanding of component requirements

## Inputs
- **name**: Component name (PascalCase)
- **type**: Component type (functional, compound, layout, etc.)
- **requirements**: Functional and accessibility requirements
- **design**: Design specifications or mockups

## Outputs
- TypeScript component file with comprehensive types
- Test file with unit and accessibility tests
- Storybook story (if using Storybook)
- Documentation with usage examples

## Example Commands

### Natural Language Invocations
- "execute component-creation for a Button component"
- "create a Modal component with accessibility support"  
- "generate a DataTable component with sorting"
- "build a Form component with validation"

### Common Use Cases
- `execute component-creation --name Button --type basic` → Simple button component
- `execute component-creation --name Modal --type compound` → Modal with header/body/footer
- `execute component-creation --name DataGrid --type complex` → Table with advanced features
- `execute component-creation --name Layout --type container` → Layout wrapper component

### Workflow Integration Examples
- "execute component-creation then run tests" → Component + Testing
- "create component and add to Storybook" → Component + Documentation
- "build component following design system" → Component + Style consistency

## Workflow Steps

### 1. Planning Phase (10 minutes)

#### Requirements Analysis
1. **Define Component Purpose**
   - What problem does this component solve?
   - Who will use this component (developers/end users)?
   - What are the core features and variations needed?

2. **API Design**
   - List all required and optional props
   - Define prop types and interfaces  
   - Consider children and composition patterns
   - Plan event handlers and callbacks

3. **Accessibility Planning**
   - Identify required ARIA attributes
   - Plan keyboard navigation behavior
   - Consider screen reader experience
   - Define focus management strategy

#### Example Planning Template:
```markdown
## Component: [ComponentName]

### Purpose
[Brief description of component purpose and use cases]

### Props API
- `variant?: 'primary' | 'secondary'` - Visual style variant
- `size?: 'small' | 'medium' | 'large'` - Component size
- `disabled?: boolean` - Disable component interaction
- `onClick?: (event: MouseEvent) => void` - Click handler
- `children: ReactNode` - Component content

### Accessibility
- Role: [button/dialog/listbox/etc]
- ARIA labels: [aria-label, aria-describedby, etc]
- Keyboard: [Enter, Space, Arrow keys, Escape]

### Testing Strategy
- Unit tests: [prop variations, event handling]
- A11y tests: [keyboard nav, screen reader]
- Integration: [component composition]
```

### 2. Implementation Phase (30-45 minutes)

#### Step 1: Create TypeScript Interface
```typescript
// interfaces.ts
export interface ComponentNameProps {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'danger';
  
  /** Component size */
  size?: 'small' | 'medium' | 'large';
  
  /** Disable component interaction */
  disabled?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Component content */
  children: React.ReactNode;
  
  /** Click event handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
```

#### Step 2: Implement Component Logic
```typescript
// ComponentName.tsx
import React from 'react';
import { ComponentNameProps } from './interfaces';

export const ComponentName: React.FC<ComponentNameProps> = ({
  variant = 'primary',
  size = 'medium', 
  disabled = false,
  className = '',
  children,
  onClick,
  ...restProps
}) => {
  // Component implementation with accessibility
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && onClick) {
      onClick(event);
    }
  };

  const componentClasses = [
    'component-base',
    `component--${variant}`,
    `component--${size}`,
    disabled && 'component--disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={componentClasses}
      disabled={disabled}
      onClick={handleClick}
      type="button"
      {...restProps}
    >
      {children}
    </button>
  );
};

ComponentName.displayName = 'ComponentName';
```

#### Step 3: Add Styling (CSS Modules/Styled Components/Tailwind)
- Implement responsive design
- Follow design system tokens
- Include hover, focus, and active states
- Ensure sufficient color contrast

#### Step 4: Export Component
```typescript
// index.ts
export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './interfaces';
```

### 3. Testing Phase (20-30 minutes)

#### Step 1: Unit Tests
```typescript
// ComponentName.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders with default props', () => {
    render(<ComponentName>Test</ComponentName>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(
      <ComponentName onClick={handleClick}>
        Click me
      </ComponentName>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled state', () => {
    const handleClick = jest.fn();
    render(
      <ComponentName disabled onClick={handleClick}>
        Disabled
      </ComponentName>  
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

#### Step 2: Accessibility Tests  
```typescript
// ComponentName.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ComponentName } from './ComponentName';

expect.extend(toHaveNoViolations);

describe('ComponentName Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(
      <ComponentName>Accessible Button</ComponentName>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 4. Documentation Phase (15 minutes)

#### Step 1: Create Storybook Story (Optional)
```typescript
// ComponentName.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'Components/ComponentName',
  component: ComponentName,
  parameters: {
    docs: {
      description: {
        component: 'A reusable component for [purpose]'
      }
    }
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger']
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Button'
  }
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <ComponentName variant="primary">Primary</ComponentName>
      <ComponentName variant="secondary">Secondary</ComponentName> 
      <ComponentName variant="danger">Danger</ComponentName>
    </div>
  )
};
```

#### Step 2: Usage Documentation
Create README.md with:
- Component purpose and use cases
- Props API documentation  
- Usage examples
- Accessibility notes
- Styling customization guide

### 5. Verification Phase (10 minutes)

#### Final Checklist
- [ ] Component renders without errors
- [ ] All props work as expected
- [ ] TypeScript types are comprehensive
- [ ] Accessibility requirements met
- [ ] Unit tests pass with good coverage
- [ ] Visual design matches specifications
- [ ] Documentation is complete
- [ ] Component follows project conventions

## Best Practices

### Component Design
1. **Single Responsibility**: Each component should have one clear purpose
2. **Composition over Configuration**: Favor flexible composition patterns
3. **Consistent API**: Follow established patterns from existing components
4. **Progressive Enhancement**: Build core functionality first, add enhancements

### TypeScript Usage
1. **Strict Types**: Avoid `any` and use specific interfaces
2. **Generic Components**: Use generics for reusable data components
3. **Event Types**: Use proper React event types for handlers
4. **Ref Forwarding**: Forward refs for components that need DOM access

### Performance
1. **Memo Appropriately**: Use React.memo for expensive components
2. **Callback Stability**: Use useCallback for functions passed as props
3. **Bundle Size**: Consider impact on bundle size
4. **Lazy Loading**: Use React.lazy for large components

### Testing
1. **Test Behavior**: Focus on user interactions over implementation
2. **Accessibility**: Include a11y tests in every component
3. **Edge Cases**: Test error states, empty states, loading states
4. **Visual Regression**: Consider visual testing for complex components

## Integration with Design System

### Design Token Usage
- Use design tokens for colors, spacing, typography
- Implement consistent sizing scales
- Follow established animation/transition patterns
- Respect responsive breakpoints

### Component Library Integration
- Follow existing naming conventions
- Implement consistent prop patterns
- Use shared utilities and hooks
- Document component relationships

## Troubleshooting Common Issues

### Type Errors
- Ensure all props are properly typed
- Check for missing or incorrect generic parameters
- Verify event handler types match React expectations

### Accessibility Issues  
- Test with screen readers during development
- Verify keyboard navigation works completely
- Check color contrast ratios meet standards
- Ensure focus management is clear

### Performance Problems
- Profile component rendering with React DevTools
- Check for unnecessary re-renders
- Consider memoization strategies
- Evaluate bundle size impact