/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1E3A5F',
        accent: '#2D7DD2',
        appbg: '#F5F7FA',
        danger: '#E53E3E',
        success: '#38A169'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        subtle: '0 10px 30px rgba(30, 58, 95, 0.08)'
      }
    }
  },
  plugins: []
};
