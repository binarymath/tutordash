/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brown: {
          50: '#EFEBE9',
          100: '#D7CCC8',
          200: '#BCAAA4',
          300: '#A1887F',
          400: '#8D6E63',
          500: '#795548',
          600: '#6D4C41',
          700: '#5D4037',
          800: '#4E342E',
          900: '#3E2723',
          950: '#261612', // Custom very dark brown
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1E1B1A', // Dark surface
          card: '#2C2420', // Card background
          hover: '#3D322C', // Hover state
        },
        accent: {
          gold: '#FFB74D',
          red: '#EF5350',
          green: '#66BB6A',
          blue: '#42A5F5',
        }
      },
      fontFamily: {
        sans: ['"Outfit"', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'subtle-glow': 'radial-gradient(circle at top, rgba(121, 85, 72, 0.15) 0%, rgba(30, 27, 26, 0) 70%)',
      },
      // Material Design Elevation System (Box Shadows)
      boxShadow: {
        'elevation-0': 'none',
        'elevation-1': '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
        'elevation-2': '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
        'elevation-3': '0px 3px 3px -2px rgba(0,0,0,0.2), 0px 3px 4px 0px rgba(0,0,0,0.14), 0px 1px 8px 0px rgba(0,0,0,0.12)',
        'elevation-4': '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
        'elevation-6': '0px 3px 5px -1px rgba(0,0,0,0.2), 0px 6px 10px 0px rgba(0,0,0,0.14), 0px 1px 18px 0px rgba(0,0,0,0.12)',
        'elevation-8': '0px 5px 5px -3px rgba(0,0,0,0.2), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 3px 14px 2px rgba(0,0,0,0.12)',
        'elevation-12': '0px 7px 8px -4px rgba(0,0,0,0.2), 0px 12px 17px 2px rgba(0,0,0,0.14), 0px 5px 22px 4px rgba(0,0,0,0.12)',
        'elevation-16': '0px 8px 10px -5px rgba(0,0,0,0.2), 0px 16px 24px 2px rgba(0,0,0,0.14), 0px 6px 30px 5px rgba(0,0,0,0.12)',
        'elevation-24': '0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12)',
      },
      // Material Design Border Radius
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
        'xl': '24px',
      },
      // Material Design Transition Timing
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'deceleration': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        'acceleration': 'cubic-bezier(0.4, 0.0, 1, 1)',
        'sharp': 'cubic-bezier(0.4, 0.0, 0.6, 1)',
      },
      // Material Design Transition Duration
      transitionDuration: {
        'shortest': '150ms',
        'shorter': '200ms',
        'short': '250ms',
        'standard': '300ms',
        'complex': '375ms',
        'entering': '225ms',
        'leaving': '195ms',
      },
    },
  },
  plugins: [],
};

