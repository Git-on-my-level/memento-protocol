---
name: state-management
description: A systematic approach to implementing state management in React applications, covering local state, context, and external state solutions.
author: memento-protocol
version: 1.0.0
tags: [react, state-management, context, redux, zustand, hooks]
dependencies: []
---

# State Management Workflow

A systematic approach to implementing state management in React applications, covering local state, context, and external state solutions.

## Prerequisites
- React project with hooks support
- Understanding of React component lifecycle
- React Architect or Component Engineer mode recommended
- Knowledge of application data flow requirements

## Inputs
- **stateType**: Type of state (local, global, server, form)
- **complexity**: Complexity level (simple, moderate, complex)
- **scope**: State scope (component, feature, application-wide)
- **requirements**: Performance and persistence requirements

## Outputs
- State management implementation with TypeScript
- Custom hooks for state access and manipulation
- Tests for state logic and components
- Documentation of state architecture

## Example Commands

### Natural Language Invocations
- "execute state-management for user authentication"
- "implement shopping cart state with persistence" 
- "create theme state management with context"
- "set up form state with validation"

### Common Use Cases
- `execute state-management --type local --scope component` → Component state with hooks
- `execute state-management --type global --complexity moderate` → Context-based state
- `execute state-management --type server --scope feature` → API state management
- `execute state-management --type form --validation true` → Form state with validation

### Workflow Integration Examples
- "implement state management then create components" → State + UI
- "set up state management and write tests" → State + Testing
- "create state management following architecture patterns" → State + Design patterns

## Workflow Steps

### 1. State Analysis Phase (15 minutes)

#### 1.1 Determine State Scope and Type

**Questions to Ask:**
- What data needs to be managed?
- How many components need access to this state?
- Does state need to persist across sessions?
- How often does state change?
- Are there complex state transitions?

**State Classification:**

```typescript
// Local State (useState, useReducer)
// ✅ Use when: Component-specific data, simple state transitions
// Examples: form inputs, toggle states, loading states

// Context State (useContext)  
// ✅ Use when: Multiple components in a subtree need access
// Examples: theme, user preferences, feature flags

// External State (Redux, Zustand, Jotai)
// ✅ Use when: Complex state logic, time-travel debugging needed
// Examples: shopping cart, user session, complex forms

// Server State (React Query, SWR)
// ✅ Use when: API data, caching, background updates needed
// Examples: user profiles, product catalogs, real-time data
```

#### 1.2 Architecture Decision Matrix

| Criteria | Local State | Context | External Store | Server State |
|----------|-------------|---------|----------------|--------------|
| Complexity | Simple | Moderate | Complex | Varies |
| Scope | Component | Subtree | Global | Global |
| Performance | Best | Good | Good | Optimized |
| DevTools | Basic | Basic | Advanced | Advanced |
| Learning Curve | Easy | Easy | Moderate | Moderate |

### 2. Implementation Phase

#### 2.1 Local State Implementation

**Simple State with useState:**
```typescript
// useToggle.ts - Custom hook for boolean state
import { useState, useCallback } from 'react';

export const useToggle = (initialValue: boolean = false) => {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  
  return { value, toggle, setTrue, setFalse } as const;
};

// Usage in component
const MyComponent = () => {
  const modal = useToggle();
  
  return (
    <div>
      <button onClick={modal.toggle}>Open Modal</button>
      {modal.value && <Modal onClose={modal.setFalse} />}
    </div>
  );
};
```

**Complex State with useReducer:**
```typescript
// formReducer.ts - Form state with validation
interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

type FormAction =
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'SET_TOUCHED'; field: string }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'RESET' };

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: '' }
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error }
      };
    case 'SET_TOUCHED':
      return {
        ...state,
        touched: { ...state.touched, [action.field]: true }
      };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.isSubmitting };
    case 'RESET':
      return initialFormState;
    default:
      return state;
  }
};

// Custom hook for form management
export const useForm = <T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: ValidationSchema<T>
) => {
  const [state, dispatch] = useReducer(formReducer, {
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true
  });

  const setField = useCallback((field: string, value: any) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const setError = useCallback((field: string, error: string) => {
    dispatch({ type: 'SET_ERROR', field, error });
  }, []);

  return { ...state, setField, setError };
};
```

