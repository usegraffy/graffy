import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// import './index.css'
import Example from './components/Example/index.tsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Example />
  </StrictMode>,
);
