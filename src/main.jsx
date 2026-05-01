import React from 'react';
import ReactDOM from 'react-dom/client';
import WidgetStudio from './widget-studio.jsx';
import WidgetRenderer from './widget-renderer.jsx';
import './index.css';

const isWidgetRoute = window.location.pathname.startsWith('/widget/');
const App = isWidgetRoute ? WidgetRenderer : WidgetStudio;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
