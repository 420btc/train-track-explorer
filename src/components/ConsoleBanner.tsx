import React, { useState, useEffect } from 'react';
import './ConsoleBanner.css';

interface ConsoleBannerProps {
  isVisible: boolean;
}

const ConsoleBanner: React.FC<ConsoleBannerProps> = ({ isVisible }) => {
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!isVisible) return;

    // Guardar la función original de console.log
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    // Sobrescribir console.log para capturar los mensajes
    console.log = (...args) => {
      // Llamar a la función original
      originalConsoleLog(...args);

      // Convertir los argumentos a string y añadirlos al estado
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      setLogMessages(prev => {
        // Mantener solo los últimos 10 mensajes para no sobrecargar la UI
        const newMessages = [...prev, message];
        if (newMessages.length > 10) {
          return newMessages.slice(newMessages.length - 10);
        }
        return newMessages;
      });

      // Actualizar el progreso basado en ciertos mensajes clave
      if (message.includes('Generating')) {
        setProgress(10);
      } else if (message.includes('Fetching route')) {
        setProgress(prev => Math.min(prev + 5, 70));
      } else if (message.includes('Successfully created line')) {
        setProgress(prev => Math.min(prev + 10, 80));
      } else if (message.includes('Generating stations')) {
        setProgress(85);
      } else if (message.includes('Generated')) {
        setProgress(95);
      }
    };

    // Sobrescribir console.error para capturar errores
    console.error = (...args) => {
      // Llamar a la función original
      originalConsoleError(...args);

      // Convertir los argumentos a string y añadirlos al estado con formato de error
      const message = "❌ ERROR: " + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      setLogMessages(prev => {
        const newMessages = [...prev, message];
        if (newMessages.length > 10) {
          return newMessages.slice(newMessages.length - 10);
        }
        return newMessages;
      });
    };

    // Restaurar las funciones originales cuando el componente se desmonte
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="console-banner">
      <div className="console-header">
        <h2>Generando Red de Metro</h2>
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-text">{progress}% Completado</div>
      </div>
      <div className="console-messages">
        {logMessages.map((msg, index) => (
          <div key={index} className="console-message">
            {msg.includes('ERROR') ? (
              <span className="error-message">{msg}</span>
            ) : (
              <span>{msg.length > 120 ? `${msg.substring(0, 120)}...` : msg}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConsoleBanner;
