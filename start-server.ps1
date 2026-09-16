Start-Process -FilePath "node" -ArgumentList "dist/server.js" -WorkingDirectory "C:\Users\Kal\Desktop\junkie\Vitalpayroll\backend" -WindowStyle Hidden
Start-Sleep -Seconds 6
$r = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/health" -UseBasicParsing -TimeoutSec 5
Write-Output "STATUS: $($r.StatusCode)"
