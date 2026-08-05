const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "admin", "dist");
const destination = path.join(__dirname, "..", "pb_public", "admin");

console.log("🔨 Building Admin UI...");

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        console.error("❌ Source folder not found:", src);
        process.exit(1);
    }

    fs.mkdirSync(dest, { recursive: true });

    for (const item of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, item.name);
        const destPath = path.join(dest, item.name);

        if (item.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

try {
    console.log("🗑 Removing old Admin UI...");
    fs.rmSync(destination, {
        recursive: true,
        force: true,
    });

    console.log("📂 Copying new Admin UI...");
    copyRecursive(source, destination);

    console.log("✅ Admin UI copied successfully.");
} catch (err) {
    console.error("❌ Failed to copy Admin UI");
    console.error(err);
    process.exit(1);
}