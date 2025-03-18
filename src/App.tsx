import React from 'react';
import CRMManager from './CRM';
import "./globals.css";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <CRMManager />
    </div>
  );
};

export default App;