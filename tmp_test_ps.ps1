$body = @{ language='python'; code='print(input())'; input='test input' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:5000/run -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json
