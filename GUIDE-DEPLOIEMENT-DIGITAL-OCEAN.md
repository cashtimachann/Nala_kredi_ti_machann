# Guide de Déploiement - Nala Credit Ti Machann
## Digital Ocean (142.93.78.111)

### 🎯 Vue d'ensemble
Ce guide vous accompagne dans le déploiement complet de l'application Nala Credit Ti Machann sur votre serveur Digital Ocean.

**Architecture de l'application:**
- **Backend**: API .NET 8 avec Entity Framework Core
- **Frontend Web**: Application React TypeScript
- **Base de données**: PostgreSQL
- **Cache**: Redis
- **Message Queue**: RabbitMQ  
- **Serveur Web**: Nginx (proxy reverse)

---

## 📋 Prérequis

### Sur votre machine locale:
- Accès SSH au serveur Digital Ocean (142.93.78.111)
- Git configuré
- .NET 8 SDK installé
- Node.js 18+ installé

### Sur le serveur Digital Ocean:
- Ubuntu 22.04 LTS ou plus récent
- Accès root ou sudo
- Au moins 2GB de RAM
- 20GB d'espace disque disponible

---

## 🚀 Instructions de Déploiement

### Étape 1: Configuration initiale du serveur

**Sur le serveur Digital Ocean** (142.93.78.111), exécutez:

```bash
# Connectez-vous au serveur
ssh root@142.93.78.111

# Téléchargez et exécutez le script de configuration
curl -o server-setup.sh https://raw.githubusercontent.com/votre-repo/nala-credit/main/server-setup.sh
chmod +x server-setup.sh
./server-setup.sh
```

**OU** si vous avez le projet cloné sur le serveur:
```bash
cd /path/to/nala-project
./server-setup.sh
```

### Étape 2: Déploiement depuis votre machine locale

**Sur votre machine locale**, dans le répertoire du projet:

```bash
# Assurez-vous d'être dans le bon répertoire
cd /Users/herlytache/Nala_kredi_ti_machann

# Exécutez le script de déploiement
./deploy-to-digitalocean.sh
```

Le script va automatiquement:
1. ✅ Vérifier les prérequis sur le serveur
2. 🗄️ Configurer la base de données PostgreSQL
3. 🔨 Construire le backend .NET
4. 🌐 Construire le frontend React
5. 📁 Copier les fichiers vers le serveur
6. ⚙️ Configurer les services systemd
7. 🌍 Configurer Nginx
8. 🚀 Démarrer tous les services

---

## 🔧 Configuration Post-Déploiement

### Vérification des services

```bash
# Sur le serveur, vérifiez que tous les services fonctionnent
sudo systemctl status nala-credit-backend
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server
sudo systemctl status rabbitmq-server
```

### Test de l'application

1. **Interface Web**: Ouvrez http://142.93.78.111 dans votre navigateur
2. **API Health Check**: `curl http://142.93.78.111/api/health`
3. **Interface RabbitMQ**: http://142.93.78.111:15672 (guest/guest)

### Création du Super Administrateur

```bash
# Sur le serveur, exécutez
cd /var/www/nala-credit/backend
sudo -u www-data dotnet NalaCreditAPI.dll --create-superadmin
```

---

## 📊 Surveillance et Maintenance

### Logs de l'application
```bash
# Logs du backend
sudo journalctl -u nala-credit-backend -f

# Logs Nginx
sudo tail -f /var/log/nginx/nala-credit.error.log
sudo tail -f /var/log/nginx/nala-credit.access.log
```

### Redémarrage des services
```bash
# Backend seulement
sudo systemctl restart nala-credit-backend

# Nginx seulement  
sudo systemctl restart nginx

# Tous les services
sudo systemctl restart nala-credit-backend nginx postgresql redis-server rabbitmq-server
```

### Mise à jour de l'application
```bash
# Sur votre machine locale, re-exécutez le déploiement
./deploy-to-digitalocean.sh
```

---

## 🔒 Sécurité

### Configuration SSL (Optionnel mais Recommandé)

```bash
# Installation de Certbot pour SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

### Configuration du Firewall
```bash
# Vérifier les règles UFW
sudo ufw status

# Règles recommandées (déjà configurées par le script):
# 22/tcp (SSH), 80/tcp (HTTP), 443/tcp (HTTPS)
```

---

## 🛠️ Dépannage

### Problèmes Courants

**1. Le backend ne démarre pas**
```bash
sudo journalctl -u nala-credit-backend --no-pager
# Vérifiez la configuration de la base de données
```

**2. Erreur de connexion à la base de données**
```bash
# Testez la connexion PostgreSQL
sudo -u postgres psql -d nalakreditimachann_db -U nalauser
```

**3. Le frontend ne se charge pas**
```bash
# Vérifiez la configuration Nginx
sudo nginx -t
sudo systemctl reload nginx
```

**4. Problèmes de permissions**
```bash
sudo chown -R www-data:www-data /var/www/nala-credit
sudo chmod -R 755 /var/www/nala-credit
```

### Commandes de Diagnostic

```bash
# Vérification des ports ouverts
sudo netstat -tlnp | grep -E ':80|:5000|:5432|:6379'

# Test de connectivité des services
curl -I http://localhost:5000/api/health
redis-cli ping
sudo -u postgres psql -c "SELECT version();"
```

---

## 📁 Structure des Fichiers sur le Serveur

```
/var/www/nala-credit/
├── backend/                 # API .NET compilée
│   ├── NalaCreditAPI.dll
│   ├── appsettings.Production.json
│   └── ...
├── frontend-web/           # Application React buildée  
│   ├── index.html
│   ├── static/
│   └── ...
├── uploads/                # Fichiers téléchargés
└── logs/                   # Logs de l'application
```

---

## 🆘 Support

En cas de problème durant le déploiement:

1. **Vérifiez les logs** avec les commandes mentionnées ci-dessus
2. **Consultez la section dépannage** de ce guide
3. **Vérifiez la configuration** des services individuels

---

## ✅ Checklist de Déploiement

- [ ] Serveur Digital Ocean configuré et accessible
- [ ] Script `server-setup.sh` exécuté avec succès
- [ ] Script `deploy-to-digitalocean.sh` exécuté avec succès  
- [ ] Tous les services sont actifs (backend, nginx, postgresql, redis, rabbitmq)
- [ ] L'application est accessible via http://142.93.78.111
- [ ] API répond correctement à `/api/health`
- [ ] Super administrateur créé
- [ ] Tests fonctionnels effectués

**🎉 Félicitations! Votre application Nala Credit Ti Machann est maintenant déployée et opérationnelle sur Digital Ocean!**