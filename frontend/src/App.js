import React, { useEffect, useState } from 'react';
import SignIn from './loginPage';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    fetch('/api')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => setMessage(data.message))
      .catch(error => {
        console.log('Backend not available:', error);
        setMessage('Backend not connected (start backend server)');
      });
  }, []);

  // Show login page first
  if (showLogin) {
    return <SignIn />;
  }

  // After login (for now just showing the original content)
  return (
    <div>
      <h1>React Frontend</h1>
      <p>Message from backend: {message}</p>
      <button onClick={() => setShowLogin(true)}>Back to Login</button>
    </div>
  );
}

export default App;
