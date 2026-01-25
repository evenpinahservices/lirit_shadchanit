const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'clients', 'ClientForm.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add props to interface
content = content.replace(
    /(isRejecting\?: boolean; \/\/ Loading state for rejection)\s*\}/,
    `$1\n    initialAutoFillData?: any; // Data from AI extraction\n    initialGalleryUrls?: string[]; // Gallery images from AI\n    initialProfilePhotoUrl?: string; // Profile photo from AI\n}`
);

// 2. Add props to function signature
content = content.replace(
    /(isRejecting = false): ClientFormProps\)/,
    `$1, initialAutoFillData, initialGalleryUrls, initialProfilePhotoUrl}: ClientFormProps)`
);

// 3. Remove the buttons block
content = content.replace(
    /\{\!isEditing && !isExternalForm && \(\s*<>\s*<button[^>]*onClick=\{\(\) => setShowAutoFillModal\(true\)[^>]*>[\s\S]*?<\/button>\s*<button[^>]*onClick=\{\(\) => setShowJsonFillModal\(true\)[^>]*>[\s\S]*?<\/button>\s*<\/>\s*\)\}/g,
    ''
);

// 4. Add useEffect after showAutoFillModal useState
content = content.replace(
    /(const \[showAutoFillModal, setShowAutoFillModal\] = useState\(false\);\s*const \[showJsonFillModal, setShowJsonFillModal\] = useState\(false\);)/,
    `$1\n\n    // Handle initial auto-fill data from AI extraction\n    useEffect(() => {\n        if (initialAutoFillData) {\n            handleAutoFill(initialAutoFillData);\n        }\n        if (initialGalleryUrls && initialGalleryUrls.length > 0) {\n            handleAddToGallery(initialGalleryUrls);\n        }\n        if (initialProfilePhotoUrl) {\n            handleSetProfilePhoto(initialProfilePhotoUrl);\n        }\n    }, [initialAutoFillData, initialGalleryUrls, initialProfilePhotoUrl]);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('ClientForm.tsx updated successfully');
