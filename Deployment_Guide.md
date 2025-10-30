# Deployment Guide

## 🚀 Deploy LP Impermanent Loss Estimator

This guide covers deploying the LP IL Estimator to various platforms and making it accessible via x402.

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git
- Domain name (optional, for custom domain)

---

## Local Development

### 1. Clone and Setup

```bash
# Clone repository
git clone <your-repo>
cd lp-impermanent-loss-estimator

# Install dependencies
npm install

# Run locally
npm run dev
```

The agent will start on `http://localhost:3000` (or port specified by agent-kit).

### 2. Test Locally

```bash
# Test echo endpoint
curl http://localhost:3000/echo -d '{"text":"test"}'

# Test IL calculation
curl http://localhost:3000/calculate_il \
  -H "Content-Type: application/json" \
  -d '{
    "token0_symbol": "ETH",
    "token1_symbol": "USDC",
    "deposit_amounts": [5000, 5000],
    "window_hours": 168
  }'
```

---

## Deployment Options

### Option 1: Vercel (Recommended for Quick Deploy)

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Deploy**
```bash
vercel
```

**Step 3: Configure**
- Follow prompts to link project
- Vercel will auto-detect Node.js
- Set environment variables if needed

**Step 4: Access**
Your agent will be available at: `https://your-project.vercel.app`

**x402 Access:**
```
x402://your-project.vercel.app/calculate_il
```

---

### Option 2: Railway

