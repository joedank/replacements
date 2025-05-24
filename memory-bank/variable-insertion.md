# Variable Insertion System

## Overview
The application uses a **click-to-insert** approach for adding variables to replacement text. This provides a simple, reliable user experience that works consistently across all platforms.

## How It Works

### SimpleVariableInsertion Component
Located above the replacement text area, this component displays commonly used variables as clickable buttons:
- `{{date}}` - Current date
- `{{time}}` - Current time
- `{{clipboard}}` - Clipboard content
- `$|$` - Cursor position marker

### Smart Insertion Logic
When a user clicks a variable button:
1. The variable is inserted at the current cursor position
2. If no cursor position exists, it appends to the end
3. The cursor automatically moves after the inserted text
4. Form change detection is triggered to enable the Save button

### Code Location
- Component: `src/components/replacements/SimpleVariableInsertion.tsx`
- Integration: `src/components/replacements/ReplacementEditor.tsx`

## Why This Approach?

### Original Plan
We initially attempted HTML5 drag & drop for variable insertion, but discovered that Tauri v2's file drop handling intercepts all drag events, making it incompatible with in-app drag & drop.

### Benefits of Click-to-Insert
1. **Reliability** - Works consistently across all platforms
2. **Simplicity** - No complex coordinate calculations
3. **Accessibility** - Better for keyboard navigation
4. **Performance** - No event listener overhead
5. **User-Friendly** - Clear, visible options

## Adding New Variables

To add new variables to the quick insert panel:

```typescript
// In ReplacementEditor.tsx
<SimpleVariableInsertion
  variables={[
    { name: 'date', value: '{{date}}', preview: new Date().toLocaleDateString() },
    { name: 'time', value: '{{time}}', preview: new Date().toLocaleTimeString() },
    // Add new variables here
  ]}
  onInsert={handleVariableInsert}
/>
```

## Variables Panel
The sidebar Variables Panel still exists for reference and displays all available variables with live previews. Users can see what variables are available even if they're not in the quick insert buttons.