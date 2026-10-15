import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './mobile.css';
import { loadWorkspace } from './storage';
import { isAndroid } from './platform';
if (isAndroid()) document.documentElement.classList.add('native-android');
// Hydrate before mounting autosave, so a default draft cannot overwrite native data.
void loadWorkspace().then(loaded => {
  createRoot(document.getElementById('root')!).render(<React.StrictMode><App loaded={loaded}/></React.StrictMode>);
});
