import React, { useEffect, useRef } from 'react';
import { useGame } from '@/contexts/GameContext';
import gsap from 'gsap';

const GameMessages: React.FC = () => {
  const { messages, removeMessage } = useGame();
  const messagesRef = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    // Animar los mensajes cuando se añaden
    messages.forEach(message => {
      const messageEl = messagesRef.current.get(message.id);
      if (messageEl) {
        // Animar la entrada del mensaje
        gsap.fromTo(
          messageEl,
          { scale: 0, opacity: 0 },
          { 
            scale: 1, 
            opacity: 1, 
            duration: 0.5,
            onComplete: () => {
              // Animar la salida después de 2 segundos
              gsap.to(messageEl, { 
                opacity: 0, 
                y: -20, 
                delay: 2,
                duration: 0.5,
                onComplete: () => {
                  // Eliminar el mensaje del estado
                  removeMessage(message.id);
                }
              });
            }
          }
        );
      }
    });
  }, [messages, removeMessage]);

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-50">
      {messages.map(message => (
        <div
          key={message.id}
          ref={el => el && messagesRef.current.set(message.id, el)}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center px-4 py-2 rounded-md shadow-lg backdrop-blur-sm"
          style={{ 
            color: message.color,
            backgroundColor: `${message.color}20`,
            border: `1px solid ${message.color}40`,
            maxWidth: '80%'
          }}
        >
          <p className="text-lg font-medium">{message.text}</p>
        </div>
      ))}
    </div>
  );
};

export default GameMessages;
