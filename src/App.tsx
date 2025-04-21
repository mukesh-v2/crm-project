import React from 'react';
import CRM from './CRM';
import "./globals.css";
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
     <div className="min-h-screen bg-gray-100">
       <CRM />
     </div>
     </ErrorBoundary>
  );
};

export default App;