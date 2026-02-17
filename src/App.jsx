import React from 'react';
import { TurmaProvider } from './contexts/TurmaContext';
import { DataProvider } from './contexts/DataContext';
import Dashboard from './components/Dashboard/Dashboard';

function App() {
  return (
    <TurmaProvider>
      <DataProvider>
        <Dashboard />
      </DataProvider>
    </TurmaProvider>
  );
}

export default App;
