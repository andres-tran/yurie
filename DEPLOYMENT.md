# Vercel Deployment Guide

This guide covers deploying the Yurie Flask application to Vercel.

## Prerequisites

1. A Vercel account
2. Vercel CLI installed (optional): `npm i -g vercel`
3. A Replicate API token

## Environment Variables

Set these environment variables in your Vercel project settings:

- `REPLICATE_API_TOKEN`: Your Replicate API token
- `SECRET_KEY`: A secure secret key for Flask sessions
- `ENVIRONMENT`: Set to `production` for HTTPS cookie security

## Deployment Steps

### Using Vercel Dashboard

1. Import your GitHub repository in Vercel
2. Configure environment variables in Project Settings > Environment Variables
3. Deploy

### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add REPLICATE_API_TOKEN
vercel env add SECRET_KEY
vercel env add ENVIRONMENT production
```

## Important Notes

### Session Management
- This deployment uses a stateless approach due to Vercel's serverless architecture
- Session data is not persisted between requests
- For production use, consider implementing:
  - Client-side storage for conversation history
  - Database storage (PostgreSQL, Redis)
  - JWT tokens for authentication

### Static Files
- Static files are served from the `/static` directory
- CSS, JS, and icons are automatically routed

### Python Runtime
- Python 3.9 is configured in `vercel.json`
- Dependencies are installed from `requirements.txt`

### Limitations
- Maximum function duration: 10 seconds (can be increased in Pro plan)
- Maximum function memory: 1024 MB
- No persistent file storage

## Troubleshooting

### Common Issues

1. **500 Errors**: Check Vercel function logs for detailed error messages
2. **Static files not loading**: Ensure paths start with `/static/`
3. **API timeouts**: Consider breaking long operations into smaller chunks

### Debugging

View logs in Vercel dashboard under Functions tab or use:
```bash
vercel logs
```

## Production Recommendations

1. **Use a database for session storage**
   - PostgreSQL with SQLAlchemy
   - Redis for fast session access

2. **Implement proper error handling**
   - Add try-catch blocks
   - Return meaningful error messages

3. **Add rate limiting**
   - Prevent API abuse
   - Use Vercel Edge Config or external service

4. **Monitor performance**
   - Use Vercel Analytics
   - Set up error tracking (Sentry)

5. **Optimize for cold starts**
   - Keep dependencies minimal
   - Use lazy loading where possible