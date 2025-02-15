# Perplexity Clone

A mobile-optimized clone of the Perplexity AI chat interface with PWA support.

## Features

- 🤖 AI-powered chat interface using Perplexity API
- 📱 Fully responsive design for mobile and desktop
- ⚡ Progressive Web App (PWA) support
- 🔄 Real-time chat with loading states
- 💾 Offline capability
- 📋 Copy and share functionality
- 🎨 Dark theme
- ⌨️ Keyboard shortcuts
- 🔍 Code syntax highlighting
- 🌐 Source citations with links

## Prerequisites

- Node.js >= 18.0.0
- NPM >= 9.0.0
- A Perplexity API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/perplexity-clone.git
cd perplexity-clone
```

2. Install dependencies:
```bash
npm install
```

3. Update the API key:
Open `app.js` and replace the `API_KEY` constant with your Perplexity API key:
```javascript
const API_KEY = 'your-api-key-here';
```

## Development

To run the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

## Building for Production

1. Build the optimized assets:
```bash
npm run build
```

This will:
- Minify JavaScript files
- Optimize CSS
- Generate service worker
- Create production-ready assets in the `dist` directory

2. Deploy the production build:
```bash
npm run deploy
```

## Mobile Optimization

The app is optimized for mobile devices with:
- Responsive viewport handling
- Touch event optimization
- Mobile-specific UI adjustments
- PWA installation support
- Offline functionality
- Mobile keyboard handling

## PWA Features

- Installable on mobile and desktop
- Works offline
- Push notification support
- Background sync
- App-like experience

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Chrome for Android
- Safari iOS

## Performance Optimizations

- Minified and compressed assets
- Lazy loading of images
- Service worker caching
- Optimized touch events
- Debounced input handling
- Memory leak prevention

## Security Features

- Content Security Policy
- Secure API communication
- XSS prevention
- CORS handling
- Input sanitization

## Keyboard Shortcuts

- `⌘K` / `Ctrl+K`: New thread
- `Enter`: Send message
- `Shift+Enter`: New line

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [Perplexity AI](https://www.perplexity.ai)
- Uses the Perplexity API for chat functionality
- Built with vanilla JavaScript for optimal performance