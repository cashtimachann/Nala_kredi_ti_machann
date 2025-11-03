# 🚀 GitHub Actions CI/CD Setup Guide

## Konfigirasyon Otomatik Deployment

---

## 📋 SA KI TE KREYE

### GitHub Actions Workflow
- **Fichye:** `.github/workflows/deploy.yml`
- **Trigger:** Chak fwa ou push sou branch `main`
- **Aksyon:** Build ak deploy otomatik sou Digital Ocean

---

## 🔐 ETAP 1: KREYE SSH KEY POU GITHUB

### 1. Kreye yon nouvo SSH key pou GitHub Actions:

```bash
# Sou MacBook ou:
ssh-keygen -t ed25519 -C "github-actions@nalakreditimachann.com" -f ~/.ssh/github_actions_deploy

# Pa mete password (just press Enter 3 times)
```

Sa ap kreye 2 fichye:
- `~/.ssh/github_actions_deploy` (private key - pou GitHub)
- `~/.ssh/github_actions_deploy.pub` (public key - pou serveur)

### 2. Ajoute public key sou serveur:

```bash
# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@142.93.78.111

# Oswa manyèlman:
cat ~/.ssh/github_actions_deploy.pub | ssh root@142.93.78.111 'cat >> ~/.ssh/authorized_keys'
```

### 3. Teste koneksyon:

```bash
ssh -i ~/.ssh/github_actions_deploy root@142.93.78.111 'echo "SSH key works!"'
```

Si ou wè "SSH key works!" ✅ ou bon!

---

## 🔑 ETAP 2: KONFIGURE GITHUB SECRETS

### 1. Ale sou GitHub Repository:
```
https://github.com/cashtimachann/Nala_kredi_ti_machann
```

### 2. Ale nan Settings:
- Klike **"Settings"** tab (an wo adwat)

### 3. Ale nan Secrets:
- Nan sidebar agoch, klike **"Secrets and variables"**
- Klike **"Actions"**

### 4. Ajoute SSH Private Key:
- Klike **"New repository secret"**
- **Name:** `SSH_PRIVATE_KEY`
- **Value:** Kopi kontni private key la

Pou kopi private key:
```bash
cat ~/.ssh/github_actions_deploy
```

Copy tout bagay ki sòti (enkli -----BEGIN ak -----END lines)

Egzanp:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz
...
...
-----END OPENSSH PRIVATE KEY-----
```

- Klike **"Add secret"**

### 5. (Opsyonèl) Ajoute lòt secrets si bezwen:

Si ou vle deploy ak lòt konfigirasyon:

- `DEPLOY_SERVER_IP` (si ou chanje IP)
- `DEPLOY_PATH` (si ou chanje dirèktwa)
- `SLACK_WEBHOOK_URL` (pou notifikasyon)
- `DISCORD_WEBHOOK_URL` (pou notifikasyon)

---

## ✅ ETAP 3: VERIFYE KONFIGIRASYON

### Teste SSH key:
```bash
ssh -i ~/.ssh/github_actions_deploy root@142.93.78.111 'whoami'
```

Dwe retounen: `root` ✅

### Verifye GitHub Secret:
1. Ale sou: Settings → Secrets and variables → Actions
2. Ou dwe wè: `SSH_PRIVATE_KEY` ✅

---

## 🚀 ETAP 4: PREMIERE DEPLOYMENT

### 1. Commit ak Push workflow file:

```bash
cd /Users/herlytache/Nala_kredi_ti_machann

# Check files
git status

# Add workflow
git add .github/workflows/deploy.yml

# Commit
git commit -m "🚀 Add GitHub Actions CI/CD workflow"

