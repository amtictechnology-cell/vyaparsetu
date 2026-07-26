const fs = require('fs');
const path = require('path');

// 1. Update staffmanagment.tsx
const smPath = path.join(__dirname, '../app/staffmanagment.tsx');
let smContent = fs.readFileSync(smPath, 'utf8');

// Colors
smContent = smContent.replace(/#0c831f/g, '#ff6600');
smContent = smContent.replace(/#0059ff/g, '#ff6600');

// Inject LinearGradient
if (!smContent.includes('LinearGradient')) {
    smContent = smContent.replace(
        "import StaffLoader from '../components/StaffLoader';",
        "import StaffLoader from '../components/StaffLoader';\nimport { LinearGradient } from 'expo-linear-gradient';"
    );
}

// Replace header block
const smOldHeader = `            <View style={styles.header}>
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

const smNewHeader = `            <LinearGradient colors={['#ff6600', '#ffb380']} style={styles.gradientHeader}>
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
smContent = smContent.replace(smOldHeader, smNewHeader);

// Replace styles
const smOldStyles = `    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: "#ffb703",
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: "900", color: "#000" },
    searchContainer: { padding: 16, backgroundColor: "#ffb703", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },`;

const smNewStyles = `    gradientHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: "transparent",
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: "900", color: "#ffffff" },
    searchContainer: { padding: 16, paddingTop: 0, backgroundColor: "transparent", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },`;
smContent = smContent.replace(smOldStyles, smNewStyles);

fs.writeFileSync(smPath, smContent, 'utf8');
console.log('Updated staffmanagment.tsx');


// 2. Update staffprofile.tsx
const spPath = path.join(__dirname, '../app/staffprofile.tsx');
let spContent = fs.readFileSync(spPath, 'utf8');

spContent = spContent.replace(/#0c831f/g, '#ff6600');
spContent = spContent.replace(/#0059ff/g, '#ff6600');

if (!spContent.includes('LinearGradient')) {
    spContent = spContent.replace(
        "import StaffLoader from '../components/StaffLoader';",
        "import StaffLoader from '../components/StaffLoader';\nimport { LinearGradient } from 'expo-linear-gradient';"
    );
}

const spOldHeader = `            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Staff Profile</Text>
                <View style={{ width: 40 }} />
            </View>`;

const spNewHeader = `            <LinearGradient colors={['#ff6600', '#ffb380']} style={styles.gradientHeader}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Staff Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>`;
spContent = spContent.replace(spOldHeader, spNewHeader);

const spOldStyles = `    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: "#ffb703",
    },
    headerBackButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#000",
    },`;

const spNewStyles = `    gradientHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: "transparent",
    },
    headerBackButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#ffffff",
    },`;
spContent = spContent.replace(spOldStyles, spNewStyles);

fs.writeFileSync(spPath, spContent, 'utf8');
console.log('Updated staffprofile.tsx');
