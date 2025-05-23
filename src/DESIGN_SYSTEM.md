# Design System Guide

## Overview

This design system ensures consistent visual and interaction design across the BetterReplacementsManager application. It's built using **design tokens** (CSS variables) and **TypeScript** for type safety and developer experience.

## Core Principles

1. **Consistency**: All components use the same design tokens
2. **Accessibility**: Built with WCAG 2.1 guidelines in mind
3. **Type Safety**: Full TypeScript support with proper interfaces
4. **Performance**: CSS variables for efficient styling and theming
5. **Maintainability**: Centralized design decisions

## Design Tokens

### Colors
- **Primary**: Main brand color for actions and highlights
- **Secondary**: Supporting color for less prominent elements
- **Accent**: Accent color for success states and confirmations
- **Danger**: Error states and destructive actions
- **Warning**: Warning states and cautions

### Spacing Scale
```
xs: 4px   - Tight spacing
sm: 8px   - Small spacing
md: 16px  - Default spacing
lg: 24px  - Large spacing
xl: 32px  - Extra large spacing
2xl: 48px - Section spacing
3xl: 64px - Page spacing
```

### Typography Scale
```
xs: 12px  - Captions, labels
sm: 14px  - Body text, small
base: 16px - Body text, default
lg: 18px  - Body text, large
xl: 20px  - Subheadings
2xl: 24px - Headings
3xl: 30px - Page titles
```

## Component Usage

### Button Component
```tsx
import { Button } from './components/ui';

// Primary action
<Button variant="primary" size="md">Save Changes</Button>

// Secondary action
<Button variant="secondary" size="sm">Cancel</Button>

// Destructive action
<Button variant="danger" size="lg">Delete Item</Button>
```

### Card Component
```tsx
import { Card } from './components/ui';

<Card padding="lg" shadow="md">
  <h3>Card Title</h3>
  <p>Card content goes here...</p>
</Card>
```

## Best Practices

### Do's ✅
- Use design tokens for all spacing, colors, and typography
- Keep components focused and single-purpose
- Use TypeScript interfaces for all props
- Test components in both light and dark modes
- Follow consistent naming conventions

### Don'ts ❌
- Don't use hardcoded colors or spacing values
- Don't create overly complex components
- Don't bypass the design system for one-off styles
- Don't forget to handle hover/focus/active states
- Don't ignore accessibility requirements

## Adding New Components

1. Create component in `/src/components/ui/`
2. Use design tokens from `/src/design-tokens.ts`
3. Add TypeScript interface for props
4. Export from `/src/components/ui/index.ts`
5. Test component in light/dark modes
6. Document usage examples

## Theming Support

The design system supports automatic dark mode through CSS `prefers-color-scheme` media queries. All color tokens automatically adapt to the user's system preference.

## Future Enhancements

- Component variants for different contexts
- Animation tokens for consistent motion
- Icon system integration
- Form component library
- Advanced theming with custom themes