# Push
git push origin main
```

### 2. Gade deployment progress:

1. Ale sou: https://github.com/cashtimachann/Nala_kredi_ti_machann
2. Klike tab **"Actions"**
3. Ou dwe wè workflow la ap travay! 🎉

---

## 📊 WORKFLOW STAGES

Chak deployment ap pase atravè etap sa yo:

```
1. 📥 Checkout code          - Download code from GitHub
2. 🔐 Setup SSH              - Configure SSH for deployment
3. 🔑 Add known hosts        - Add server to trusted hosts
4. 📋 Display info           - Show deployment details
5. 🧹 Prepare files          - Clean and package code
6. 📤 Upload to server       - Transfer code via SCP
7. 🔄 Deploy on server       - Extract, build, restart
8. 🧪 Health check           - Verify deployment
9. 🔔 Summary                - Show results
```

---

## 🎯 KISA AP PASE OTOMATIKMAN

Chak fwa ou push sou `main`:

1. ✅ GitHub Actions detect push
2. ✅ Download code
3. ✅ Connect to server via SSH
4. ✅ Backup current deployment
5. ✅ Upload new code
6. ✅ Build Docker images
7. ✅ Restart containers
8. ✅ Verify deployment
9. ✅ Send notification

**Tout sa san ou pa fè anyen!** 🎉

---

## 📝 WORKFLOW FEATURES

### Auto-Backup:
- Backup `.env` file
- Backup `nginx.conf`
- Backup saved to: `/var/backups/nala-credit/deploy-YYYYMMDD-HHMMSS/`

### Health Checks:
- ✅ HTTP redirect test (301)
- ✅ HTTPS response test (200)
- ❌ Fail deployment si health check pa pase

### Manual Trigger:
Ou ka tou lanse deployment manyèlman:
1. Ale sou tab "Actions"
2. Select "Deploy to Digital Ocean"
3. Klike "Run workflow"
4. Chwazi branch (main)
5. Klike "Run workflow"

---

## 🔄 DEPLOYMENT FLOW

```
Developer (ou)
    │
    ├─► git commit
    │
    ├─► git push origin main
    │
    ▼
GitHub Repository
    │
    ├─► Trigger GitHub Actions
    │
    ▼
GitHub Actions Runner (Ubuntu VM)
    │
    ├─► Checkout code
    ├─► Setup SSH
    ├─► Package code
    ├─► SCP to server
    │
    ▼
Digital Ocean Server (142.93.78.111)
    │
    ├─► Backup current version
    ├─► Extract new code
    ├─► docker compose build
    ├─► docker compose up -d
    │
    ▼
Production Application
    │
    └─► https://admin.nalakreditimachann.com 🔒
```

---

## 🎨 CUSTOMIZE WORKFLOW

### Change Deployment Trigger:

Aktyèlman: **Push sou `main`**

Pou chanje:
```yaml
on:
  push:
    branches:
      - main        # ← Change sa
      - production  # Oswa ajoute lòt branches
  pull_request:     # Deploy sou PR
    branches:
      - main
```

### Add Notifications:

#### Slack Notification:
```yaml
- name: 📱 Notify Slack
  if: success()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"✅ Deployment successful to https://admin.nalakreditimachann.com"}'
