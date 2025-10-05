import React, { useState, useEffect } from 'react';
import './ConsoleBanner.css';

interface ConsoleBannerProps {
  isVisible: boolean;
}

const ConsoleBanner: React.FC<ConsoleBannerProps> = ({ isVisible }) => {
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [loadingComplete, setLoadingComplete] = useState<boolean>(false);

  // Efecto para actualizar el progreso al 100% cuando la carga esté completa
  useEffect(() => {
    if (loadingComplete) {
      // Primero asegurarse de que el progreso esté al menos en 99%
      setProgress(prev => Math.max(prev, 99));
      
      // Después de un breve retraso, establecer al 100%
      const timer = setTimeout(() => {
        setProgress(100);
        // Añadir un mensaje final de carga completada
        console.log("✅ Carga completada. ¡Bienvenido a Urban Metro Track!");
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loadingComplete]);

  // Simular mensajes de consola realistas para hacer que la barra de progreso avance
  useEffect(() => {
    if (isVisible && progress < 99 && !loadingComplete) {
      // Array de mensajes realistas que podrían aparecer durante la carga
      const simulatedMessages = [
        "Initializing map data...",
        "Loading track segments...",
        "Fetching station information...",
        "Processing route data...",
        "Calculating distances between stations...",
        "Loading passenger information...",
        "Building track network...",
        "Generating station connections...",
        "Optimizing route paths...",
        "Preparing train simulation...",
        "Loading train assets...",
        "Configuring passenger system...",
        "Finalizing map rendering..."
      ];
      
      // Seleccionar un mensaje aleatorio que no se haya mostrado recientemente
      const getRandomMessage = () => {
        const recentMessages = logMessages.slice(-3);
        let availableMessages = simulatedMessages.filter(msg => 
          !recentMessages.some(recent => recent.includes(msg))
        );
        
        // Si no hay mensajes disponibles, usar cualquiera
        if (availableMessages.length === 0) {
          availableMessages = simulatedMessages;
        }
        
        const randomIndex = Math.floor(Math.random() * availableMessages.length);
        return availableMessages[randomIndex];
      };
      
      // Intervalo para mostrar mensajes simulados
      const interval = setInterval(() => {
        // Solo simular mensajes si el progreso está por debajo del 95%
        if (progress < 95) {
          console.log(getRandomMessage());
        }
      }, 1500 + Math.random() * 1500); // Entre 1.5 y 3 segundos
      
      return () => clearInterval(interval);
    }
  }, [isVisible, progress, logMessages, loadingComplete]);

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

      // Actualizar el progreso basado en los mensajes de la consola de manera más realista
      if (message.includes('Initializing') || message.includes('Starting')) {
        setProgress(5);
      } else if (message.includes('Generating')) {
        setProgress(prev => Math.min(prev + 8, 20));
      } else if (message.includes('Fetching') || message.includes('Loading')) {
        setProgress(prev => Math.min(prev + 3, 40));
      } else if (message.includes('Processing') || message.includes('Calculating')) {
        setProgress(prev => Math.min(prev + 5, 60));
      } else if (message.includes('route') || message.includes('data')) {
        setProgress(prev => Math.min(prev + 4, 75));
      } else if (message.includes('Successfully') || message.includes('Created')) {
        setProgress(prev => Math.min(prev + 7, 85));
      } else if (message.includes('Generating stations') || message.includes('Building')) {
        setProgress(prev => Math.min(prev + 3, 92));
      } else if (message.includes('Generated') || message.includes('Completed')) {
        setProgress(prev => Math.min(prev + 2, 99));
        // Marcar como completo después de un mensaje de finalización
        setTimeout(() => {
          setLoadingComplete(true);
        }, 1500); // Esperar 1.5 segundos para simular la finalización
      } else if (message.includes('Ready') || message.includes('Finished') || message.includes('Done')) {
        // Mensajes explícitos de finalización
        setProgress(99);
        setTimeout(() => {
          setLoadingComplete(true);
        }, 800);
      } else {
        // Para cualquier otro mensaje, incrementar un poco el progreso
        setProgress(prev => {
          // Si estamos por debajo del 95%, incrementar entre 1-3%
          if (prev < 95) {
            return Math.min(prev + Math.floor(Math.random() * 3) + 1, 95);
          }
          // Si estamos entre 95-98%, incrementar más lentamente
          else if (prev < 98) {
            return Math.min(prev + 0.5, 98);
          }
          // Mantener en 99% hasta que termine completamente
          return 99;
        });
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
