export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          950: "#0a0e1a",
          900: "#0f1420",
          800: "#151b2b",
          700: "#1e2538",
          600: "#2a3247"
        },
        primary: {
          600: "#4f46e5",
          500: "#6366f1",
          400: "#818cf8"
        },
        accent: {
          600: "#7c3aed",
          500: "#8b5cf6",
          400: "#a78bfa"
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        'elegant': '0 10px 40px -10px rgba(99, 102, 241, 0.2)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 30px rgba(99, 102, 241, 0.25)'
      },
      backdropBlur: {
        'xs': '2px'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
