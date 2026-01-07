# Script para sincronizar mudanças com Replit
# Uso: .\sync-replit.ps1 "descrição das mudanças"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

Write-Host "=== SINCRONIZANDO COM REPLIT ===" -ForegroundColor Cyan

# Verificar status
Write-Host "`n1. Verificando status..." -ForegroundColor Yellow
git status

# Adicionar todos os arquivos
Write-Host "`n2. Adicionando arquivos..." -ForegroundColor Yellow
git add .

# Fazer commit
Write-Host "`n3. Fazendo commit..." -ForegroundColor Yellow
git commit -m $Message

# Fazer push
Write-Host "`n4. Fazendo push para GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "`n✅ Sincronização concluída!" -ForegroundColor Green
Write-Host "`n📋 Próximos passos no Replit:" -ForegroundColor Cyan
Write-Host "   1. Abra o terminal do Replit" -ForegroundColor White
Write-Host "   2. Execute: git pull origin main" -ForegroundColor White
Write-Host "   3. Ou configure pull automático no Replit" -ForegroundColor White
