// Import jQuery (from npm) - must be loaded before Fomantic-UI
import 'jquery';

// Import Fomantic-UI JavaScript (after jQuery is loaded)
// CSS is loaded from CDN in layout.html to ensure proper font paths
// Custom style overrides are in layout.html <style> tag after Fomantic-UI CSS
import 'fomantic-ui-css/semantic.min.js';

console.log('Client loaded - jQuery and Fomantic-UI initialized');
