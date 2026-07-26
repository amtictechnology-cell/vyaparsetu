import sys

file_path = r"c:\Users\kumaw\Desktop\DailyNeeds\app\DriverProfile.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace green with blue
content = content.replace("#0c831f", "#0059ff")

# Replace yellow with white
content = content.replace("#ffb703", "#ffffff")

# Make FAB orange
content = content.replace("backgroundColor: '#0059ff', // for FAB", "backgroundColor: '#ff6600',")
# Actually, the FAB might just be:
content = content.replace('''    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0059ff',''', '''    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ff6600',''')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done replacing colors in DriverProfile.tsx")
