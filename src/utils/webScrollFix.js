// Web Scroll Fix - Runs ONCE when imported
// This fixes the body { overflow: hidden } issue on Expo Web

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  console.log('🚀 Applying scroll fix...');
  
  // Apply fix ONCE
  const applyFix = () => {
    if (document.body) {
      document.body.style.overflowY = 'auto';
      document.body.style.overflowX = 'hidden';
      document.body.style.height = '100%';
    }
    const root = document.getElementById('root');
    if (root) {
      root.style.overflow = 'visible'; // Root should NOT scroll
      root.style.height = 'auto'; // Let root grow with content
      root.style.minHeight = '100%'; // But at least full height
    }
    
    // Inject CSS ONCE
    if (!document.getElementById('velox-scroll-fix')) {
      const style = document.createElement('style');
      style.id = 'velox-scroll-fix';
      style.textContent = `
        html {
          overflow: hidden !important;
          height: 100% !important;
        }
        body {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          height: 100% !important;
        }
        #root {
          overflow: visible !important;
          height: auto !important;
          min-height: 100% !important;
        }
        /* Disable React Native Web's ScrollView in favor of native scrolling */
        [data-react-native-web-container] {
          overflow: visible !important;
        }
      `;
      if (document.head) {
        document.head.appendChild(style);
      }
    }
  };
  
  // Apply once immediately
  applyFix();
  
  // Apply once when DOM is ready (if not already ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFix);
  }
  
  console.log('✅ Scroll fix applied - try scrolling!');
}

export default {};
