const fs = require('fs');
const path = 'c:/Users/Darshan/C-LAB V2/client/src/pages/ExperimentLab.jsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);
let index = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '>') {
        if (lines[i-1] && lines[i-1].includes('</nav>')) {
            index = i;
            break;
        }
    }
}

if (index !== -1) {
    const before = lines.slice(0, index);
    const middle = [
        "      {activeTab !== 'virtual' && (",
        "        <div className=\"lab-overview-layout\">",
        "          <aside className=\"lab-overview-sidebar\">",
        "            <section className=\"lab-panel-card\">",
        "              <div className=\"lab-card-title\">",
        "                <Sparkles className=\"w-4 h-4\" />",
        "                <strong>Experiment Catalog</strong>",
        "              </div>"
    ];
    const after = lines.slice(index + 1);
    const newContent = [...before, ...middle, ...after].join('\n');
    fs.writeFileSync(path, newContent);
    console.log('SUCCESS: ExperimentLab.jsx repaired at index ' + index);
} else {
    console.log('FAILURE: Target > pattern not found.');
    // Check line 1790
    console.log('Line 1790: [' + lines[1789] + ']');
}
