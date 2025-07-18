# Retro Component System

## Overview
A consistent design system for retro-styled UI components with shared constants, animations, and styling patterns.

## Core Principles
- **Press Animation**: All interactive elements move down on hover with shadow disappearing
- **Consistent Borders**: All components use 2px borders  
- **Shared Colors**: Standardized color palette with light/dark mode variants
- **Dramatic Shadows**: Bold drop shadows for depth and retro aesthetic

## Components

### RetroButton
Primary interactive component with press animation.
```tsx
<RetroButton variant="default" size="sm">Click me</RetroButton>
<RetroButton variant="secondary" size="md">Secondary</RetroButton>
<RetroButton variant="outline" size="lg">Outline</RetroButton>
<RetroButton variant="ghost" size="icon">👤</RetroButton>
```

### RetroCard
Container component for content with optional variants.
```tsx
<RetroCard variant="default">
  <RetroCardHeader>
    <RetroCardTitle>Title</RetroCardTitle>
  </RetroCardHeader>
  <RetroCardContent>Content</RetroCardContent>
</RetroCard>
```

### RetroBox
Generic container for hero sections and highlights.
```tsx
<RetroBox variant="primary" size="lg">Hero content</RetroBox>
<RetroBox variant="secondary" size="md">Section header</RetroBox>
```

### RetroLogo
Special component for interactive logos with press animation.
```tsx
<RetroLogo variant="primary" size="md">sortr</RetroLogo>
```

### RetroBadge
Small labels and tags with press animation.
```tsx
<RetroBadge variant="default">Category</RetroBadge>
<RetroBadge variant="secondary">New</RetroBadge>
```

## Shared Constants

### Colors
- `RETRO_COLORS.primary` - Yellow theme
- `RETRO_COLORS.secondary` - Gray theme  
- `RETRO_COLORS.accent` - Cyan theme
- `RETRO_COLORS.neutral` - White/neutral theme

### Animations
- `RETRO_ANIMATIONS.press` - New press animation (down + shadow disappear)
- `RETRO_ANIMATIONS.lift` - Old lift animation (up + shadow grow)
- `RETRO_ANIMATIONS.textSpacing` - Letter spacing animation

### Shadows
Helper functions for consistent shadows:
- `createShadow('small', 'black')` - Small black shadow
- `createShadow('medium', 'grey')` - Medium grey shadow
- `createShadow('large', 'yellow')` - Large yellow shadow

## Usage Guidelines

1. **Use RetroButton for all interactive elements** (buttons, clickable items)
2. **Use RetroCard for content containers** (listings, summaries)
3. **Use RetroBox for static highlights** (hero sections, headers)
4. **Use RetroLogo for special interactive branding** (logos, headers)
5. **Use RetroBadge for small labels** (categories, status indicators)

## Migration Notes
- All components now use the new press animation
- Border thickness standardized to 2px
- Shadow values use shared constants
- Color variants use shared palette