#### 2.2 Context State Implementation

**Theme Context Example:**
```typescript
// ThemeContext.tsx - Theme management with context
import React, { createContext, useContext, useReducer } from 'react';

// Theme types
type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
}

interface ThemeContextValue extends ThemeState {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Context creation
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Theme reducer
type ThemeAction = 
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'SET_SYSTEM_THEME'; systemTheme: 'light' | 'dark' };

const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        theme: action.theme,
        resolvedTheme: action.theme === 'system' ? state.systemTheme : action.theme
      };
    case 'SET_SYSTEM_THEME':
      return {
        ...state,
        systemTheme: action.systemTheme,
        resolvedTheme: state.theme === 'system' ? action.systemTheme : state.resolvedTheme
      };
    default:
      return state;
  }
};

// Provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, {
    theme: 'system',
    systemTheme: 'light',
    resolvedTheme: 'light'
  });

  // System theme detection
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      dispatch({ 
        type: 'SET_SYSTEM_THEME', 
        systemTheme: e.matches ? 'dark' : 'light' 
      });
    };

    dispatch({ 
      type: 'SET_SYSTEM_THEME', 
      systemTheme: mediaQuery.matches ? 'dark' : 'light' 
    });
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = (theme: Theme) => {
    dispatch({ type: 'SET_THEME', theme });
    localStorage.setItem('theme', theme);
  };

  const toggleTheme = () => {
    const newTheme = state.resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const value: ThemeContextValue = {
    ...state,
    setTheme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook for consuming theme
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

#### 2.3 External State Implementation (Zustand Example)

**Shopping Cart Store:**
```typescript
// cartStore.ts - Zustand store for shopping cart
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

interface CartActions {
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getItem: (id: string) => CartItem | undefined;
}

type CartStore = CartState & CartActions;

// Helper functions
const calculateTotal = (items: CartItem[]): number => 
  items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

const calculateItemCount = (items: CartItem[]): number =>
  items.reduce((count, item) => count + item.quantity, 0);

export const useCartStore = create<CartStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      items: [],
      total: 0,
      itemCount: 0,

      // Actions
      addItem: (newItem) =>
        set((state) => {
          const existingItem = state.items.find(item => item.id === newItem.id);
          
          if (existingItem) {
            existingItem.quantity += 1;
          } else {
            state.items.push({ ...newItem, quantity: 1 });
          }
          
          state.total = calculateTotal(state.items);
          state.itemCount = calculateItemCount(state.items);
        }),

      removeItem: (id) =>
        set((state) => {
          state.items = state.items.filter(item => item.id !== id);
          state.total = calculateTotal(state.items);
          state.itemCount = calculateItemCount(state.items);
        }),

      updateQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            state.items = state.items.filter(item => item.id !== id);
          } else {
            const item = state.items.find(item => item.id === id);
            if (item) {
              item.quantity = quantity;
            }
          }
          
          state.total = calculateTotal(state.items);
          state.itemCount = calculateItemCount(state.items);
        }),

      clearCart: () =>
        set((state) => {
          state.items = [];
          state.total = 0;
          state.itemCount = 0;
        }),

      getItem: (id) => get().items.find(item => item.id === id)
    })),
    {
      name: 'shopping-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Selectors for performance optimization
export const useCartItems = () => useCartStore(state => state.items);
export const useCartTotal = () => useCartStore(state => state.total);
export const useCartItemCount = () => useCartStore(state => state.itemCount);
export const useCartActions = () => useCartStore(state => ({
  addItem: state.addItem,
  removeItem: state.removeItem,
  updateQuantity: state.updateQuantity,
  clearCart: state.clearCart
}));
```

#### 2.4 Server State Implementation (React Query Example)

**API State Management:**
```typescript
// userApi.ts - API functions
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export const userApi = {
  getUser: async (id: string): Promise<User> => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  getUsers: async (): Promise<User[]> => {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }
};

// userQueries.ts - React Query hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, User } from './userApi';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Hooks
export const useUser = (id: string) => {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userApi.getUser(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: userApi.getUsers,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => 
      userApi.updateUser(id, data),
    onSuccess: (updatedUser) => {
      // Update user detail cache
      queryClient.setQueryData(
        userKeys.detail(updatedUser.id), 
        updatedUser
      );
      
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

// Usage in component
const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: user, isLoading, error } = useUser(userId);
  const updateUserMutation = useUpdateUser();

  const handleUpdateUser = (data: Partial<User>) => {
    updateUserMutation.mutate({ id: userId, data });
  };

  if (isLoading) return <div>Loading user...</div>;
  if (error) return <div>Error loading user</div>;
  
  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
      {/* Update form here */}
    </div>
  );
};
```

### 3. Testing Phase (20-25 minutes)

#### 3.1 Testing Local State
```typescript
// useToggle.test.ts
import { renderHook, act } from '@testing-library/react';
import { useToggle } from './useToggle';

describe('useToggle', () => {
  it('should initialize with false by default', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current.value).toBe(false);
  });

  it('should toggle value', () => {
    const { result } = renderHook(() => useToggle());
    
    act(() => {
      result.current.toggle();
    });
    
    expect(result.current.value).toBe(true);
  });
});
```

#### 3.2 Testing Context State
```typescript
// ThemeContext.test.tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

