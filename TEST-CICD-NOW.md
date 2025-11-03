# 🚀 TEST YOUR CI/CD - 2 WAYS

## Ou gen 2 fason pou teste deployment otomatik la:

---

## ✅ OPTION 1: Trigger Manyèlman (Recommended)

1. **Ale sou GitHub Actions:**
   👉 https://github.com/cashtimachann/Nala_kredi_ti_machann/actions

2. **Click sou "Deploy to Digital Ocean"** (workflow la)

3. **Click sou "Run workflow"** (button ble)

4. **Select "main"** branch

5. **Click "Run workflow"** ankò

6. **Watch li travay!** 🎉
   - Ou pral wè tout etap yo:
     - 📥 Checkout code
     - 🔐 Setup SSH
     - 📋 Display deployment info
     - 🧹 Prepare deployment files
     - 📤 Upload code to server
     - 🔄 Deploy on server
     - 🧪 Health check
     - 🔔 Deployment summary

---

## ✅ OPTION 2: Push Code

Fè yon ti chanjman ak push:

```bash
# Create a simple test change
echo "# CI/CD Test - $(date)" >> TEST-CICD.md

# Commit and push
git add TEST-CICD.md
git commit -m "🧪 Test GitHub Actions auto-deployment"
git push origin main
```

Deployment ap komanse otomatikman nan 5-10 secondes! 🚀

**Watch it here:**  
👉 https://github.com/cashtimachann/Nala_kredi_ti_machann/actions

---

## 📊 SA OU PRAL WÈ

Workflow la pral:
1. ✅ Checkout your code
2. ✅ Setup SSH connection
3. ✅ Package deployment files
4. ✅ Upload to server (142.93.78.111)
5. ✅ Backup current deployment
6. ✅ Extract new code
7. ✅ Build Docker images
8. ✅ Restart containers
9. ✅ Run health checks
10. ✅ Confirm success

**Total time:** ~3-5 minit ⏱️

---

## ✅ VERIFICATION

Apre deployment:

### 1. Check GitHub Actions page
👉 https://github.com/cashtimachann/Nala_kredi_ti_machann/actions

Ou pral wè yon ✅ green checkmark si tout bagay bon.

### 2. Check your application
👉 https://admin.nalakreditimachann.com

Application ou a ap kontinye travay san okenn pwoblèm!

### 3. Check containers
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose ps'
```

Tout 6 containers yo ap gen status "Up".

---

## 🎉 SUCCESS!

Si ou wè sa yo:
- ✅ GitHub Actions workflow complete (green check)
- ✅ Application still working at https://admin.nalakreditimachann.com
- ✅ All containers running

**FÉLICITATIONS!** 🎊 CI/CD ou a ap travay pafètman!

---

## 🔄 KISA PRAL PASE CHAK FWA OU PUSH?

Depi kounye a, **CHAK FWA** ou push code sou branch `main`:

1. GitHub Actions ap wè push la
2. Workflow la ap komanse otomatikman
3. Code ou a pral deploy sou server la
4. Containers ap rebuild ak restart
5. Health checks ap run
6. Application ou a ap update!

**ZERO effort!** Jis push ak relaks. 😎

---

## 💡 PRO TIPS

### See all past deployments:
```bash
ssh root@142.93.78.111 'ls -lh /var/backups/nala-credit/'
```

### Rollback if needed:
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit

# Find backup
ls -lh /var/backups/nala-credit/

# Restore from backup
# (Manual process - copy .env and nginx.conf from backup)
```

### Stop auto-deploy temporarily:
- Go to workflow file: `.github/workflows/deploy.yml`
- Comment out the `push:` trigger
- Commit and push

### Re-enable:
- Uncomment the `push:` trigger
- Commit and push

---

## 📚 MORE INFO

- **Full CI/CD Guide:** `GITHUB-ACTIONS-SETUP.md`
- **Quick Start:** `QUICK-START-CI-CD.md`
- **SSH Fix:** `FIX-GITHUB-ACTIONS-SSH-PERMISSION-DENIED.md`
- **Deployment Guide:** `DEPLOYMENT-COMPLETE-SUMMARY.md`

---

**🚀 Ready? Choose an option and test your CI/CD now!**

Option 1 (Manual trigger): Safer, you control when  
Option 2 (Push code): See the automation in action

**Both work perfectly!** ✅
