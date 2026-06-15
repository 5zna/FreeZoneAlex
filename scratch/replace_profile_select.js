import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, '..', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

const target = `<div class="profile-org-member-add">
              <select id="profile-org-member-select" multiple size="5">
                <option value="">Select a user...</option>
              </select>
              <button class="profile-org-member-add-btn" id="profile-org-member-add-btn">Add Selected</button>
            </div>`;

const replacement = `<div class="profile-org-member-add">
              <select id="profile-org-member-select">
                <option value="">Select a user...</option>
              </select>
              <button class="profile-org-member-add-btn" id="profile-org-member-add-btn">Add Member</button>
            </div>`;

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Normalize whitespace to make matching robust
  const normalizedContent = content.replace(/\\r\\n/g, '\\n');
  const normalizedTarget = target.replace(/\\r\\n/g, '\\n');
  const normalizedReplacement = replacement.replace(/\\r\\n/g, '\\n');
  
  if (normalizedContent.includes(normalizedTarget)) {
    const newContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Successfully replaced in: ${file}`);
  } else {
    // Try simple regex replacement if formatting differs slightly
    const regex = /<select\\s+id="profile-org-member-select"\\s+multiple\\s+size="5">\\s*<option\\s+value="">Select\\s+a\\s+user\.\.\.<\/option>\\s*<\/select>\\s*<button\\s+class="profile-org-member-add-btn"\\s+id="profile-org-member-add-btn">Add\\s+Selected<\/button>/i;
    if (regex.test(normalizedContent)) {
      const newContent = normalizedContent.replace(regex, `<select id="profile-org-member-select">
                <option value="">Select a user...</option>
              </select>
              <button class="profile-org-member-add-btn" id="profile-org-member-add-btn">Add Member</button>`);
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Regex replaced in: ${file}`);
    } else {
      console.log(`Pattern not found in: ${file}`);
    }
  }
}