const TestComponent = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
    </div>
  );
};

describe('ThemeProvider', () => {
  it('provides theme context to children', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });
});
```

#### 3.3 Testing External State
```typescript
// cartStore.test.ts
import { useCartStore } from './cartStore';

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('should add item to cart', () => {
    const { addItem, items } = useCartStore.getState();
    
    addItem({ id: '1', name: 'Test Item', price: 10.00 });
    
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      id: '1',
      name: 'Test Item', 
      price: 10.00,
      quantity: 1
    });
  });
});
```

### 4. Performance Optimization (15 minutes)

#### 4.1 Context Optimization
```typescript
// Separate contexts to prevent unnecessary re-renders
const ThemeStateContext = createContext<ThemeState | undefined>(undefined);
const ThemeActionsContext = createContext<ThemeActions | undefined>(undefined);

export const useThemeState = () => {
  const context = useContext(ThemeStateContext);
  if (!context) throw new Error('useThemeState must be used within ThemeProvider');
  return context;
};

export const useThemeActions = () => {
  const context = useContext(ThemeActionsContext);
  if (!context) throw new Error('useThemeActions must be used within ThemeProvider');
  return context;
};
```

#### 4.2 Selector Optimization
```typescript
// Use selectors to prevent unnecessary re-renders
const useCartItemCount = () => useCartStore(state => state.itemCount);
const useCartTotal = () => useCartStore(state => state.total);

// Instead of subscribing to entire store
const BadExample = () => {
  const cart = useCartStore(); // Re-renders on any cart change
  return <div>{cart.itemCount}</div>;
};

const GoodExample = () => {
  const itemCount = useCartItemCount(); // Only re-renders when itemCount changes
  return <div>{itemCount}</div>;
};
```

## Best Practices

### State Structure
1. **Normalize Data**: Keep data flat and normalized
2. **Separate Concerns**: Separate UI state from business logic
3. **Immutable Updates**: Always return new state objects
4. **Type Safety**: Use TypeScript for all state interfaces

### Performance
1. **Selective Subscriptions**: Use selectors to subscribe only to needed data
2. **Memoization**: Memoize expensive calculations
3. **Context Splitting**: Split contexts by update frequency
4. **Lazy Initialization**: Use lazy initial state for expensive calculations

### Testing
1. **Test State Logic**: Test reducers and custom hooks in isolation
2. **Test Integration**: Test components with state management
3. **Mock External Dependencies**: Mock API calls and external services
4. **Test Edge Cases**: Test error states and boundary conditions

### Architecture
1. **Single Source of Truth**: Avoid duplicating state
2. **Predictable Updates**: Use pure functions for state updates
3. **Clear Boundaries**: Separate local, global, and server state
4. **Documentation**: Document state shape and update patterns