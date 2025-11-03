#!/bin/bash
# Script to add GitHub Actions SSH key to server

echo "📝 Copying this command to add the key:"
echo ""
echo 'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPj1PgcZA4PMLyfxTbzFg9UhSEjCf6QTBqH5HG6EyNAo github-actions@nalakreditimachann.com" >> ~/.ssh/authorized_keys'
echo ""
echo "✅ Then verify it was added:"
echo "tail -1 ~/.ssh/authorized_keys"
