# 🔐 VERIFY GITHUB SECRET - SSH_PRIVATE_KEY

## 📋 QUICK CHECK

Ou bezwen verifye ke secret `SSH_PRIVATE_KEY` byen konfigure nan repository ou a.

---

## ✅ STEP 1: CHECK IF SECRET EXISTS

1. **Ale sou Settings:**
   ```
   https://github.com/cashtimachann/Nala_kredi_ti_machann/settings/secrets/actions
   ```

2. **Check pou secret sa a:**
   - Name: `SSH_PRIVATE_KEY`
   - Status: Should show as configured

3. **Si ou WÈ li deja** ✅
   - Bon! Secret la byen konfigure
   - Skip to "Test Deployment" section

4. **Si ou PA WÈ li** ❌
   - Ou bezwen ajoute li
   - Continue to Step 2

---

## ✅ STEP 2: GET PRIVATE KEY

Run script sa a pou jwenn private key la:

```bash
cat ~/.ssh/github_actions_deploy
```

**IMPORTANT:** Copy TOUT bagay, including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All lines in between
- `-----END OPENSSH PRIVATE KEY-----`

---

## ✅ STEP 3: ADD SECRET TO GITHUB

### Method 1: Via Web Interface (Recommended)

1. **Go to:** https://github.com/cashtimachann/Nala_kredi_ti_machann/settings/secrets/actions

2. **Click:** "New repository secret"

3. **Enter:**
   - Name: `SSH_PRIVATE_KEY` (EXACTLY this, case-sensitive)
   - Value: Paste tout private key la

4. **Click:** "Add secret"

### Method 2: Via GitHub CLI (Si ou gen gh install)

```bash
# Get the key content
KEY_CONTENT=$(cat ~/.ssh/github_actions_deploy)

# Add to GitHub
gh secret set SSH_PRIVATE_KEY --body "$KEY_CONTENT" --repo cashtimachann/Nala_kredi_ti_machann
```

---

## 🧪 STEP 4: TEST DEPLOYMENT

Apre ou ajoute secret la, test li:

### Option A: Manual Trigger
1. Go to: https://github.com/cashtimachann/Nala_kredi_ti_machann/actions
2. Select "Deploy to Digital Ocean"
3. Click "Run workflow" → Select "main" → Click "Run workflow"

### Option B: Push Code
```bash
# Make a test change
echo "# Test - $(date)" >> TEST.md
git add TEST.md
git commit -m "Test CI/CD with SSH_PRIVATE_KEY secret"
git push origin main
```

---

## 🔍 VERIFY SECRET FORMAT

Before adding, make sure your key looks like this:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACB4dS8H8k3AAAA...
(many lines of random characters)
...AAAA
-----END OPENSSH PRIVATE KEY-----
```

**Key Points:**
- ✅ Starts with `-----BEGIN OPENSSH PRIVATE KEY-----`
- ✅ Ends with `-----END OPENSSH PRIVATE KEY-----`
- ✅ No extra spaces or newlines at beginning/end
- ✅ All lines between are base64 characters

---

## ❌ COMMON MISTAKES

### ❌ Wrong Name
```
Secret name: ssh_private_key  ❌ (lowercase)
Secret name: SSH_PRIVATE-KEY  ❌ (dash instead of underscore)
Secret name: PRIVATE_KEY      ❌ (missing SSH_)
```

### ✅ Correct Name
```
Secret name: SSH_PRIVATE_KEY  ✅ (EXACTLY this)
```

### ❌ Incomplete Key
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1r...
(missing end tag)  ❌
```

### ✅ Complete Key
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAA...
...full content...
-----END OPENSSH PRIVATE KEY-----  ✅
```

---

## 🎯 QUICK VERIFICATION COMMANDS

```bash
# 1. Check if key file exists
ls -lh ~/.ssh/github_actions_deploy

# 2. View key (to copy)
cat ~/.ssh/github_actions_deploy

# 3. Count lines (should be ~6-10 lines)
wc -l ~/.ssh/github_actions_deploy

# 4. Verify key format
head -1 ~/.ssh/github_actions_deploy
# Should show: -----BEGIN OPENSSH PRIVATE KEY-----

tail -1 ~/.ssh/github_actions_deploy
# Should show: -----END OPENSSH PRIVATE KEY-----

# 5. Test SSH connection (should work from local)
ssh -i ~/.ssh/github_actions_deploy root@142.93.78.111 'echo "✅ SSH working"'
```

---

## 📊 TROUBLESHOOTING

### If deployment still fails after adding secret:

1. **Check secret name is exact:**
   - Go to repo settings → Secrets
   - Verify name is `SSH_PRIVATE_KEY` (case-sensitive)

2. **Re-add the secret:**
   - Delete current secret
   - Add again with fresh copy of key
   - Make sure no extra characters

3. **Verify key on server:**
   ```bash
   ssh root@142.93.78.111 "grep 'github-actions' ~/.ssh/authorized_keys"
   ```
   Should show:
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPj1PgcZA4PMLyfxTbzFg9UhSEjCf6QTBqH5HG6EyNAo github-actions@nalakreditimachann.com
   ```

4. **Check workflow file:**
   ```bash
   grep -A5 "SSH_PRIVATE_KEY" .github/workflows/deploy.yml
   ```
   Should show:
   ```yaml
   echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/deploy_key
   ```

---

## 🎉 SUCCESS CHECKLIST

- [ ] Secret `SSH_PRIVATE_KEY` exists in GitHub repo settings
- [ ] Secret contains full private key (BEGIN to END)
- [ ] Public key is in server's `authorized_keys`
- [ ] SSH connection test passes from local machine
- [ ] Workflow file references `secrets.SSH_PRIVATE_KEY`
- [ ] Test deployment triggered (manual or push)
- [ ] Workflow shows ✅ green checkmark

---

## 📚 RELATED FILES

- `setup-github-actions-ssh.sh` - Generate SSH key
- `verify-ssh-key.sh` - Verify key format
- `GITHUB-ACTIONS-SETUP.md` - Complete setup guide
- `FIX-GITHUB-ACTIONS-SSH-PERMISSION-DENIED.md` - SSH troubleshooting

---

## 🆘 NEED HELP?

If you still see "Permission denied", run:

```bash
./verify-ssh-key.sh
```

This will:
1. ✅ Check key format
2. ✅ Test SSH connection
3. ✅ Display key for copying
4. ✅ Show exact steps to fix

---

**Remember:** Deploy keys are different from secrets. You're using a **repository secret** (`SSH_PRIVATE_KEY`), not a deploy key. ✅
