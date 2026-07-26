$file = 'c:\Users\kumaw\Desktop\DailyNeeds\app\DriverProfile.tsx'
$content = Get-Content -Path $file -Raw
$content = $content -replace '#0c831f', '#0059ff'
$content = $content -replace '#ffb703', '#ffffff'
$content = $content -replace 'backgroundColor: ''#0059ff''', "backgroundColor: '#ff6600'" 
Set-Content -Path $file -Value $content -NoNewline