```

#### Discord Notification:
```yaml
- name: 📱 Notify Discord
  if: success()
  run: |
    curl -X POST ${{ secrets.DISCORD_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{"content":"✅ Deployment successful!"}'
```

### Add Tests Before Deploy:

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          # Your test commands here
          echo "Running tests..."
  
  deploy:
    needs: test  # Only deploy if tests pass
    runs-on: ubuntu-latest
    # ... rest of deploy job
```

---

## 🛠️ TROUBLESHOOTING

### ❌ SSH Connection Failed

**Error:** `Permission denied (publickey)`

**Fix:**
```bash
# 1. Verify public key is on server
ssh root@142.93.78.111 'cat ~/.ssh/authorized_keys'

# 2. Re-add public key
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@142.93.78.111

# 3. Test SSH
ssh -i ~/.ssh/github_actions_deploy root@142.93.78.111 'echo "Works!"'
```

### ❌ Health Check Failed

**Error:** `HTTPS Status: 000`

**Fix:**
1. Check if containers running:
   ```bash
   ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose ps'
   ```

2. Check nginx logs:
   ```bash
   ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose logs nginx'
   ```

3. Manually restart:
   ```bash
   ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose restart'
   ```

### ❌ Docker Build Failed

**Error:** `docker compose build failed`

**Fix:**
1. Check Docker on server:
   ```bash
   ssh root@142.93.78.111 'docker --version'
   ```

2. Check disk space:
   ```bash
   ssh root@142.93.78.111 'df -h'
   ```

3. Clean Docker:
   ```bash
   ssh root@142.93.78.111 'docker system prune -af'
   ```

---

## 📈 MONITORING DEPLOYMENTS

### View Deployment History:
1. GitHub → Actions tab
2. Gade list deployment yo
3. Klike sou deployment pou wè details

### View Logs:
Klike sou nenpòt step pou wè logs detaye

### Download Logs:
Klike sou "..." → "Download log archive"

---

## 🔐 SECURITY BEST PRACTICES

### ✅ DO:
- ✅ Itilize dedicated SSH key pou GitHub Actions
- ✅ Pa mete password sou SSH key (GitHub Actions pa ka antre password)
- ✅ Use GitHub Secrets pou sensitive data
- ✅ Limit SSH key access to deployment only

### ❌ DON'T:
- ❌ Pa commit SSH private key nan code
- ❌ Pa itilize personal SSH key
- ❌ Pa mete secrets nan workflow file
- ❌ Pa push sensitive data

---

## 📊 DEPLOYMENT METRICS

Apre chak deployment, workflow ap montre:

```
✅ Deployment successful!
   Duration: 2m 34s
   Commit: abc123def
   Author: herlytache
   URL: https://admin.nalakreditimachann.com
```

---

## 🎉 BENEFITS

Avèk GitHub Actions CI/CD, ou genyen:

1. ✅ **Zero downtime deployments** - Rolling updates
2. ✅ **Automatic backups** - Chak deployment backup
3. ✅ **Health checks** - Verify deployment success
4. ✅ **Rollback capability** - Use backups si gen pwoblèm
5. ✅ **Deployment history** - Track all deployments
6. ✅ **Notification** - Know when deployments happen
7. ✅ **Collaboration** - Team members can deploy
8. ✅ **Consistency** - Same process every time

---

## 📚 NEXT STEPS

Apre setup sa a, ou ka:

1. **Add tests:** Unit tests, integration tests
2. **Add staging environment:** Test before production
3. **Add deployment approval:** Manual approval before deploy
4. **Add monitoring:** Integrate with monitoring tools
5. **Add notifications:** Slack, Discord, email

---

## ✅ CHECKLIST

Setup complete lè ou fini etap sa yo:

- [ ] SSH key created (`~/.ssh/github_actions_deploy`)
- [ ] Public key added to server
- [ ] SSH connection tested
- [ ] GitHub Secret `SSH_PRIVATE_KEY` configured
- [ ] Workflow file committed (`.github/workflows/deploy.yml`)
- [ ] First deployment tested
- [ ] Deployment successful
- [ ] Application accessible at https://admin.nalakreditimachann.com

---

## 🎯 QUICK COMMANDS

```bash
# Test SSH
ssh -i ~/.ssh/github_actions_deploy root@142.93.78.111 'echo "Works!"'

# Trigger deployment
git commit -m "Update" && git push origin main

# View deployment logs (on server)
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose logs --tail=50'

# Check deployment backups
ssh root@142.93.78.111 'ls -lh /var/backups/nala-credit/'

# Rollback (use backup)
ssh root@142.93.78.111 'cp /var/backups/nala-credit/deploy-YYYYMMDD-HHMMSS/.env /var/www/nala-credit/'
```

---

**🚀 Ou pare pou deploye otomatik! Push code ou epi gade magic la!** ✨

---

*Created: November 3, 2025*  
*GitHub Actions: Configured*  
*Auto-Deploy: Enabled* ✅
