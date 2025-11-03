# ⚡ QUICK START: GitHub Actions CI/CD

## 🚀 3 Etap Rapid pou Setup Auto-Deploy

---

## ETAP 1: Setup SSH Key (2 minit)

```bash
./setup-github-actions-ssh.sh
```

Script sa a ap:
- ✅ Kreye SSH key
- ✅ Ajoute l sou serveur
- ✅ Teste koneksyon
- ✅ Montre private key pou GitHub

**Kopye private key la!** (ou pral bezwen l)

---

## ETAP 2: Configure GitHub Secret (1 minit)

1. Ale sou: https://github.com/cashtimachann/Nala_kredi_ti_machann/settings/secrets/actions

2. Klike **"New repository secret"**

3. Ranpli:
   - Name: `SSH_PRIVATE_KEY`
   - Value: [Paste private key from step 1]

4. Klike **"Add secret"**

---

## ETAP 3: Push ak Deploy! (30 seconds)

```bash
# Commit workflow file
git add .github/workflows/deploy.yml
git commit -m "🚀 Add CI/CD with GitHub Actions"
git push origin main
```

**Sa fet!** 🎉 

Ale sou: https://github.com/cashtimachann/Nala_kredi_ti_machann/actions

Gade deployment w ap travay!

---

## 🎯 APRE SA:

Chak fwa ou push code:
```bash
git commit -m "Your changes"
git push origin main
```

GitHub Actions ap **otomatikman:**
1. Download code
2. Build Docker images
3. Deploy sou serveur
4. Restart containers
5. Verify deployment

**Pa gen anyen pou w fè!** ✨

---

## 📊 KI BO POU GADE DEPLOYMENT:

**GitHub:**
- https://github.com/cashtimachann/Nala_kredi_ti_machann/actions

**Ou ap wè:**
- ✅ Deployment status (success/failure)
- ⏱️ Duration (tan deployment la pran)
- 📝 Logs detaye
- 👤 Ki moun ki trigger deployment la

---

## 🆘 SI GEN PWOBLÈM:

### SSH Connection Failed?
```bash
# Re-run setup
./setup-github-actions-ssh.sh
```

### Deployment Failed?
1. Check logs sou GitHub Actions tab
2. Check containers:
   ```bash
   ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose ps'
   ```

---

## 📚 FULL DOCUMENTATION:

- **Setup Guide:** `GITHUB-ACTIONS-SETUP.md`
- **Workflow File:** `.github/workflows/deploy.yml`
- **Setup Script:** `setup-github-actions-ssh.sh`

---

**Ready? Let's go! 🚀**

```bash
./setup-github-actions-ssh.sh
```
