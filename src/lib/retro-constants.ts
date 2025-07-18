// Shared constants for retro design system

// Colors
export const RETRO_COLORS = {
  primary: {
    light: "bg-yellow-300",
    dark: "dark:bg-yellow-300",
    text: "text-black",
    darkText: "dark:text-black",
  },
  secondary: {
    light: "bg-gray-500",
    dark: "dark:bg-gray-500",
    text: "text-white",
    darkText: "dark:text-white",
  },
  accent: {
    light: "bg-cyan-300",
    dark: "dark:bg-cyan-400",
    text: "text-black",
    darkText: "dark:text-black",
  },
  neutral: {
    light: "bg-white",
    dark: "dark:bg-neutral-800",
    text: "text-black",
    darkText: "dark:text-white",
  },
} as const;

// Borders
export const RETRO_BORDERS = {
  thickness: "border-2",
  color: {
    light: "border-black",
    dark: "dark:border-white",
  },
} as const;

// Shadows
export const RETRO_SHADOWS = {
  colors: {
    black: "rgba(0,0,0,1)",
    grey: "rgba(64,64,64,1)",
    yellow: "rgba(251,191,36,1)",
    greyMedium: "rgba(107,114,128,1)",
  },
  sizes: {
    small: "2px_2px_0px_0px",
    medium: "4px_4px_0px_0px",
    large: "6px_6px_0px_0px",
    xlarge: "8px_8px_0px_0px",
  },
} as const;

// Animations
export const RETRO_ANIMATIONS = {
  // New press animation (button goes down, shadow disappears)
  press: {
    base: "transition-all duration-200",
    hover: "hover:translate-y-1 hover:shadow-none dark:hover:shadow-none",
  },
  // Old lift animation (button goes up, shadow grows)
  lift: {
    base: "transition-all duration-200",
    hover: "hover:-translate-y-1",
  },
  // Text spacing animation
  textSpacing: {
    base: "transition-all duration-300 ease-out",
    hover: "hover:tracking-widest",
  },
} as const;

// Static shadow classes using CSS custom properties
export const RETRO_SHADOW_CLASSES = {
  // Black shadows
  small: "shadow-[var(--shadow-retro-small)]",
  medium: "shadow-[var(--shadow-retro-medium)]",
  large: "shadow-[var(--shadow-retro-large)]",
  xlarge: "shadow-[var(--shadow-retro-xlarge)]",
  
  // Grey shadows for dark mode
  smallGrey: "shadow-[var(--shadow-retro-small-grey)]",
  mediumGrey: "shadow-[var(--shadow-retro-medium-grey)]",
  largeGrey: "shadow-[var(--shadow-retro-large-grey)]",
  xlargeGrey: "shadow-[var(--shadow-retro-xlarge-grey)]",
  
  // Yellow shadows
  smallYellow: "shadow-[var(--shadow-retro-small-yellow)]",
  mediumYellow: "shadow-[var(--shadow-retro-medium-yellow)]",
  largeYellow: "shadow-[var(--shadow-retro-large-yellow)]",
  xlargeYellow: "shadow-[var(--shadow-retro-xlarge-yellow)]",
} as const;

// Helper functions for consistent shadow usage
export const createShadow = (
  size: keyof typeof RETRO_SHADOWS.sizes,
  color: keyof typeof RETRO_SHADOWS.colors,
) => {
  // Map to static shadow classes
  if (color === 'black') {
    return RETRO_SHADOW_CLASSES[size as keyof typeof RETRO_SHADOW_CLASSES];
  } else if (color === 'grey') {
    return RETRO_SHADOW_CLASSES[`${size}Grey` as keyof typeof RETRO_SHADOW_CLASSES];
  } else if (color === 'yellow') {
    return RETRO_SHADOW_CLASSES[`${size}Yellow` as keyof typeof RETRO_SHADOW_CLASSES];
  }
  return RETRO_SHADOW_CLASSES.medium; // fallback
};

export const createDarkShadow = (
  size: keyof typeof RETRO_SHADOWS.sizes,
  color: keyof typeof RETRO_SHADOWS.colors,
) => {
  // Map to static shadow classes with dark: prefix
  if (color === 'black') {
    return `dark:${RETRO_SHADOW_CLASSES[size as keyof typeof RETRO_SHADOW_CLASSES]}`;
  } else if (color === 'grey') {
    return `dark:${RETRO_SHADOW_CLASSES[`${size}Grey` as keyof typeof RETRO_SHADOW_CLASSES]}`;
  } else if (color === 'yellow') {
    return `dark:${RETRO_SHADOW_CLASSES[`${size}Yellow` as keyof typeof RETRO_SHADOW_CLASSES]}`;
  }
  return `dark:${RETRO_SHADOW_CLASSES.medium}`; // fallback
};

// Common class combinations
export const RETRO_BASE_CLASSES = {
  border: `${RETRO_BORDERS.thickness} ${RETRO_BORDERS.color.light} ${RETRO_BORDERS.color.dark}`,
  pressAnimation: `${RETRO_ANIMATIONS.press.base} ${RETRO_ANIMATIONS.press.hover}`,
  liftAnimation: `${RETRO_ANIMATIONS.lift.base}`,
  textSpacing: `${RETRO_ANIMATIONS.textSpacing.base} ${RETRO_ANIMATIONS.textSpacing.hover}`,
} as const;
