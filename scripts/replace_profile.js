const fs = require('fs');
const path = require('path');

// 1. Update Driver Profile
const profilePath = path.join(__dirname, '../app/DriverProfile.tsx');
let profileContent = fs.readFileSync(profilePath, 'utf8');

// Replace all blue with orange
profileContent = profileContent.replace(/#0059ff/g, '#ff6600');

// Add import if not present
if (!profileContent.includes('LinearGradient')) {
    profileContent = profileContent.replace(
        "import DriverLoader from '../components/DriverLoader';",
        "import DriverLoader from '../components/DriverLoader';\nimport { LinearGradient } from 'expo-linear-gradient';"
    );
}

// Replace header with gradient
const oldHeaderRegex = /\{\/\* Header \*\/\}\s*<View style=\{styles\.header\}>\s*<TouchableOpacity onPress=\{.*?\} style=\{styles\.headerBackButton\}>\s*<Ionicons name="arrow-back" size=\{24\} color=".*?" \/>\s*<\/TouchableOpacity>\s*<Text style=\{styles\.headerTitle\}>Driver Profile<\/Text>\s*<View style=\{\{ width: 40 \}\} \/>\s*<\/View>/;

const newHeader = `{/* Header */}
            <LinearGradient
                colors={['#ff6600', '#ffb380']}
                style={styles.gradientHeader}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Driver Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>`;

profileContent = profileContent.replace(oldHeaderRegex, newHeader);

// Update styles for header
profileContent = profileContent.replace(
    /backgroundColor: "#ffffff",\s*\},/g,
    (match, offset, string) => {
        // Only replace the one that follows header: {
        return match;
    }
);

// We need to inject gradientHeader in styles and modify header background
const stylesRegex = /header: \{\s*flexDirection: "row",\s*alignItems: "center",\s*justifyContent: "space-between",\s*paddingHorizontal: 16,\s*paddingTop: 60,\s*paddingBottom: 20,\s*backgroundColor: "#ffffff",\s*\}/;
const newStyles = `gradientHeader: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: "transparent",
    }`;
profileContent = profileContent.replace(stylesRegex, newStyles);

// Make headerTitle white
const headerTitleRegex = /headerTitle: \{\s*fontSize: 20,\s*fontWeight: "900",\s*color: "#000",\s*\}/;
profileContent = profileContent.replace(headerTitleRegex, `headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#ffffff",
    }`);
// If color is already something else like #ff6600, let's catch it:
const headerTitleRegex2 = /headerTitle: \{\s*fontSize: 20,\s*fontWeight: "900",\s*color: ".*?",\s*\}/;
profileContent = profileContent.replace(headerTitleRegex2, `headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#ffffff",
    }`);

fs.writeFileSync(profilePath, profileContent, 'utf8');
console.log('Successfully updated DriverProfile.tsx');

// 2. Update Driver Management to replace any remaining blue (#0059ff) with orange (#ff6600)
const mgtPath = path.join(__dirname, '../app/Drivermanagment.tsx');
let mgtContent = fs.readFileSync(mgtPath, 'utf8');
mgtContent = mgtContent.replace(/#0059ff/g, '#ff6600');
fs.writeFileSync(mgtPath, mgtContent, 'utf8');
console.log('Successfully updated Drivermanagment.tsx');
