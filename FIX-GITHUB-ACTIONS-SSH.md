# Fix GitHub Actions SSH Connection Error

## ❌ Pwoblèm/Problem

```
Load key "/home/runner/.ssh/deploy_key": error in libcrypto
root@142.93.78.111: Permission denied (publickey).
Error: Process completed with exit code 255.
```

## 🔍 Kòz/Cause

1. **SSH Private Key pa konfigire kòrèkteman nan GitHub Secrets**
2. **Workflow ap eseye itilize yon key ki pa matche ak sa ki sou servè a**
3. **Fòma key la ka gen pwoblèm (espas, newlines, etc.)**

## ✅ Solisyon/Solution

### Etap 1: Verifye SSH Keys sou Servè a

```bash
# Konekte sou servè a
ssh root@142.93.78.111

# Gade ki key ki otorize
cat ~/.ssh/authorized_keys
```

### Etap 2: Kreye yon New SSH Key Pair pou GitHub Actions

```bash
# Sou ou local machine
cd ~/.ssh
ssh-keygen -t ed25519 -C "github-actions@nalakreditimachann.com" -f github_actions_deploy

# Sa a pral kreye 2 fichye:
# - github_actions_deploy (private key)
# - github_actions_deploy.pub (public key)
```

### Etap 3: Ajoute Public Key sou Servè a

```bash
# Kopye public key la
cat ~/.ssh/github_actions_deploy.pub

# SSH sou servè a
ssh root@142.93.78.111

# Ajoute key la nan authorized_keys
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPeHa/Yy0ypRprZ36z01bU7Ly3WsQCAMDIDvIEtWDnXG github-actions@nalakreditimachann.com" >> ~/.ssh/authorized_keys

# Asire w permissions yo bon
chmod 600 ~/.ssh/authorized_keys
```

### Etap 4: Ajoute Private Key nan GitHub Secrets

1. **Ale sou GitHub repository**: https://github.com/cashtimachann/Nala_kredi_ti_machann
2. **Klike sou Settings**
3. **Klike sou Secrets and variables → Actions**
4. **Klike sou "New repository secret"**
5. **Non**: `SSH_PRIVATE_KEY`
6. **Valè**: Kopye tout kontni fichye `github_actions_deploy` (PRIVATE KEY)

```bash
# Pou kopye private key la:
cat ~/.ssh/github_actions_deploy

# ENPÒTAN: Kopye TOUT sa a, enkli:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...tout key la...
# -----END OPENSSH PRIVATE KEY-----
```

### Etap 5: Verifye Secret la Egziste

1. Ale sou: https://github.com/cashtimachann/Nala_kredi_ti_machann/settings/secrets/actions
2. Asire w `SSH_PRIVATE_KEY` la egziste
3. Si li egziste, men workflow la pa mache, DELETE li epi rekree li

### Etap 6: Update Workflow (Deja Fait)

Workflow la nan `.github/workflows/deploy.yml` deja konfigire pou itilize `SSH_PRIVATE_KEY`:

```yaml
- name: 🔐 Setup SSH
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/deploy_key
    chmod 600 ~/.ssh/deploy_key
    ssh-keyscan -H ${{ env.SERVER_IP }} >> ~/.ssh/known_hosts
```

### Etap 7: Test Connection Lokalman

```bash
# Test avèk new key la
ssh -i ~/.ssh/github_actions_deploy root@142.93.78.111

# Si sa mache, alò GitHub Actions dwe mache tou
```

## 🔧 Pwoblèm Komen/Common Issues

### 1. "error in libcrypto"
- **Solisyon**: Asire w key la pa gen espas anplis oswa newlines ki pa bon
- Kopye key la SAN add okenn lòt bagay

### 2. "Permission denied (publickey)"
- **Solisyon**: Public key la pa sou servè a oswa pa nan `authorized_keys`
- Verifye avèk: `ssh root@142.93.78.111 "cat ~/.ssh/authorized_keys"`

### 3. Secret pa travay
- **Solisyon**: Delete secret la nan GitHub epi rekree li
- Asire w kopye TOUT private key la, enkli header ak footer

## 📝 Quick Checklist

- [ ] Private key la nan GitHub Secrets (`SSH_PRIVATE_KEY`)
- [ ] Public key la sou servè a nan `~/.ssh/authorized_keys`
- [ ] Permissions: `chmod 600 ~/.ssh/authorized_keys` sou servè a
- [ ] Test connection lokalman: `ssh -i [private_key] root@142.93.78.111`
- [ ] Workflow file la konfigire kòrèkteman

## 🎯 Validation

Apre w fè chanjman yo:

1. Push yon commit sou branch `main`
2. Ale sou GitHub Actions: https://github.com/cashtimachann/Nala_kredi_ti_machann/actions
3. Gade si deployment la pase

Si workflow la ekri "SSH connection successful!" ✅, tout bagay ap travay!

## 📞 Kòmandman pou Debug

```bash
# Verifye ki key ki sou servè a
ssh root@142.93.78.111 "cat ~/.ssh/authorized_keys"

# Test connection avèk specific key
ssh -i ~/.ssh/github_actions_deploy -v root@142.93.78.111

# Gade GitHub Actions logs
# https://github.com/cashtimachann/Nala_kredi_ti_machann/actions
```

---

**Note**: Asire w JAMEN pataje private key la publiquement oswa commit li nan Git! ⚠️