**Step 1: Create Railway Account**
Visit [railway.app](https://railway.app)

**Step 2: New Project**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

**Step 3: Configure Build**
Railway will auto-detect your Node.js project.

**Step 4: Custom Domain (Optional)**
- Go to project settings
- Add custom domain
- Configure DNS

**x402 Access:**
```
x402://your-project.railway.app/calculate_il
```

---

### Option 3: Fly.io

**Step 1: Install Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh
```

**Step 2: Create Fly App**
```bash
# Login
fly auth login

# Launch app
fly launch
```

**Step 3: Configure fly.toml**
```toml
app = "lp-il-estimator"
primary_region = "sjc"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

**Step 4: Deploy**
```bash
fly deploy
```

**x402 Access:**
```
x402://lp-il-estimator.fly.dev/calculate_il
```

---

### Option 4: DigitalOcean App Platform

**Step 1: Create Account**
Visit [digitalocean.com](https://digitalocean.com)

**Step 2: Create App**
- Click "Create" → "Apps"
- Connect GitHub repository
- Select branch

**Step 3: Configure**
- Detected: Node.js
- Build Command: `npm install && npm run build`
- Run Command: `npm start`

**Step 4: Deploy**
- Click "Create Resources"
- Wait for deployment

**x402 Access:**
```
x402://your-app.ondigitalocean.app/calculate_il
```

---

### Option 5: Self-Hosted (VPS)

**Step 1: Setup VPS**
```bash
# SSH into server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

**Step 2: Deploy Application**
```bash
# Clone repository
git clone <your-repo>
cd lp-impermanent-loss-estimator

# Install dependencies
npm install

# Build
npm run build
```

**Step 3: Run with PM2**
```bash
# Start application
pm2 start index.ts --name "lp-il-estimator"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**Step 4: Setup Nginx (Optional)**
```bash
# Install Nginx
sudo apt install nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/lp-il-estimator
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable Site:**
```bash
sudo ln -s /etc/nginx/sites-available/lp-il-estimator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Step 5: SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

**x402 Access:**
```
x402://your-domain.com/calculate_il
```

---

## Environment Variables

If your deployment needs environment variables:

```bash
# .env file (optional)
PORT=3000
NODE_ENV=production
COINGECKO_API_KEY=your_key_here  # If using Pro tier
```

**Set on Vercel:**
```bash
vercel env add COINGECKO_API_KEY
```

**Set on Railway:**
```bash
railway variables set COINGECKO_API_KEY=your_key_here
```

**Set on Fly.io:**
```bash
fly secrets set COINGECKO_API_KEY=your_key_here
```

---

## Custom Domain Setup

### DNS Configuration

For any deployment, point your domain to the platform:

**Vercel:**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**Railway:**
```
Type: CNAME
Name: @
Value: your-project.up.railway.app
```

**Fly.io:**
```
Type: A
Name: @
Value: [Fly.io IP addresses]
```

**Self-Hosted:**
```
Type: A
Name: @
Value: [Your VPS IP]
```

---

## x402 Protocol Integration

### Making Your Agent x402 Compatible

The agent-kit framework handles x402 protocol automatically. Ensure:

1. **Endpoints are accessible** via HTTP/HTTPS
2. **CORS is configured** (if needed)
3. **JSON responses** are properly formatted

### Testing x402 Access

```bash
# Using x402 client (if available)
x402-client request x402://your-domain.com/calculate_il '{
  "token0_symbol": "ETH",
  "token1_symbol": "USDC",
  "deposit_amounts": [5000, 5000]
}'
```

### x402 URL Format

```
x402://[domain]/[endpoint]?[params]
```

**Example:**
```
x402://lp-il-estimator.vercel.app/calculate_il?token0_symbol=ETH&token1_symbol=USDC&deposit_amounts=5000,5000
```

---

## Monitoring & Maintenance

### Health Check Endpoint

Add a health check:

```typescript
addEntrypoint({
  key: "health",
  description: "Health check endpoint",
  input: z.object({}),
  async handler() {
    return {
      output: { status: "ok", timestamp: Date.now() },
      usage: { total_tokens: 10 },
    };
  },
});
```

### Monitoring Tools

**Vercel:**
- Built-in analytics
- Real-time logs
- Performance monitoring

**Railway:**
- Resource usage dashboard
- Application logs
- Metrics

**Self-Hosted:**
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs lp-il-estimator

# Restart if needed
pm2 restart lp-il-estimator
```

---

## Scaling Considerations

### Rate Limiting

CoinGecko free tier limits:
- 10-50 calls/minute
- Consider caching responses
- Implement request queuing

### Caching Strategy

```typescript
// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getCachedPrice(token, days) {
  const key = `${token}-${days}`;
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchPrice(token, days);
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

### Load Balancing

For high traffic, consider:
- Multiple instances behind load balancer
- Redis for distributed caching
- Queue system for API calls

---

## Troubleshooting

### Common Issues

**Issue 1: Port already in use**
```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

**Issue 2: CoinGecko rate limit**
- Implement caching
- Add retry logic with exponential backoff
- Upgrade to Pro tier

**Issue 3: Memory issues**
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

**Issue 4: Build failures**
- Check Node.js version (18+)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run build`

---

## Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] Input validation (Zod schemas)
- [ ] Error messages don't leak sensitive info
- [ ] API keys stored as environment variables
- [ ] Regular dependency updates
- [ ] Monitor for suspicious activity

---

## Backup & Recovery

### Backup Configuration

```bash
# Backup current deployment
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

### Rollback

**Vercel:**
```bash
vercel rollback
```

**Railway:**
```bash
railway rollback
```

**Self-Hosted:**
```bash
git checkout v1.0.0
pm2 restart lp-il-estimator
```

---

## Cost Estimates

### Free Tier Options

**Vercel:**
- Free hobby plan
- 100GB bandwidth
- Unlimited requests

**Railway:**
- $5 free credit/month
- Pay-as-you-go after

**Fly.io:**
- 3 VMs free
- 160GB bandwidth

**DigitalOcean:**
- Starting at $5/month
- Static pricing

---

## Production Checklist

- [ ] Code tested locally
- [ ] TypeScript compiles without errors
- [ ] All test cases passing
- [ ] Documentation complete
- [ ] Environment variables configured
- [ ] Domain DNS configured
- [ ] SSL certificate active
- [ ] Monitoring setup
- [ ] Health check endpoint working
- [ ] x402 accessibility verified
- [ ] Performance tested under load
- [ ] Error handling verified
- [ ] Backup strategy in place

---

## Support & Resources

- **Agent Kit Docs**: Check @lucid-dreams/agent-kit documentation
- **CoinGecko API**: https://www.coingecko.com/api/documentation
- **x402 Protocol**: Check x402 specification docs
- **Community**: Join DeFi developer communities

---

## Next Steps

1. Choose deployment platform
2. Follow platform-specific guide above
3. Deploy and test
4. Configure custom domain (optional)
5. Verify x402 accessibility
6. Submit PR with deployment URL
7. Claim bounty! 🎉

---

**Deployment Time Estimate:**
- Vercel/Railway: 5-10 minutes
- Fly.io: 10-15 minutes
- Self-hosted: 30-60 minutes

Good luck with your deployment! 🚀
