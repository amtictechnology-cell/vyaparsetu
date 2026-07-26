const fs = require('fs');
const path = require('path');

function updateFile(filename, headerTitleText) {
    const filePath = path.join(__dirname, '../app', filename);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Replace #0c831f (old green) with #ff6600 (new orange)
    content = content.replace(/#0c831f/g, '#ff6600');
    // Also replace #0059ff (blue) with #ff6600 in case it was used
    content = content.replace(/#0059ff/g, '#ff6600');
    
    // 2. Replace yellow #ffb703 with white #ffffff
    content = content.replace(/#ffb703/g, '#ffffff');

    // 3. Add LinearGradient import if missing
    if (!content.includes('LinearGradient')) {
        content = content.replace(
            "import {",
            "import { LinearGradient } from 'expo-linear-gradient';\nimport {"
        );
    }

    // 4. Update Header JSX
    // For staffmanagment.tsx it's roughly:
    // <View style={styles.header}> ... <Text style={styles.headerTitle}>Staff Managment</Text> ... </View>
    // Then searchContainer.
    
    // Instead of complex regex, let's just do targeted string replacements
    if (filename === 'staffmanagment.tsx') {
        const oldHeaderSection = `<View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Staff Managment</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        placeholder="Search staff name or role..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>`;
        
        const newHeaderSection = `<LinearGradient colors={['#ff6600', '#ffb380']} style={styles.gradientHeader}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Staff Managment</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#999" />
                        <TextInput
                            placeholder="Search staff name or role..."
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>
            </LinearGradient>`;
        content = content.replace(oldHeaderSection, newHeaderSection);

        // Add gradientHeader style and update header and searchContainer styles
        content = content.replace(
            /header: \{\s*flexDirection: "row",\s*alignItems: "center",\s*justifyContent: "space-between",\s*paddingHorizontal: 16,\s*paddingTop: 60,\s*paddingBottom: 20,\s*backgroundColor: "#ffffff",\s*\}/,
            `gradientHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },\n    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20, backgroundColor: "transparent" }`
        );
        content = content.replace(
            /searchContainer: \{\s*padding: 16,\s*backgroundColor: "#ffffff",\s*borderBottomLeftRadius: 24,\s*borderBottomRightRadius: 24,\s*\}/,
            `searchContainer: { padding: 16, paddingTop: 0, backgroundColor: "transparent", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }`
        );
    } else if (filename === 'staffprofile.tsx') {
        const oldHeaderSection = `<View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Staff Profile</Text>
                <View style={{ width: 40 }} />
            </View>`;
        
        const newHeaderSection = `<LinearGradient colors={['#ff6600', '#ffb380']} style={styles.gradientHeader}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Staff Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>`;
        content = content.replace(oldHeaderSection, newHeaderSection);

        content = content.replace(
            /header: \{\s*flexDirection: "row",\s*alignItems: "center",\s*justifyContent: "space-between",\s*paddingHorizontal: 16,\s*paddingTop: 60,\s*paddingBottom: 20,\s*backgroundColor: "#ffffff",\s*\}/,
            `gradientHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },\n    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20, backgroundColor: "transparent" }`
        );
    }

    // Common style updates for headerTitle
    content = content.replace(
        /headerTitle: \{\s*fontSize: 20,\s*fontWeight: "900",\s*color: "#000",\s*\}/,
        `headerTitle: { fontSize: 20, fontWeight: "900", color: "#ffffff" }`
    );

    // Save
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated ' + filename);
}

try {
    updateFile('staffmanagment.tsx', 'Staff Managment');
} catch(e) {
    console.error(e);
}
try {
    updateFile('staffprofile.tsx', 'Staff Profile');
} catch(e) {
    console.error(e);
}
