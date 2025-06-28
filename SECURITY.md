# Secure Deployment Guide

## Before Pushing to Git

### ✅ Security Checklist

- [ ] `google-credentials.json` is in `.gitignore`
- [ ] No API keys or secrets in code
- [ ] `.env` file is in `.gitignore`  
- [ ] Only `.example` files are committed

### Safe Files to Commit

```
✅ SAFE:
- backend/google-credentials.json.example
- backend/.env.example
- All source code files
- README.md with setup instructions

❌ NEVER COMMIT:
- backend/google-credentials.json
- backend/.env
- Any files with real API keys
```

## Production Deployment

### Environment Variables (recommended)
Instead of JSON file, use environment variables:

```bash
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
export GOOGLE_CLOUD_PRIVATE_KEY="your-private-key"
export GOOGLE_CLOUD_CLIENT_EMAIL="your-service-account-email"
```

### Docker Deployment
```dockerfile
# In Dockerfile
ENV GOOGLE_APPLICATION_CREDENTIALS=""
COPY google-credentials.json /app/credentials/
```

### Cloud Platform Deployment
Most cloud platforms (Heroku, Vercel, etc.) support secure environment variable injection.

## Security Best Practices

1. **Rotate credentials regularly**
2. **Use least privilege access** 
3. **Monitor API usage**
4. **Set up billing alerts**
5. **Use separate credentials for dev/prod**

## Recovery

If credentials were accidentally committed:
1. **Immediately revoke** the service account key in Google Cloud Console
2. **Create new credentials**
3. **Update your local files**
4. **Consider Git history cleanup** (advanced)
