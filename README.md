# Metro Español 🚂

![Versión](https://img.shields.io/badge/versión-0.3.0-blue)
![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow)

## 📋 Descripción

Metro Español es un simulador de gestión de trenes basado en datos reales, donde las vías se generan aleatoriamente a partir de calles existentes en cualquier ciudad del mundo. Controla tu propio sistema de metro, recoge y entrega pasajeros, y construye la red de transporte más eficiente.

## 🌟 Características Principales

### Versión 0.3.0 (Actual)
- **Sistema de Pasajeros Mejorado**:
  - Capacidad dinámica del tren (se ajusta automáticamente según necesidad)
  - Notificaciones visuales para recogida (verde) y entrega (rojo) de pasajeros
  - Contador acumulativo para múltiples pasajeros en una sola estación
- **Interfaz Mejorada**:
  - Modal de visualización de asientos del tren
  - Mejor detección de pasajeros con radio ampliado

### Versión 0.2.0
- **Menú Lateral Mejorado**:
  - Explorar Ciudades: Modal con ciudades famosas del mundo
  - Mis Rutas: Historial de los últimos 10 mapas cargados
  - Sistema de autenticación con almacenamiento local

### Versión 0.1.0
- **Funcionalidades Base**:
  - Geocodificación global usando la API de MapBox
  - Visualización del mapa con OpenStreetMap y Leaflet
  - Generación de vías basadas en calles reales
  - Sistema básico de pasajeros y estaciones

## 🚀 Cómo Empezar

### Requisitos Previos
- Node.js y npm instalados - [instalar con nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/420btc/train-track-explorer.git
   ```

2. Navega al directorio del proyecto:
   ```bash
   cd train-track-explorer
   ```

3. Instala las dependencias:
   ```bash
   npm install
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

5. Abre tu navegador en `http://localhost:8080` (o el puerto que se indique en la consola)

## 🎮 Cómo Jugar

1. **Busca una ubicación** usando la barra de búsqueda o selecciona una ciudad predefinida
2. **Explora el mapa** generado con vías y estaciones basadas en calles reales
3. **Controla tu tren** ajustando la velocidad y seleccionando las vías por las que circulará
4. **Recoge pasajeros** en las estaciones (aparecen como iconos de personas)
5. **Entrega pasajeros** en sus destinos para ganar dinero y puntos
6. **Gestiona tu capacidad** para maximizar la eficiencia de tu servicio

## 🔧 Tecnologías Utilizadas

- **React**: Framework principal para la interfaz de usuario
- **TypeScript**: Tipado estático para mayor robustez
- **Leaflet**: Biblioteca para mapas interactivos
- **MapBox API**: Geocodificación global para búsqueda de direcciones
- **OpenStreetMap**: Datos cartográficos de base
- **Framer Motion**: Animaciones fluidas para notificaciones y modales
- **Lucide React**: Iconos vectoriales para la interfaz
- **Tailwind CSS**: Estilizado moderno y responsive

## 📈 Roadmap

### Próximas Versiones

#### Versión 0.4.0 (Planificada)
- **Sistema de Niveles Avanzado**:
  - Objetivos específicos por nivel
  - Desbloqueo progresivo de ciudades y características
  - Sistema de puntuación y clasificaciones

#### Versión 0.5.0 (Planificada)
- **Mejoras en la Economía del Juego**:
  - Sistema de compra y mejora de trenes
  - Diferentes tipos de trenes con capacidades variables
  - Economía basada en la satisfacción de pasajeros

#### Versión 0.6.0 (Planificada)
- **Eventos Dinámicos**:
  - Incidentes aleatorios (averías, retrasos)
  - Clima que afecta a la velocidad y generación de pasajeros
  - Eventos especiales en días festivos

### Futuro a Largo Plazo

- **Sistema Multijugador**:
  - Competición en tiempo real entre jugadores
  - Cooperación para gestionar redes complejas
  - Clasificaciones globales

- **Personalización Avanzada**:
  - Editor de trenes y estaciones
  - Temas visuales y sonidos personalizables
  - Modos de juego alternativos

- **Integración con Datos en Tiempo Real**:
  - Patrones de tráfico basados en datos reales
  - Eventos basados en acontecimientos del mundo real

## 🤝 Contribuir

Las contribuciones son bienvenidas. Si deseas contribuir:

1. Haz fork del repositorio
2. Crea una rama para tu característica (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Add some amazing feature'`)
4. Haz push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Contacto

Para cualquier pregunta o sugerencia, por favor abre un issue en este repositorio.

---

⭐️ ¡Gracias por usar Metro Español! ⭐️

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/76b322d5-b184-4eba-8834-6ff8236bd374) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
